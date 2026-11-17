// Builds the single-file playable: web/dist/index.html (engine + page, no external scripts).
//   node scripts/build-web.ts            the page
//   node scripts/build-web.ts --shots    also writes test variants that open mid-game and at an ending
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const res = await build({ entryPoints: [new URL('web/app.ts', root).pathname], bundle: true, format: 'iife', minify: true, target: 'es2020', write: false, legalComments: 'none' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const page = readFileSync(new URL('web/page.html', root), 'utf8');
if (!page.includes('/*BUNDLE*/')) throw new Error('page.html has no bundle marker');
mkdirSync(new URL('web/dist/', root), { recursive: true });
const html = page.replace('/*BUNDLE*/', () => js);
writeFileSync(new URL('web/dist/index.html', root), html);
console.log(`web/dist/index.html ${(html.length / 1024).toFixed(0)} KB (script ${(js.length / 1024).toFixed(0)} KB)`);

// Release mode: the same page split into index.html + app.js + style.css, so it runs under a
// Content-Security-Policy with no inline script or style. Fonts come from the site (../fonts/).
if (process.argv.includes('--release')) {
  const m = /<style>\n([\s\S]*?)<\/style>\n/.exec(page);
  if (!m) throw new Error('page.html has no style block');
  const out = new URL('web/dist-release/play/', root);
  mkdirSync(out, { recursive: true });
  let rel = page.replace(m[0], '<link rel="stylesheet" href="style.css">\n').replace('<script>/*BUNDLE*/</script>', '<script src="app.js"></script>');
  rel = rel.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, '<link rel="stylesheet" href="../fonts/fonts.css">\n');
  if (/googleapis|<style|<script>/.test(rel)) throw new Error('release page still has inline or third-party code');
  writeFileSync(new URL('index.html', out), rel);
  writeFileSync(new URL('style.css', out), m[1]);
  writeFileSync(new URL('app.js', out), res.outputFiles[0].text);
  console.log('web/dist-release/play/: index.html, style.css, app.js');
}

if (process.argv.includes('--shots')) {
  const variants = JSON.parse(readFileSync(new URL('web/shots.json', root), 'utf8')) as Record<string, unknown>;
  for (const [name, auto] of Object.entries(variants)) {
    writeFileSync(new URL(`web/dist/shot-${name}.html`, root), page.replace('<script>/*BUNDLE*/</script>', () => `<script>window.__DM_AUTOPLAY=${JSON.stringify(auto)};</script><script>${js}</script>`));
  }
  console.log(`wrote ${Object.keys(variants).length} test variants`);
}
