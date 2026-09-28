// Checks the output of build-site.mjs. Run after `npm run build`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const read = f => fs.readFileSync(path.join(OUT, f), 'utf8');
const exists = f => fs.existsSync(path.join(OUT, f));

const PAGES = [['index.html', ''], ['gallery.html', 'gallery'], ['shop.html', 'shop']];
const LANGS = [['', 'en', 'EN'], ['et/', 'et', 'EST'], ['ru/', 'ru', 'RUS']];

test('publishes only public files', () => {
  for (const f of ['index.html', '404.html', 'css/style.css', 'js/main.js', 'assets/og-image.jpg',
    'favicon.ico', 'robots.txt', 'sitemap.xml', 'CNAME']) assert.ok(exists(f), f + ' missing');
  for (const f of ['README.md', 'github.md', 'apps-script', 'tools', '.github', '.gitignore', '.thumbnail'])
    assert.ok(!exists(f), f + ' must not be published');
});

for (const [file, slug] of PAGES) {
  for (const [dir, iso, code] of LANGS) {
    test(`${dir}${file}: language, canonical and alternates`, () => {
      const html = read(dir + file);
      assert.match(html, new RegExp(`<html lang="${iso}" data-lang="${code}"`));
      assert.ok(html.includes(`<link rel="canonical" href="https://sarle.ee/${dir}${slug}">`));
      for (const [d, i] of LANGS) {
        assert.ok(html.includes(`<link rel="alternate" hreflang="${i}" href="https://sarle.ee/${d}${slug}">`), 'hreflang ' + i);
      }
      assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="https://sarle.ee/${slug}">`));
      assert.ok(html.includes(`<meta property="og:url" content="https://sarle.ee/${dir}${slug}">`));
    });
  }
}

test('translated pages carry translated text in the HTML itself', () => {
  assert.match(read('ru/index.html'), /<title>Sarle \| Художественная галерея и студия<\/title>/);
  assert.match(read('ru/index.html'), />Галерея</);
  assert.match(read('et/index.html'), /<title>Sarle \| Kunstigalerii ja stuudio<\/title>/);
  assert.match(read('et/index.html'), />Galerii</);
  assert.match(read('ru/gallery.html'), /Светлана Шарле/);
  assert.doesNotMatch(read('index.html'), />Галерея</);
});

test('language pages use root paths and keep links in their language', () => {
  for (const [dir] of LANGS.slice(1)) {
    for (const [file] of PAGES) {
      const html = read(dir + file);
      const refs = [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map(m => m[1]);
      const relative = refs.filter(u => u && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(u));
      assert.deepEqual(relative, [], `${dir}${file} has relative URLs`);
      assert.ok(!/href="\/(?:gallery|shop)"/.test(html), `${dir}${file} links to English pages`);
      assert.ok(!refs.includes('//gallery') && !refs.includes('//shop'));
    }
  }
});

test('sitemap lists every page in every language', () => {
  const xml = read('sitemap.xml');
  for (const [, slug] of PAGES) for (const [dir] of LANGS) {
    assert.ok(xml.includes(`<loc>https://sarle.ee/${dir}${slug}</loc>`), dir + slug);
  }
});
