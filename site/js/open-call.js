/* Open Call 2027 — application pop-up.
 * Opens from any [data-open-call] link (and from a #apply link in the URL).
 * Sending: to the Apps Script web app from js/newsletter-config.js (see
 * apps-script/README.md); every application becomes a column on the "Заявки" sheet.
 * Field names (name="…") are what apps-script/OpenCall.gs reads — keep them identical.
 * With no endpoint at all, the visitor's email app opens with the application
 * addressed to data-mailto instead. */
(function () {
  var modal = document.getElementById('open-call');
  var form = document.getElementById('oc-form');
  if (!modal || !form) return;
  var confirmModal = document.getElementById('oc-confirm');
  var failModal = document.getElementById('oc-fail');
  var thanksMail = document.getElementById('oc-thanks-mail');
  var errBox = document.getElementById('oc-error');
  var errText = document.getElementById('oc-error-text');
  var submitBtn = form.querySelector('.oc-submit');
  var lastFocus = null;
  function tr(s) { return window.sarleT ? window.sarleT(s) : s; } // EST / RUS via the site's translator

  /* Generic show / hide with the open and close animations (.is-open / .is-closing). */
  function current() {
    if (failModal && failModal.classList.contains('is-open')) return failModal;
    if (confirmModal && confirmModal.classList.contains('is-open')) return confirmModal;
    return modal.classList.contains('is-open') ? modal : null;
  }
  function show(m, focusEl) {
    clearTimeout(m._t); m.classList.remove('is-closing');
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    m.querySelector('.oc-panel').scrollTop = 0;
    setTimeout(function () { (focusEl || m.querySelector('.oc-panel')).focus(); }, 30);
  }
  function hide(m, done) {
    if (!m.classList.contains('is-open') || m.classList.contains('is-closing')) return;
    m.classList.remove('is-swapped-in');
    m.classList.add('is-closing');
    m._t = setTimeout(function () {
      m.classList.remove('is-closing', 'is-open');
      m.setAttribute('aria-hidden', 'true');
      if (!current()) document.body.style.overflow = '';
      if (done) done();
    }, 260);
  }

  function focusables(m) {
    return Array.prototype.filter.call(
      m.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
  }

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    show(modal, document.getElementById('oc-name'));
  }
  function clearHash() {
    if (location.hash === '#apply' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }
  function close() {
    hide(modal, function () { clearHash(); if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  }

  /* The form window turns into the confirmation window: the dark backdrop stays,
     the form panel fades up and out, the confirmation panel rises in its place. */
  function showConfirm(viaMail) {
    if (thanksMail) thanksMail.hidden = !viaMail;
    if (!confirmModal) return;
    if (!modal.classList.contains('is-open')) { show(confirmModal, confirmModal.querySelector('.oc-confirm-ok')); return; }
    modal.classList.add('is-swapping');
    setTimeout(function () {
      modal.classList.remove('is-open', 'is-swapping');
      modal.setAttribute('aria-hidden', 'true');
      clearHash();
      form.reset();
      confirmModal.classList.add('is-swapped-in');
      show(confirmModal, confirmModal.querySelector('.oc-confirm-ok'));
    }, 300);
  }
  function closeConfirm() {
    hide(confirmModal, function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  }

  /* One window turns into another over the same dark backdrop. */
  function swap(from, to, focusEl, between) {
    from.classList.add('is-swapping');
    setTimeout(function () {
      from.classList.remove('is-open', 'is-swapping', 'is-swapped-in');
      from.setAttribute('aria-hidden', 'true');
      if (between) between();
      to.classList.add('is-swapped-in');
      show(to, focusEl);
    }, 300);
  }

  /* Sending failed: the form turns into the error window. The answers stay in the
     form, so "Try again" brings the same filled-in form back. */
  function showFail() {
    if (!failModal) {
      errText.textContent = tr('Sorry, the application could not be sent. Please try again, or email gallery@sarle.ee.');
      errBox.hidden = false;
      return;
    }
    swap(modal, failModal, failModal.querySelector('.oc-fail-retry'));
  }
  function retryFromFail() {
    swap(failModal, modal, submitBtn);
  }
  function closeFail() {
    hide(failModal, function () { clearHash(); if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  }
  function mailtoHref() {
    var to = form.getAttribute('data-mailto') || 'gallery@sarle.ee';
    var name = document.getElementById('oc-name').value.trim();
    var text = 'OPEN CALL 2027 — APPLICATION\n\n' + collect().map(function (r) { return r[0] + ':\n' + r[1]; }).join('\n\n');
    return 'mailto:' + to + '?subject=' + encodeURIComponent('Open Call 2027 — ' + name) + '&body=' + encodeURIComponent(text);
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    if (e.target.closest('[data-open-call]')) { open(e); return; }
    if (e.target.closest('[data-oc-close]')) { close(); return; }
    if (e.target.closest('[data-oc-confirm-close]')) { closeConfirm(); return; }
    if (e.target.closest('[data-oc-fail-close]')) { closeFail(); return; }
    if (e.target.closest('[data-oc-fail-retry]')) { retryFromFail(); return; }
    if (e.target.closest('[data-oc-fail-mail]')) { window.location.href = mailtoHref(); return; }
  });
  modal.addEventListener('mousedown', function (e) { if (e.target === modal) close(); });
  if (confirmModal) confirmModal.addEventListener('mousedown', function (e) { if (e.target === confirmModal) closeConfirm(); });
  if (failModal) failModal.addEventListener('mousedown', function (e) { if (e.target === failModal) closeFail(); });
  document.addEventListener('keydown', function (e) {
    var m = current();
    if (!m || document.querySelector('.pp-modal.is-open')) return;
    if (e.key === 'Escape') { m === modal ? close() : (m === failModal ? closeFail() : closeConfirm()); return; }
    if (e.key === 'Tab') {
      var f = focusables(m); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  if (location.hash === '#apply') open();
  // preview the error window: open the page with #apply-fail
  if (location.hash === '#apply-fail' && failModal) { lastFocus = document.activeElement; show(modal); setTimeout(showFail, 700); }

  /* "All of the above" ticks every interest; unticking one clears it. */
  var allBox = form.querySelector('[data-oc-all]');
  var interestBoxes = form.querySelectorAll('input[name="Interests"]:not([data-oc-all])');
  if (allBox) {
    allBox.addEventListener('change', function () {
      interestBoxes.forEach(function (b) { b.checked = allBox.checked; });
    });
    interestBoxes.forEach(function (b) {
      b.addEventListener('change', function () {
        allBox.checked = Array.prototype.every.call(interestBoxes, function (x) { return x.checked; });
      });
    });
  }

  /* Validation ------------------------------------------------------------ */
  function clearMarks() {
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    errBox.hidden = true;
  }
  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
    var g = e.target.closest('[data-oc-required]');
    if (g) g.removeAttribute('aria-invalid');
  });
  form.addEventListener('change', function (e) {
    var g = e.target.closest('[data-oc-required]');
    if (g) g.removeAttribute('aria-invalid');
    if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });

  function validate() {
    clearMarks();
    var bad = [];
    form.querySelectorAll('input[required], textarea[required]').forEach(function (el) {
      var ok = el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
      if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      if (ok && el.type === 'url') ok = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}/i.test(el.value.trim());
      if (!ok) { el.setAttribute('aria-invalid', 'true'); bad.push(el); }
    });
    form.querySelectorAll('[data-oc-required]').forEach(function (g) {
      if (!g.querySelector('input:checked')) { g.setAttribute('aria-invalid', 'true'); bad.push(g.querySelector('input')); }
    });
    if (bad.length) {
      errText.textContent = tr('Please complete the required fields marked * and confirm all four statements.');
      errBox.hidden = false;
      bad.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      bad[0].focus();
      bad[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return false;
    }
    return true;
  }

  /* Collect answers as label → value lines (used for email + service). */
  function collect() {
    var data = new FormData(form);
    var map = {}, order = [];
    data.forEach(function (v, k) {
      if (k === '_hp') return;
      if (!(k in map)) { map[k] = []; order.push(k); }
      if (String(v).trim()) map[k].push(String(v).trim());
    });
    return order.map(function (k) { return [k, map[k].join(', ')]; }).filter(function (r) { return r[1]; });
  }


  /* Sending ---------------------------------------------------------------
   * Goes to the same Apps Script web app as the newsletter (one /exec URL in
   * js/newsletter-config.js); form=open-call routes it to OpenCall.gs, which adds
   * one column to the "Заявки" sheet. The script answers with JSON, so a failure
   * (or a server that refused the application) really shows the error window. */
  var config = window.SARLE_NEWSLETTER || {};
  var TIMEOUT_MS = 25000;
  var sending = false;
  function endpointUrl() {
    return (form.getAttribute('data-endpoint') || config.endpoint || '').trim();
  }
  function newRequestId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending || !validate()) return;
    var endpoint = endpointUrl();

    if (!endpoint) {
      window.location.href = mailtoHref();
      showConfirm(true);
      return;
    }
    if (navigator.onLine === false) { showFail(); return; }

    var requestId = newRequestId();
    var body = new URLSearchParams();
    new FormData(form).forEach(function (v, k) { body.append(k, String(v)); });
    body.set('form', 'open-call');
    body.set('Language', document.documentElement.lang || 'en');
    body.set('Source page', location.href.split('#')[0]);
    body.set('requestId', requestId);

    sending = true;
    submitBtn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    fetch(endpoint, { method: 'POST', body: body, redirect: 'follow', cache: 'no-store', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        if (data && data.ok === true && data.requestId === requestId) showConfirm(false);
        else showFail();
      })
      .catch(function () { showFail(); })
      .then(function () {
        clearTimeout(timer);
        sending = false;
        submitBtn.disabled = false;
        form.setAttribute('aria-busy', 'false');
      });
  });
})();


/* Phone layout of slide 02: keep the planet at an equal distance from the title
   above and the text below (layout offsets, so slide animations don't skew it). */
(function () {
  var slide = document.querySelector('.iv-slide--light');
  if (!slide) return;
  var frame = slide.querySelector('.iv-frame');
  var side = slide.querySelector('.iv-side');
  var title = slide.querySelector('.iv-title');
  var body = slide.querySelector('.iv-body');
  if (!frame || !side || !title || !body) return;
  var mq = window.matchMedia('(max-width: 899px)');

  function place() {
    if (!mq.matches) {
      frame.style.removeProperty('--oc-planet-top');
      frame.style.removeProperty('--oc-planet-size');
      return;
    }
    var base = side.offsetTop - frame.offsetTop;
    var titleBottom = base + title.offsetTop + title.offsetHeight;
    var textTop = base + body.offsetTop;
    var gap = textTop - titleBottom;
    if (gap <= 0 || !frame.offsetWidth) return;
    // as big as the free space allows (the canvas includes a thin glow margin), up to 58% of the slide width
    var size = Math.max(40, Math.min(frame.offsetWidth * 0.5, gap - 26));
    frame.style.setProperty('--oc-planet-top', (titleBottom + gap / 2) + 'px');
    frame.style.setProperty('--oc-planet-size', size + 'px');
  }

  place();
  window.addEventListener('resize', place);
  window.addEventListener('load', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  if (mq.addEventListener) mq.addEventListener('change', place);
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(side);
})();
