// Browser test of the newsletter form against a local stand-in for the Apps
// Script web app. The stand-in runs the real Code.gs (via gas-sandbox) and
// mimics Google's transport: POST /exec → 302 to a different origin → JSON
// with Access-Control-Allow-Origin: *. It does NOT prove Google's servers
// behave this way; that is checked once after deployment (see README).
//
// Run: NODE_PATH=$(npm root -g) node --test apps-script/tests/e2e.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createSandbox } = require('./gas-sandbox');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function listen(handler) {
  return new Promise(resolve => {
    const srv = http.createServer(handler);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const portOf = srv => srv.address().port;

let site, script, echo, browser;
const echoStore = new Map();
const hits = {};
let sandbox, badHeaders;

test.before(async () => {
  sandbox = createSandbox();
  badHeaders = createSandbox({ headers: ['Дата подписки', 'RU', 'EN', 'Язык'] });

  site = await listen((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  echo = await listen((req, res) => {
    const key = new URL(req.url, 'http://x').searchParams.get('user_content_key');
    const entry = echoStore.get(key);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (!entry || !entry.noCors) headers['Access-Control-Allow-Origin'] = '*';
    res.writeHead(entry ? 200 : 404, headers);
    res.end(entry ? JSON.stringify(entry.body) : '');
  });

  script = await listen((req, res) => {
    const mode = req.url.split('?')[0].replace('/macros/s/TEST/', '');
    hits[mode] = (hits[mode] || 0) + 1;
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      const params = Object.fromEntries(new URLSearchParams(raw));
      const reply = () => {
        if (mode === 'exec-500') { res.writeHead(500, { 'Access-Control-Allow-Origin': '*' }); res.end('<html>Error</html>'); return; }
        const box = mode === 'exec-badheaders' ? badHeaders : sandbox;
        const body = box.post(params).body;
        if (mode === 'exec-badid') body.requestId = 'someone-elses-id';
        const key = Math.random().toString(36).slice(2);
        echoStore.set(key, { body, noCors: mode === 'exec-nocors' });
        res.writeHead(302, { Location: `http://127.0.0.1:${portOf(echo)}/macros/echo?user_content_key=${key}`, 'Access-Control-Allow-Origin': '*' });
        res.end();
      };
      if (mode === 'exec-slow') setTimeout(reply, 1500); else reply();
    });
  });

  browser = await chromium.launch();
});

test.after(async () => {
  if (browser) await browser.close();
  [site, script, echo].forEach(s => s && s.close());
});

async function openPage(config) {
  const page = await browser.newPage();
  const requests = [];
  page.on('request', r => { if (r.url().includes('/macros/')) requests.push(r.method() + ' ' + r.url()); });
  await page.route('**/js/newsletter-config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.SARLE_NEWSLETTER = ' + JSON.stringify(config) + ';',
  }));
  await page.goto(`http://127.0.0.1:${portOf(site)}/index.html`);
  await page.locator('#newsletter').scrollIntoViewIfNeeded();
  page.requests = requests;
  return page;
}
const url = mode => `http://127.0.0.1:${portOf(script)}/macros/s/TEST/${mode || 'exec'}`;
const setLang = (page, code) => page.evaluate(c => document.querySelector(`[data-lang-btn="${c}"]`).click(), code);
async function fill(page, email, consent) {
  await page.fill('#nl-email', email);
  if (consent !== false) await page.check('#nl-consent');
}
const visibleText = (page, id) => page.evaluate(i => {
  const el = document.getElementById(i);
  return el.hidden ? null : el.textContent.trim();
}, id);
const rowsFor = email => sandbox.state.rows.filter(r => r.slice(1).includes(email)).map(r => r.slice(1));

test('EN success writes only column C and clears the form', async () => {
  const page = await openPage({ endpoint: url() });
  await fill(page, 'en-user@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-success:not([hidden])');
  assert.match(await visibleText(page, 'nl-success'), /Thank you/);
  assert.deepEqual(rowsFor('en-user@example.com'), [['', 'en-user@example.com', '']]);
  assert.equal(await page.inputValue('#nl-email'), '');
  assert.equal(await page.isChecked('#nl-consent'), false);
  await page.close();
});

test('switching language without reload routes to RU (B) and ET (D)', async () => {
  const page = await openPage({ endpoint: url() });
  await setLang(page, 'RUS');
  await fill(page, 'ru-user@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-success:not([hidden])');
  assert.match(await visibleText(page, 'nl-success'), /Спасибо/);
  // The message follows the language switch.
  await setLang(page, 'EST');
  assert.match(await visibleText(page, 'nl-success'), /Aitäh/);
  await page.waitForTimeout(4100); // client-side minimum interval between sends
  await fill(page, 'et-user@example.com');
  await page.click('.newsletter-submit');
  // Wait for the form's own success state (the email is cleared only on ok).
  // Chromium does not always report the redirected echo fetch as a network
  // event, so waiting for that response made this test flaky.
  await page.waitForFunction(() => document.getElementById('nl-email').value === '');
  await page.waitForSelector('#nl-success:not([hidden])');
  assert.deepEqual(rowsFor('ru-user@example.com'), [['ru-user@example.com', '', '']]);
  assert.deepEqual(rowsFor('et-user@example.com'), [['', '', 'et-user@example.com']]);
  // Static labels were translated by the site's own i18n.
  assert.match(await page.textContent('label[for="nl-consent"]'), /uudiskirja/);
  await page.close();
});

