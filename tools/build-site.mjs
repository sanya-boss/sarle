// Builds the published site into _site/.
//
// 1. Copies only the files visitors need (no README, docs, Apps Script or
//    tests), so the repository's internals are not served on sarle.ee.
// 2. Pre-renders the Estonian and Russian versions of every page at /et/
//    and /ru/, using the same dictionaries js/main.js uses in the browser,
//    so search engines can index each language at its own URL.
//
// The English pages in the repo root stay the only source to edit.
// Run: npm run build (in tools/). Output: ../_site

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const SITE = 'https://sarle.ee';

// Everything else in the repo stays private to GitHub.
const COPY = ['css', 'js', 'assets', '404.html', 'favicon.ico', 'site.webmanifest',
  'browserconfig.xml', 'robots.txt', 'sitemap.xml', 'CNAME'];
const PAGES = [
  { file: 'index.html', slug: '' },
  { file: 'gallery.html', slug: 'gallery' },
  { file: 'shop.html', slug: 'shop' },
];
const LANGS = [
  { code: 'EN', iso: 'en', prefix: '', locale: 'en_US' },
  { code: 'EST', iso: 'et', prefix: '/et', locale: 'et_EE' },
  { code: 'RUS', iso: 'ru', prefix: '/ru', locale: 'ru_RU' },
];

// <title> and meta descriptions live in <head>, which the in-page
// translator does not touch. Keyed by the English text: if an English
// title or description changes, the build warns until this is updated.
const HEAD = {
  'Sarle | Art Gallery & Studio': {
    EST: 'Sarle | Kunstigalerii ja stuudio',
    RUS: 'Sarle | Художественная галерея и студия',
  },
  'Sarle Art Gallery & Studio — a contemporary art and cultural space in the heart of Old Tallinn.': {
    EST: 'Sarle Art Gallery & Studio — kaasaegse kunsti ja kultuuri ruum Tallinna vanalinna südames.',
    RUS: 'Sarle Art Gallery & Studio — пространство современного искусства и культуры в самом сердце Старого Таллинна.',
  },
  'Sarle | Gallery': { EST: 'Sarle | Galerii', RUS: 'Sarle | Галерея' },
  'The story of Sarle Art Gallery & Studio in Tallinn — founded by Svetlana Sarle in memory of Vilnis Strazdinš.': {
    EST: 'Sarle Art Gallery & Studio lugu Tallinnas — galerii asutas Svetlana Sarle Vilnis Strazdinši mälestuseks.',
    RUS: 'История Sarle Art Gallery & Studio в Таллинне — галерею основала Светлана Шарле в память о Вилнисе Страздиньше.',
  },
  'Sarle | Shop': { EST: 'Sarle | Pood', RUS: 'Sarle | Магазин' },
  'Artworks by Juris Jurjāns from the private collection of Sarle Art Gallery & Studio, available for acquisition.': {
    EST: 'Juris Jurjānsi teosed Sarle Art Gallery & Studio erakogust, mida on võimalik omandada.',
    RUS: 'Работы Юриса Юрьянса из частной коллекции Sarle Art Gallery & Studio, доступные для приобретения.',
  },
};

const warnings = [];

// The translator block of js/main.js, run as-is against each page.
function i18nSource() {
  const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
  const start = src.indexOf('(function setupI18n() {');
  const endMarker = "if (lang !== 'EN') applyLang();\n  })();";
  const end = src.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('setupI18n block not found in js/main.js');
  return src.slice(start, end + endMarker.length);
}

const pageUrl = (lang, slug) => `${SITE}${lang.prefix}/${slug}`;

function headText(en, lang, where) {
  if (lang.code === 'EN') return en;
  const t = HEAD[en] && HEAD[en][lang.code];
  if (!t) warnings.push(`no ${lang.code} translation for ${where}: "${en}"`);
  return t || en;
}

function setMeta(doc, selector, value) {
  const el = doc.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

function isLocal(url) {
  // Relative paths only: not /root, //host, scheme: or #anchor.
  return url && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url);
}

