"""Build the hosted release for https://benamuwo.me/microcosmos/.

    npm run release            # builds both pages, then runs this script

Assembles dist-release/microcosmos/ from the two builds:
    /microcosmos/        the 3D world (dist3d/, built by Vite)
    /microcosmos/play/   the playable game (web/dist-release/play/, built by scripts/build-web.ts)
and writes RELEASE.json beside them: every file's SHA-256 and size, the pages' Content-Security-
Policy, and the source-tree identity it was built from. The zip is deterministic (fixed timestamps,
sorted entries, stored rather than deflated), so the same tree gives the same SHA-256 on any
machine. Refuses to build if a file type is outside the blog blueprint's allowlist, a local
reference does not resolve, a page carries inline script or style, a page loads a third-party
script or stylesheet, or the release exceeds its size cap.

Adapted from The Quiet Signal's scripts/build_release.py; same rules, same receipt format.
"""
import hashlib
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [ROOT / "dist3d", ROOT / "web/dist-release"]
DIST = ROOT / "dist-release"
OUT = DIST / "microcosmos"
TAG = "site-2026-11-16-orbit"
ZIP = DIST / f"microcosmos-{TAG}.zip"

ALLOWED = {".html", ".css", ".js", ".json", ".svg", ".woff2", ".txt"}
MAX_RELEASE = 5 * 1024 * 1024

# Only this site's own files. The 2D game positions its district markers with an inline style
# attribute, hence style-src-attr; no inline <style> element or script is permitted. WebGL needs no
# extra permission; the cosmogram texture is an ordinary same-origin image.
CSP = "; ".join([
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
])


def sha(data):
    return hashlib.sha256(data).hexdigest()


def source_identity():
    """Hash of every input that shapes the release, so RELEASE.json names its source."""
    parts = []
    for base in ("src", "web/view.ts", "web/app.ts", "web/page.html", "web/scene.ts", "web3d", "package-lock.json", "vite.config.ts"):
        p = ROOT / base
        files = [p] if p.is_file() else sorted(x for x in p.rglob("*") if x.is_file() and x.name != ".DS_Store")
        parts += [f"{f.relative_to(ROOT)}:{sha(f.read_bytes())}" for f in files]
    return sha("\n".join(parts).encode())


def collect():
    """Map release-relative name -> source file. The two builds must not overlap."""
    ship = {}
    for src in SOURCES:
        if not src.is_dir():
            sys.exit(f"missing build output {src.relative_to(ROOT)}; run: npm run release")
        for p in sorted(x for x in src.rglob("*") if x.is_file() and x.name != ".DS_Store"):
            rel = str(p.relative_to(src))
            if rel in ship:
                sys.exit(f"two builds both produce {rel}")
            ship[rel] = p
    return ship


def main():
    ship = collect()
    problems = []
    for rel, p in ship.items():
        if p.suffix.lower() not in ALLOWED:
            problems.append(f"type not allowed: {rel}")
        if p.suffix.lower() in (".html", ".css"):
            text = p.read_text(encoding="utf-8")
            if re.search(r"<script(?![^>]*\bsrc=)[^>]*>", text) or re.search(r"<style[\s>]", text):
                problems.append(f"inline script or style element: {rel}")
            refs = re.findall(r'(?:src|href)="([^"#?]+)"', text) + re.findall(r"url\('([^']+)'\)", text)
            for ref in refs:
                if re.match(r"^(https?:|mailto:|data:)", ref):
                    loads = (rf'<script[^>]*\bsrc="{re.escape(ref)}"',
                             rf'<link[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)"[^>]*\bhref="{re.escape(ref)}"')
                    if p.suffix == ".html" and any(re.search(x, text) for x in loads):
                        problems.append(f"third-party script or stylesheet in {rel}: {ref}")
                    continue
                base = Path(rel).parent
                target = (base / ref).as_posix()
                parts = []
                for seg in target.split("/"):
                    if seg in ("", "."):
                        continue
                    if seg == "..":
                        if not parts:
                            problems.append(f"{rel} reaches outside the release: {ref}")
                            break
                        parts.pop()
                    else:
                        parts.append(seg)
                name = "/".join(parts)
                if ref.endswith("/") or name == "":
                    name = (name + "/index.html").lstrip("/")
                if name not in ship:
                    problems.append(f"{rel} references a file not in the release: {ref}")
    total = sum(p.stat().st_size for p in ship.values())
    if total > MAX_RELEASE:
        problems.append(f"release is {total:,} bytes, over {MAX_RELEASE:,}")
    if problems:
        sys.exit("refusing to build:\n  " + "\n  ".join(problems))

    if OUT.exists():
        shutil.rmtree(OUT)
    entries = {}
    for rel, p in sorted(ship.items()):
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        data = p.read_bytes()
        dest.write_bytes(data)
        entries[rel] = {"sha256": sha(data), "bytes": len(data)}
    release = {
        "project": "Dark Microcosmos · Living Currents",
        "release": TAG,
        "pages": {"/microcosmos/": "The First Orbit: six individual worlds and a circular economy", "/microcosmos/challenge.html": "Original Dark Forest 3D experiment", "/microcosmos/play/": "Original 2D experiment, G1d rules"},
        "route": "/microcosmos/",
        "source_identity": source_identity(),
        "content_security_policy": CSP,
        "total_bytes": total,
        "files": entries,
    }
    (OUT / "RELEASE.json").write_text(json.dumps(release, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    with zipfile.ZipFile(ZIP, "w", compression=zipfile.ZIP_STORED) as z:
        for p in sorted(x for x in OUT.rglob("*") if x.is_file()):
            info = zipfile.ZipInfo("microcosmos/" + p.relative_to(OUT).as_posix(), date_time=(2026, 11, 15, 0, 0, 0))
            info.external_attr = 0o644 << 16
            info.compress_type = zipfile.ZIP_STORED
            z.writestr(info, p.read_bytes())
    with zipfile.ZipFile(ZIP) as z:
        assert z.testzip() is None
        for rel, meta in entries.items():
            assert sha(z.read("microcosmos/" + rel)) == meta["sha256"], rel
    print(f"{OUT.relative_to(ROOT)}: {len(entries)} files + RELEASE.json, {total:,} bytes")
    print(f"{ZIP.relative_to(ROOT)}: {ZIP.stat().st_size:,} bytes")
    print(f"zip sha256: {sha(ZIP.read_bytes())}")
    print(f"RELEASE.json sha256: {sha((OUT / 'RELEASE.json').read_bytes())}")


if __name__ == "__main__":
    main()