test('invalid email and missing consent: no request sent', async () => {
  const page = await openPage({ endpoint: url() });
  await fill(page, 'not-an-email', true);
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /does not look complete/);
  await fill(page, '=cmd@example.com', true);
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /does not look complete/);
  await page.fill('#nl-email', 'ok@example.com');
  await page.uncheck('#nl-consent');
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /agree to receive/);
  await page.fill('#nl-email', '');
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /enter your email/);
  assert.deepEqual(page.requests, []);
  await page.close();
});

test('duplicate in same language: neutral success, still one row', async () => {
  const page = await openPage({ endpoint: url() });
  await fill(page, 'dup@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-success:not([hidden])');
  await page.waitForTimeout(4100); // client-side minimum interval
  await fill(page, ' DUP@example.com ');
  await page.click('.newsletter-submit');
  await page.waitForFunction(() => document.getElementById('nl-pending').hidden && !document.getElementById('nl-success').hidden);
  assert.equal(rowsFor('dup@example.com').length, 1);
  await page.close();
});

test('double click while sending sends one request; button disabled meanwhile', async () => {
  const page = await openPage({ endpoint: url('exec-slow') });
  await fill(page, 'slow@example.com');
  await page.click('.newsletter-submit');
  assert.equal(await page.isDisabled('.newsletter-submit'), true);
  assert.match(await visibleText(page, 'nl-pending'), /Sending/);
  await page.evaluate(() => document.getElementById('newsletter-form').requestSubmit());
  await page.waitForSelector('#nl-success:not([hidden])');
  assert.equal(await page.isDisabled('.newsletter-submit'), false);
  assert.equal(hits['exec-slow'], 1);
  await page.close();
});

test('server error (header mismatch): error shown, email kept, nothing written', async () => {
  const page = await openPage({ endpoint: url('exec-badheaders') });
  await fill(page, 'hdr@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-error:not([hidden])');
  assert.match(await visibleText(page, 'nl-error'), /was not saved/);
  assert.equal(await page.inputValue('#nl-email'), 'hdr@example.com');
  assert.equal(badHeaders.state.rows.length, 0);
  await page.close();
});

for (const [mode, expected] of [['exec-500', /was not saved/], ['exec-nocors', /Could not reach/], ['exec-badid', /was not saved/]]) {
  test(`${mode}: never shows success`, async () => {
    const page = await openPage({ endpoint: url(mode) });
    await fill(page, `${mode}@example.com`);
    await page.click('.newsletter-submit');
    await page.waitForSelector('#nl-error:not([hidden])');
    assert.match(await visibleText(page, 'nl-error'), expected);
    assert.equal(await visibleText(page, 'nl-success'), null);
    assert.equal(await page.inputValue('#nl-email'), `${mode}@example.com`);
    await page.close();
  });
}

test('network error, then retry succeeds with the kept email', async () => {
  const page = await openPage({ endpoint: 'http://127.0.0.1:9/macros/s/TEST/exec' });
  await fill(page, 'retry@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-error:not([hidden])');
  assert.match(await visibleText(page, 'nl-error'), /Could not reach/);
  assert.equal(await page.inputValue('#nl-email'), 'retry@example.com');
  assert.equal(await page.isDisabled('.newsletter-submit'), false);
  await page.close();
});

test('timeout shows a timeout error and re-enables the button', async () => {
  const page = await openPage({ endpoint: url('exec-slow'), timeoutMs: 300 });
  await fill(page, 'timeout@example.com');
  await page.click('.newsletter-submit');
  await page.waitForSelector('#nl-error:not([hidden])');
  assert.match(await visibleText(page, 'nl-error'), /too long/);
  assert.equal(await page.isDisabled('.newsletter-submit'), false);
  assert.equal(await page.inputValue('#nl-email'), 'timeout@example.com');
  await page.close();
});

test('no endpoint configured: no fake success', async () => {
  const page = await openPage({ endpoint: '' });
  await fill(page, 'none@example.com');
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /temporarily unavailable/);
  assert.deepEqual(page.requests, []);
  await page.close();
});

test('unknown page language: clear error, nothing sent', async () => {
  const page = await openPage({ endpoint: url() });
  await page.evaluate(() => { window.sarleGetLang = () => 'DE'; });
  await fill(page, 'de@example.com');
  await page.click('.newsletter-submit');
  assert.match(await visibleText(page, 'nl-error'), /page language/);
  assert.deepEqual(page.requests, []);
  await page.close();
});

test('honeypot filled by a bot: nothing written', async () => {
  const page = await openPage({ endpoint: url() });
  await fill(page, 'bot@example.com');
  await page.evaluate(() => { document.getElementById('nl-website').value = 'spam'; });
  await page.click('.newsletter-submit');
  await page.waitForFunction(() => document.getElementById('nl-pending').hidden);
  assert.deepEqual(rowsFor('bot@example.com'), []);
  await page.close();
});

test('privacy link opens the existing policy modal', async () => {
  const page = await openPage({ endpoint: url() });
  await page.click('.newsletter-privacy');
  await page.waitForFunction(() => !!document.querySelector('.is-open'));
  await page.close();
});

test('mobile layout: no horizontal scroll, consent visible', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await page.goto(`http://127.0.0.1:${portOf(site)}/index.html`);
  await page.locator('#newsletter').scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
  const box = await page.locator('.newsletter-consent').boundingBox();
  assert.ok(box && box.width <= 375 && box.x >= 0);
  await page.screenshot({ path: process.env.SHOT_DIR ? path.join(process.env.SHOT_DIR, 'newsletter-mobile.png') : '/dev/null', clip: { x: 0, y: Math.max(0, box.y - 260), width: 375, height: 420 } }).catch(() => {});
  await page.close();
});
