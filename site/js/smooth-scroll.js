/* Smooth wheel scrolling (desktop), with a speed limit.
 *
 * The mouse wheel / trackpad no longer jumps the page: each wheel event moves a
 * target, and every frame the page travels EASE (10 %) of the way still left,
 * so scrolling glides and settles without sudden speed-ups or stops.
 *
 * Speed limit: the target may run at most MAX_LEAD of a screen ahead of the
 * page. However hard the wheel is spun, the page then moves at most about
 * EASE * MAX_LEAD screens per frame (≈1.8 screens a second), so the reveal
 * animations always have time to play.
 *
 * Left alone: phones and tablets (touch scrolling stays native), the keyboard,
 * the scrollbar, pinch-zoom (Ctrl + wheel), sideways wheel, anything inside an
 * open dialog (application form, policy, lightbox, mobile menu), and visitors
 * who asked their system for reduced motion.
 */
(function () {
  'use strict';
  var EASE = 0.1;       // share of the remaining distance covered per frame
  var MAX_LEAD = 0.3;   // how far (in screens) the target may run ahead of the page
  var STOP_AT = 1;      // px: close enough, snap and stop

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  var desktop = window.matchMedia ? matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)') : null;

  var target = 0, raf = 0;

  function maxScroll() { return document.documentElement.scrollHeight - window.innerHeight; }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function frame() {
    var cur = window.scrollY, d = target - cur;
    if (Math.abs(d) <= STOP_AT) { window.scrollTo({ top: target, behavior: 'instant' }); raf = 0; return; }
    // browsers keep whole pixels: never step less than 1px, or the last pixels never arrive
    var step = d * EASE;
    if (Math.abs(step) < 1) step = d > 0 ? Math.min(1, d) : Math.max(-1, d);
    window.scrollTo({ top: cur + step, behavior: 'instant' });
    raf = requestAnimationFrame(frame);
  }

  function inDialog(el) {
    return el && el.closest && el.closest('[role="dialog"], [role="alertdialog"], .oc-modal, .pp-modal, .mobile-menu, .lightbox, .hp-gallery-3d__lightbox, [data-native-scroll]');
  }

  window.addEventListener('wheel', function (e) {
    if (e.defaultPrevented || e.ctrlKey) return;
    if (desktop && !desktop.matches) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (inDialog(e.target)) return;
    // a dialog is open (the page behind it is locked)
    if (document.body.style.overflow === 'hidden' || document.documentElement.style.overflow === 'hidden') return;

    e.preventDefault();
    var cur = window.scrollY;
    if (!raf) target = cur;
    var dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
    var lead = MAX_LEAD * window.innerHeight;
    target = Math.max(0, Math.min(maxScroll(), target + dy));
    target = Math.max(cur - lead, Math.min(cur + lead, target));   // the speed limit
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });

  // Anything else that moves the page takes over at once.
  ['keydown', 'mousedown', 'touchstart'].forEach(function (t) {
    window.addEventListener(t, stop, { passive: true });
  });
  window.addEventListener('resize', function () { if (raf) target = Math.min(target, maxScroll()); });
})();