function renderPage(page, lang, i18n) {
  const html = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
  const dom = new JSDOM(html, { url: pageUrl(lang, page.slug), runScripts: 'outside-only' });
  const { window } = dom;
  const doc = window.document;
  const root = doc.documentElement;

  root.setAttribute('lang', lang.iso);
  root.setAttribute('data-lang', lang.code);

  if (lang.code !== 'EN') {
    // Same code the browser runs; it reads <html data-lang>.
    window.eval(i18n);
    if (root.getAttribute('lang') !== lang.iso) throw new Error(`${page.file} ${lang.code}: translator did not run`);
  }

  // Head: title, descriptions, canonical, social tags, language alternates.
  const enTitle = doc.title;
  const descEl = doc.querySelector('meta[name="description"]');
  const enDesc = descEl ? descEl.getAttribute('content') : '';
  const title = headText(enTitle, lang, `${page.file} <title>`);
  const desc = headText(enDesc, lang, `${page.file} description`);
  doc.title = title;
  if (descEl) descEl.setAttribute('content', desc);
  setMeta(doc, 'meta[property="og:title"]', title);
  setMeta(doc, 'meta[name="twitter:title"]', title);
  setMeta(doc, 'meta[property="og:description"]', desc);
  setMeta(doc, 'meta[name="twitter:description"]', desc);
  setMeta(doc, 'meta[property="og:url"]', pageUrl(lang, page.slug));
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', pageUrl(lang, page.slug));

  const anchor = canonical || doc.querySelector('meta[name="description"]');
  const add = (tag, attrs) => {
    const el = doc.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    anchor.after(el);
    anchor.after(doc.createTextNode('\n'));
    return el;
  };
  // Inserted after the anchor in reverse, so they read in order.
  add('link', { rel: 'alternate', hreflang: 'x-default', href: pageUrl(LANGS[0], page.slug) });
  for (const l of [...LANGS].reverse()) add('link', { rel: 'alternate', hreflang: l.iso, href: pageUrl(l, page.slug) });
  const ogUrl = doc.querySelector('meta[property="og:url"]');
  if (ogUrl) {
    for (const l of [...LANGS].reverse()) {
      if (l === lang) continue;
      const m = doc.createElement('meta');
      m.setAttribute('property', 'og:locale:alternate');
      m.setAttribute('content', l.locale);
      ogUrl.after(m); ogUrl.after(doc.createTextNode('\n'));
    }
    const m = doc.createElement('meta');
    m.setAttribute('property', 'og:locale');
    m.setAttribute('content', lang.locale);
    ogUrl.after(m); ogUrl.after(doc.createTextNode('\n'));
  }

  // Links: pages in a language folder need root-absolute asset paths and
  // internal links that stay inside the same language.
  if (lang.prefix) {
    for (const el of doc.querySelectorAll('[src], [href]')) {
      for (const attr of ['src', 'href']) {
        const v = el.getAttribute(attr);
        if (v == null) continue;
        if (el.tagName === 'LINK' && el.getAttribute('rel') === 'alternate') continue;
        if (isLocal(v)) {
          el.setAttribute(attr, '/' + v.replace(/^\.\//, ''));
        } else if (el.tagName === 'A' && /^\/(?:$|#|gallery\b|shop\b)/.test(v)) {
          el.setAttribute(attr, lang.prefix + v);
        }
      }
    }
    const tileConfig = doc.querySelector('meta[name="msapplication-config"]');
    if (tileConfig && isLocal(tileConfig.getAttribute('content'))) {
      tileConfig.setAttribute('content', '/' + tileConfig.getAttribute('content'));
    }
  }

  const out = path.join(OUT, lang.prefix, page.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, dom.serialize());
  window.close();
  return path.relative(OUT, out);
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const item of COPY) {
    fs.cpSync(path.join(ROOT, item), path.join(OUT, item), { recursive: true });
  }
  const i18n = i18nSource();
  const written = [];
  for (const page of PAGES) for (const lang of LANGS) written.push(renderPage(page, lang, i18n));
  console.log('Built ' + written.length + ' pages: ' + written.join(', '));
  if (warnings.length) {
    console.warn('Warnings:\n  ' + warnings.join('\n  '));
    if (process.env.STRICT) process.exit(1);
  }
}

main();
