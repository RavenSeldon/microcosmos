# Deploying The Dark Microcosmos to https://benamuwo.me/microcosmos/

**Status, 16 November 2026:** ready. Release `site-2026-11-16-clear` (version 0.7.3) is built,
its fingerprints are pinned in the installer, and the blog change is sitting uncommitted in
`~/Root/beamu-blog`. Nothing has been committed, pushed or deployed. Four steps, about ten minutes.

It works the same way as The Quiet Signal: the game is a folder of static files; the blog serves
that folder at `/microcosmos/`; one command on the droplet downloads the files, checks every one
against a pinned fingerprint, and switches to them.

## Before You Start

You do **not** need to rebuild anything. The release zip is already at
`dist-release/microcosmos-site-2026-11-16-clear.zip` and matches the installer.

Optional, to look first:

```sh
cd ~/Root/Microcosmos
npm install          # only if you have not since the last change
npm run play         # open the address it prints; Ctrl-C to stop
```

## Step 1. Blog: commit and push (2 minutes)

This adds the `/microcosmos/` page to the blog. Two edited files and one new folder.

```sh
cd ~/Root/beamu-blog
git status           # expect: 2 modified files, 1 new folder (app/routes/microcosmos/)
git add WebDev/Blog/app/routes/microcosmos WebDev/Blog/app/routes/__init__.py WebDev/Blog/app/routes/main.py
git commit -m "Serve The Dark Microcosmos at /microcosmos/"
git push
```

**Expect:** nothing visible yet. The droplet picks this up in step 3.

## Step 2. Microcosmos: publish the repository and the release (5 minutes)

The droplet downloads the release from GitHub without a password, so the repository has to be
**public**. Before you make it public, know what goes up (180 files): the game, its tests, the
deploy scripts, `docs/` including the design history, and `archive/` with the earlier versions
and research results. The reference images in `docs/references/` are ignored by git and stay on
your Mac. If you would rather keep it private, use "Private Repository Instead" below.

```sh
cd ~/Root/Microcosmos
git branch -m main
git add -A
git commit -m "The Dark Microcosmos 0.7.3: one game, release site-2026-11-16-clear"
gh repo create RavenSeldon/microcosmos --public --source=. --remote=origin --push
```

(No `gh`? Create an empty public repository `RavenSeldon/microcosmos` on github.com, then
`git remote add origin git@github.com:RavenSeldon/microcosmos.git && git push -u origin main`.)

Check the zip, then publish it as a release:

```sh
shasum -a 256 dist-release/microcosmos-site-2026-11-16-clear.zip
```

**Must print** `8a63b670cd65cda6285109ad4e11f6bf84b5e33f3b6fd94339964c1ff7fb3a74`. If it does
not, stop: the zip has changed since it was pinned.

```sh
gh release create site-2026-11-16-clear dist-release/microcosmos-site-2026-11-16-clear.zip \
  --title "The Dark Microcosmos 0.7.3" \
  --notes "Static release for https://benamuwo.me/microcosmos/"
```

(No `gh`? On github.com: Releases → Draft a new release → tag `site-2026-11-16-clear` → attach
the zip → Publish.)

## Step 3. Droplet: one command (2 minutes)

Open the DigitalOcean web console as root and paste:

```sh
curl -fsSL https://raw.githubusercontent.com/RavenSeldon/microcosmos/main/deploy/droplet_install.sh | bash
```

**Expect** three stages and then `DONE: https://benamuwo.me/microcosmos/`:

1. `1/3 Updating the blog`: pulls step 1 and restarts the blog.
2. `2/3 Installing the verified release`: prints `verified and installed 14 files + RELEASE.json`.
3. `3/3 Checking the live site`: a `200` beside each page, including your other pages.

If any check fails it switches back to what was live before and prints `STOPPED:` with the reason.

## Step 4. Look

Open https://benamuwo.me/microcosmos/ on a laptop and on your phone. The first screen should be
the basin speaking, with two buttons.

## If Something Stops

