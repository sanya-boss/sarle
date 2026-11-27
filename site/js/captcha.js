/* Captcha (Cloudflare Turnstile) for the newsletter and Open Call forms.
 *
 * Switched on by putting the Turnstile *site key* into js/newsletter-config.js
 * (turnstileSiteKey). The matching *secret key* goes into the Apps Script
 * project's Script Properties as TURNSTILE_SECRET, where the server checks
 * every token (apps-script/README.md). With no site key the forms work as
 * before, without a captcha.
 *
 * The widget is not loaded with the page: Cloudflare's script is fetched only
 * when a visitor has typed a valid email into one of the forms, and the
 * widget then appears under the field.
 *
 *   SarleCaptcha.enabled()            → is a site key configured?
 *   SarleCaptcha.show(box, onChange)  → load + render into box (once)
 *   SarleCaptcha.token(box)           → current token or ''
 *   SarleCaptcha.reset(box)           → new challenge (tokens are single-use)
 */
(function () {
  'use strict';
  var SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var config = window.SARLE_NEWSLETTER || {};
  var siteKey = String(config.turnstileSiteKey || '').trim();
  var loading = null;

  function load() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = function () { window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')); };
      s.onerror = function () { loading = null; reject(new Error('turnstile did not load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function lang() {
    var l = (document.documentElement.lang || 'en').slice(0, 2);
    return { en: 'en', et: 'et', ru: 'ru' }[l] || 'auto';
  }

  window.SarleCaptcha = {
    enabled: function () { return !!siteKey; },
    show: function (box, onChange) {
      if (!siteKey || !box) return;
      box.hidden = false;
      if (box.__captcha) return;          // rendered (or rendering) already
      box.__captcha = { id: null, token: '' };
      var state = box.__captcha;
      function set(t) { state.token = t || ''; if (onChange) onChange(state.token); }
      load().then(function (ts) {
        state.id = ts.render(box, {
          sitekey: siteKey,
          theme: 'dark',
          language: lang(),
          action: box.getAttribute('data-captcha-action') || 'form',
          callback: set,
          'expired-callback': function () { set(''); },
          'error-callback': function () { set(''); }
        });
      }).catch(function () {
        box.__captcha = null;               // try again on the next show()
        box.setAttribute('data-captcha-failed', '');
      });
    },
    token: function (box) { return box && box.__captcha ? box.__captcha.token : ''; },
    reset: function (box) {
      var state = box && box.__captcha;
      if (!state) return;
      state.token = '';
      if (state.id != null && window.turnstile) window.turnstile.reset(state.id);
    }
  };
})();
