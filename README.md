# Sarle Art Gallery &amp; Studio

Marketing site for Sarle Art Gallery & Studio, a contemporary art and cultural space in the heart of Old Tallinn, Estonia.

A static site: plain HTML, CSS and vanilla JS, no framework. A small build step (`tools/`) adds the Estonian and Russian pages when the site is published.

## Run locally

```
python3 -m http.server --directory site
```

Then open `http://localhost:8000` in a browser.

## Structure

- `site/` — the website itself (everything here is what gets published)
  - `index.html`, `gallery.html`, `shop.html`, `404.html` — pages (English)
  - `css/` — styles (colors, type scale, layout, responsive rules)
  - `js/main.js` — header, mobile menu, hero/artist 3D ring carousels, intro slider, lightbox, parallax, newsletter form, translations
  - `assets/` — images, logos, icons, social preview
  - `robots.txt`, `sitemap.xml`, `CNAME`, favicon and manifest files
- `apps-script/` — Google Apps Script for newsletter sign-ups, with its tests
- `tools/build-site.mjs` — builds the published site into `_site/` (see below)
- `.github/workflows/deploy.yml` — publishes `_site/` to GitHub Pages on every push to `main`

## Languages and publishing

Edit only the English pages in `site/`; translations live in the dictionaries in `site/js/main.js`.

On every push to `main`, GitHub Actions runs `tools/build-site.mjs`, which:

- copies only the public files from `site/`, so `README.md`, `apps-script/`, `tools/` and tests are not served;
- pre-renders Estonian and Russian pages at `/et/…` and `/ru/…` with the same dictionaries, plus `hreflang` links, so search engines index every language.

GitHub Pages must be set to **Settings → Pages → Source: GitHub Actions**.

Build and check locally:

```
cd tools && npm ci && npm run build && npm test
python3 -m http.server --directory ../_site
```

If an English `<title>` or meta description changes, add its translations to `HEAD` in `tools/build-site.mjs` (the build prints a warning until you do).