| The installer says | What it means | What to do |
|---|---|---|
| `the blog on GitHub does not have the microcosmos page yet` | Step 1 was not pushed | Do step 1, run step 3 again |
| `could not download … (is the GitHub release published…)` | No release, wrong tag, or the repository is private | Finish step 2; check the repository is public |
| `downloaded release does not match its pinned SHA-256` | The uploaded zip is not the pinned one | Upload the zip from `dist-release/` unchanged |
| `could not find the blog checkout` / `the blog's service` | The droplet is laid out differently than expected | Copy the output to Claude |
| `a check failed; switched back` | A live page did not answer 200 | Nothing is broken; copy the output to Claude |
| The page shows "Release files are not installed." (503) | Step 1 is live, step 3 has not run | Run step 3 |

## Private Repository Instead

Skip the public repository. Copy two files to the droplet and run the installer from them:

```sh
cd ~/Root/Microcosmos
scp deploy/droplet_install.sh dist-release/microcosmos-site-2026-11-16-clear.zip root@<droplet>:/root/
```

Then on the droplet:

```sh
MICROCOSMOS_ZIP_FILE=/root/microcosmos-site-2026-11-16-clear.zip bash /root/droplet_install.sh
```

Every check still runs. Step 1 (the blog) is still needed.

## Putting Up a Newer Version Later

1. In `scripts/build_release.py`, change `TAG` (for example `site-2026-11-20`).
2. `npm test && npm run release`. It prints two SHA-256 values.
3. In `deploy/droplet_install.sh`, set `TAG`, `ZIP_SHA` and `RELEASE_SHA` to match.
4. Commit and push; `gh release create <tag> dist-release/microcosmos-<tag>.zip`.
5. On the droplet (the blog is already done, so skip it):

```sh
curl -fsSL https://raw.githubusercontent.com/RavenSeldon/microcosmos/main/deploy/droplet_install.sh | SKIP_BLOG=1 bash
```

Players' saved journeys live in their own browsers and survive a new version unless the arena's
`version` in `src/arenas.ts` changes.

## Going Back

The droplet keeps the newest three releases.

```sh
cd /srv/microcosmos && ls releases
ln -sfn releases/<stamp> current.new && mv -T current.new current
```

To take the page down entirely, revert the blog commit from step 1, push, and pull on the droplet.

## What Is Pinned

| | |
|---|---|
| Tag | `site-2026-11-16-clear` |
| Zip | `dist-release/microcosmos-site-2026-11-16-clear.zip`, 1,058,208 bytes, 14 files + `RELEASE.json` |
| Zip SHA-256 | `8a63b670cd65cda6285109ad4e11f6bf84b5e33f3b6fd94339964c1ff7fb3a74` |
| `RELEASE.json` SHA-256 | `f022194eef7b204cf9cf7ce676d6b4e973a3ddbb2bbca2fba7c1e791a6c87989` |
| Installed to | `/srv/microcosmos/releases/<stamp>/`, with `current` pointing at the live one |

## How It Is Served

- **File types:** `.html`, `.css`, `.js`, `.json`, `.svg`, `.woff2`, `.txt`. Anything else is a 404.
- **Caching:** fonts for a day; everything else revalidates, so a new release shows at once.
- **Security policy** (read from the release itself): `default-src 'none'; script-src 'self';
  style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self';
  base-uri 'none'; form-action 'none'; frame-ancestors 'self'`. Fonts are served from the
  release, so the page makes no third-party requests.
- `/microcosmos` redirects to `/microcosmos/`. Path traversal returns 404.
- The blog's own `app/__init__.py` needs no change.

## What Was Checked, and What Was Not

Checked on 16 November 2026 with this exact zip:

- The installer, run against a stand-in for `/srv`: installed and verified 14 files; refused a
  zip with one byte added.
- The blog blueprint, mounted alone in Flask: the page, cosmogram, fonts and receipt returned
  200 with the security policy and `nosniff`; the redirect, traversal refusal and type allowlist
  behaved as listed; the live receipt matched the pinned SHA-256.
- The game, loaded through that blueprint in headless Chrome: intro, a selection and a moment
  played with no refused requests and no errors.
- The blueprint files in `~/Root/beamu-blog` are byte-identical to `deploy/blog/microcosmos/`.

Not checked, because they only exist on your side: the blueprint inside the real blog, nginx and
gunicorn on the droplet, the GitHub download, and `gh` on your Mac. The same steps worked for
The Quiet Signal.
