/*
 * Sarle Art Gallery & Studio — front-end behavior.
 * Vanilla JS, no dependencies. Ported 1:1 from the original design's
 * DCLogic component (header blur, hero + artist 3D ring carousels,
 * intro slider, lightbox, philosophy parallax, newsletter validation).
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
   * Header: solid background once the page is scrolled
   * ------------------------------------------------------------------- */
  (function headerScroll() {
    var header = document.getElementById('site-header');
    if (!header) return;
    var solid = null;
    var onScroll = function () {
      var isSolid = window.scrollY > 80;
      if (isSolid === solid) return;
      solid = isSolid;
      header.classList.toggle('is-solid', isSolid);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------------------------------------------------------------------
   * Mobile menu
   * ------------------------------------------------------------------- */
  var menu = document.getElementById('mobile-menu');
  var burger = document.getElementById('burger-btn');
  var menuOpen = false;

  function openMenu() {
    menuOpen = true;
    if (menu) menu.classList.add('is-open');
    if (burger) {
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
    }
    document.body.style.overflow = 'hidden';
    var first = menu ? menu.querySelector('a') : null;
    if (first) first.focus();
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    if (menu) menu.classList.remove('is-open');
    if (burger) {
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
    }
    document.body.style.overflow = '';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      menuOpen ? closeMenu() : openMenu();
    });
  }
  document.querySelectorAll('[data-close-menu]').forEach(function (el) {
    el.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menuOpen) closeMenu();
    closeLightbox();
  });

  /* ---------------------------------------------------------------------
   * Language buttons (visual toggle only, no real i18n)
   * ------------------------------------------------------------------- */
  var currentLang = 'EN';
  function paintLang() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      var on = b.getAttribute('data-lang-btn') === currentLang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
    if (!b) return;
    currentLang = b.getAttribute('data-lang-btn');
    paintLang();
  });

  /* ---------------------------------------------------------------------
   * Scroll reveal (fade + rise into view)
   * ------------------------------------------------------------------- */
  (function setupReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length || reduced || !('IntersectionObserver' in window)) return;

    nodes.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      el.style.transition = 'opacity 1000ms cubic-bezier(.22,.61,.36,1), transform 1000ms cubic-bezier(.22,.61,.36,1)';
    });

    function revealNode(el, delay) {
      if (el.dataset.revealed) return;
      el.dataset.revealed = '1';
      setTimeout(function () { el.style.opacity = '1'; el.style.transform = 'none'; }, delay || 0);
      io.unobserve(el);
    }

    var ioFired = false;
    var io = new IntersectionObserver(function (entries) {
      ioFired = true;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        revealNode(en.target, parseInt(en.target.getAttribute('data-reveal-delay') || '0', 10));
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    nodes.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      if (ioFired) return;
      nodes.forEach(function (el) { revealNode(el, 0); });
    }, 700);
  })();

  /* ---------------------------------------------------------------------
   * Philosophy image: horizontal-only parallax
   * ------------------------------------------------------------------- */
  (function setupParallax() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!nodes.length || reduced) return;
    var raf = null;
    function run() {
      var vh = window.innerHeight;
      nodes.forEach(function (img) {
        var box = img.parentNode;
        var r = box.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        var shift = Math.max(-1, Math.min(1, p)) * (r.width * 0.05);
        img.style.transform = 'translate3d(' + shift.toFixed(2) + 'px,0,0)';
      });
    }
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; run(); });
    }, { passive: true });
    run();
  })();

  /* ---------------------------------------------------------------------
   * Intro / hero slider: 2 slides, directional push transition, autoplay
   * that permanently stops once the visitor manually uses an arrow.
   * ------------------------------------------------------------------- */
  var goSlide = null;
  (function setupSlides() {
    var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
    if (slides.length < 2) return;
    var countEl = document.getElementById('slide-count');
    var current = 0;
    var slidesVisible = true;
    var userStopped = false;
    var timer = null;
    var hideTimeout = null;
    var EASE = 'cubic-bezier(.76,0,.24,1)';

    function go(i, dir) {
      var n = slides.length;
      var prev = current;
      current = ((i % n) + n) % n;
      var d = dir === -1 ? -1 : 1;

      slides.forEach(function (el, k) {
        var on = k === current;
        var was = k === prev && !on;
        var img = el.querySelector('img');
        var pad = el.querySelector('[data-slide-pad]');

        if (reduced) {
          el.style.transition = 'opacity 400ms ease';
          el.style.transform = 'none';
          el.style.opacity = on ? '1' : '0';
          el.style.visibility = on ? 'visible' : 'hidden';
        } else if (on) {
          el.style.zIndex = '3';
          el.style.transition = 'none';
          el.style.visibility = 'visible';
          el.style.opacity = '1';
          el.style.clipPath = 'inset(0 0 0 0)';
          if (prev !== current) {
            el.style.transform = 'translate3d(' + (d * 100) + '%,0,0)';
            if (img) { img.style.transition = 'none'; img.style.transform = 'translate3d(' + (-d * 12) + '%,0,0) scale(1.06)'; }
            if (pad) { pad.style.transition = 'none'; pad.style.opacity = '0'; pad.style.transform = 'translate3d(' + (d * 46) + 'px,0,0)'; }
            void el.offsetWidth;
            el.style.transition = 'transform 1150ms ' + EASE;
            el.style.transform = 'translate3d(0,0,0)';
            if (img) { img.style.transition = 'transform 1500ms ' + EASE; img.style.transform = 'translate3d(0,0,0) scale(1.02)'; }
            if (pad) { pad.style.transition = 'opacity 760ms ease 340ms, transform 950ms cubic-bezier(.22,.61,.36,1) 300ms'; pad.style.opacity = '1'; pad.style.transform = 'none'; }
          } else {
            el.style.transform = 'translate3d(0,0,0)';
            if (img) img.style.transform = 'translate3d(0,0,0) scale(1.02)';
          }
        } else if (was) {
          el.style.zIndex = '2';
          el.style.transition = 'transform 1150ms ' + EASE + ', clip-path 1150ms ' + EASE;
          el.style.transform = 'translate3d(' + (-d * 16) + '%,0,0)';
          el.style.clipPath = d === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
          if (img) { img.style.transition = 'transform 1150ms ' + EASE; img.style.transform = 'translate3d(' + (d * 6) + '%,0,0) scale(1.02)'; }
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(function () {
            if (current === k) return;
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
          }, 1200);
        } else {
          el.style.transition = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.zIndex = '1';
        }
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });

      if (countEl) countEl.textContent = ('0' + (current + 1)).slice(-2) + ' / ' + ('0' + slides.length).slice(-2);
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      if (userStopped) return;
      timer = setInterval(function () { if (slidesVisible !== false) go(current + 1, 1); }, 12000);
    }

    goSlide = go;
    go(0);

    var section = slides[0].closest('section');
    if (section && 'IntersectionObserver' in window) {
      slidesVisible = false;
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { slidesVisible = en.isIntersecting; });
        if (slidesVisible) startTimer();
      }, { threshold: 0.3 });
      io.observe(section);
    }
    startTimer();

    var next = document.getElementById('slide-next');
    var prevBtn = document.getElementById('slide-prev');
    if (next) next.addEventListener('click', function () { userStopped = true; if (timer) clearInterval(timer); go(current + 1, 1); });
    if (prevBtn) prevBtn.addEventListener('click', function () { userStopped = true; if (timer) clearInterval(timer); go(current - 1, -1); });
  })();

  /* ---------------------------------------------------------------------
   * Lightbox
   * ------------------------------------------------------------------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');

  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.id === 'lightbox-close' || e.target.closest('#lightbox-close')) {
        closeLightbox();
      }
    });
  }

  /* ---------------------------------------------------------------------
   * Hero 3D ring carousel — drag/inertia, autoplay gated by visibility
   * ------------------------------------------------------------------- */
  function setupRing(opts) {
    var wrap = opts.wrap, ring = opts.ring;
    if (!wrap || !ring) return null;
    var items = Array.prototype.slice.call(ring.querySelectorAll(opts.itemSelector));
    if (!items.length) return null;
    var n = items.length;
    var angle = 0, vel = 0, dragging = false, lastX = 0, lastT = 0, moved = 0;
    var auto = reduced ? 0 : opts.autoSpeed;
    var raf = null;
    var visible = true;

    function radius() { return Math.max(opts.rMin, Math.min(opts.rMax, wrap.clientWidth * opts.rFactor)); }

    items.forEach(function (el) {
      el.addEventListener('click', function () {
        if (moved > 6) return;
        var img = el.querySelector('img');
        if (img) openLightbox(img.currentSrc || img.src);
      });
    });

    function paint() {
      var R = radius();
      var h = wrap.clientHeight;
      var w = Math.max(opts.wMin, Math.min(opts.wMax, h * opts.wFactor));
      var ih = w * opts.aspect;
      for (var i = 0; i < n; i++) {
        var a = angle + (i / n) * Math.PI * 2;
        var x = Math.sin(a) * R;
        var z = Math.cos(a) * R;
        var depth = (z + R) / (2 * R);
        var scale = opts.scaleBase + depth * opts.scaleRange;
        var el = items[i];
        el.style.width = w + 'px';
        el.style.height = ih + 'px';
        el.style.marginLeft = (-w / 2) + 'px';
        el.style.marginTop = (-ih / 2) + 'px';
        el.style.transform = 'translate3d(' + x + 'px,0,' + z + 'px) rotateY(' + (-a * 180 / Math.PI) + 'deg) scale(' + scale.toFixed(3) + ')';
        el.style.opacity = (opts.opBase + depth * opts.opRange).toFixed(3);
        el.style.zIndex = Math.round(depth * 100);
      }
    }

    function frame() {
      if (!dragging && (opts.gateByVisibility ? visible : true)) {
        angle += auto + vel;
        vel *= 0.94;
        if (Math.abs(vel) < 0.00002) vel = 0;
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function down(e) {
      dragging = true;
      wrap.classList.add('is-dragging');
      moved = 0;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
      lastT = Date.now();
      vel = 0;
    }
    function move(e) {
      if (!dragging) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      var dx = x - lastX;
      var dt = Math.max(16, Date.now() - lastT);
      moved += Math.abs(dx);
      angle += dx * 0.003;
      vel = (dx * 0.003) * (16 / dt);
      lastX = x; lastT = Date.now();
      paint();
      if (e.cancelable) e.preventDefault();
    }
    function up() { dragging = false; wrap.classList.remove('is-dragging'); }

    wrap.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    wrap.addEventListener('touchstart', down, { passive: true });
    wrap.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);

    if (opts.gateByVisibility && 'IntersectionObserver' in window) {
      visible = false;
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { visible = en.isIntersecting; });
      }, { threshold: 0.2 });
      io.observe(wrap);
    }

    paint();
    frame();

    return { cleanup: function () { cancelAnimationFrame(raf); } };
  }

  setupRing({
    wrap: document.getElementById('ring-wrap'),
    ring: document.getElementById('ring'),
    itemSelector: '.ring-item',
    autoSpeed: 0.00045,
    rMin: 360, rMax: 680, rFactor: 0.36,
    wMin: 110, wMax: 205, wFactor: 0.255,
    aspect: 16 / 9,
    scaleBase: 0.66, scaleRange: 0.40,
    opBase: 0.3, opRange: 0.7,
    gateByVisibility: false
  });

  /* ---------------------------------------------------------------------
   * Artists 3D ring carousel — slow-then-fast "breathing" autoplay,
   * with a cross-fading caption panel. Stops permanently on manual use.
   * ------------------------------------------------------------------- */
  (function setupArtistRing() {
    var wrap = document.getElementById('art-ring-wrap');
    var ring = document.getElementById('art-ring');
    if (!wrap || !ring) return;
    var items = Array.prototype.slice.call(ring.querySelectorAll('.ar-item'));
    if (!items.length) return;
    var n = items.length, step = (Math.PI * 2) / n;
    var angle = 0, target = 0, index = 0, dragging = false, lastX = 0, moved = 0, dwellUntil = 0;
    var DWELL = 14000;
    var userStop = false;
    var visible = true;
    var raf = null;
    var capT = null;

    var captionEl = document.getElementById('art-caption');
    var roleEl = document.getElementById('art-role');
    var nameEl = document.getElementById('art-name');
    var bioEl = document.getElementById('art-bio');
    var nameRow = null; // created lazily in tight layout

    if ('IntersectionObserver' in window) {
      visible = false;
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { visible = en.isIntersecting; });
        if (visible) dwellUntil = Date.now() + DWELL;
      }, { threshold: 0.35 });
      io.observe(wrap);
    }

    function radius() { return Math.max(300, Math.min(620, wrap.clientWidth * 0.34)); }

    function setCaption(i) {
      var el = items[i];
      if (!el) return;
      var texts = [roleEl, nameEl, bioEl].filter(Boolean);

      if (nameRow && nameEl && !nameEl.style.transition) {
        nameEl.style.transition = 'width 620ms cubic-bezier(.22,.61,.36,1)';
        nameEl.style.whiteSpace = 'nowrap';
        nameEl.style.overflow = 'hidden';
        nameEl.style.textAlign = 'center';
      }
      function measure() {
        if (!nameRow || !nameEl) return null;
        var prevW = nameEl.style.width;
        nameEl.style.transition = 'none';
        nameEl.style.width = 'auto';
        var w = nameEl.getBoundingClientRect().width;
        nameEl.style.width = prevW;
        void nameEl.offsetWidth;
        nameEl.style.transition = 'width 620ms cubic-bezier(.22,.61,.36,1)';
        return w;
      }
      if (nameRow && nameEl && !nameEl.style.width) nameEl.style.width = measure() + 'px';

      function apply() {
        if (roleEl) roleEl.textContent = el.getAttribute('data-role');
        if (nameEl) nameEl.textContent = el.getAttribute('data-name');
        if (bioEl) bioEl.textContent = el.getAttribute('data-bio');
        if (nameRow && nameEl) { var w = measure(); if (w) nameEl.style.width = w + 'px'; }
        texts.forEach(function (t) { t.style.opacity = '1'; });
      }

      if (captionEl && !reduced) {
        captionEl.style.opacity = '1';
        texts.forEach(function (t) { t.style.opacity = '0'; });
        clearTimeout(capT);
        capT = setTimeout(apply, 300);
      } else apply();
    }

    function paint() {
      var R = radius();
      var h = wrap.clientHeight;
      var ih = Math.max(220, Math.min(460, h * 0.67));
      var w = ih * 3 / 4;
      for (var i = 0; i < n; i++) {
        var a = angle + i * step;
        var x = Math.sin(a) * R;
        var z = Math.cos(a) * R;
        var depth = (z + R) / (2 * R);
        var scale = 0.66 + depth * 0.32;
        var el = items[i];
        el.style.width = w + 'px';
        el.style.height = ih + 'px';
        el.style.marginLeft = (-w / 2) + 'px';
        el.style.marginTop = (-ih / 2) + 'px';
        el.style.transform = 'translate3d(' + x + 'px,0,' + z + 'px) rotateY(' + (-a * 180 / Math.PI) + 'deg) scale(' + scale.toFixed(3) + ')';
        el.style.opacity = (0.28 + depth * 0.72).toFixed(3);
        el.style.zIndex = Math.round(depth * 100);
      }
    }

    function setIndex(i, immediate) {
      index = ((i % n) + n) % n;
      var base = Math.round((target + index * step) / (Math.PI * 2));
      target = base * Math.PI * 2 - index * step;
      if (immediate) angle = target;
      dwellUntil = Date.now() + DWELL;
      setCaption(index);
    }

    function frame() {
      if (!dragging) {
        var d = target - angle;
        if (Math.abs(d) > 0.0008) {
          angle += d * 0.07;
        } else {
          angle = target;
          if (!userStop && visible) {
            var frac = -angle / step;
            var dOff = Math.abs(frac - Math.round(frac)) / 0.5;
            var smooth = dOff * dOff * (3 - 2 * dOff);
            angle -= (step / (DWELL / 16.7)) * (0.14 + 3.1 * smooth);
            target = angle;
            var near = ((Math.round(-angle / step) % n) + n) % n;
            if (near !== index) { index = near; setCaption(index); }
          }
        }
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function down(e) { dragging = true; userStop = true; moved = 0; wrap.classList.add('is-dragging'); lastX = e.touches ? e.touches[0].clientX : e.clientX; }
    function move(e) {
      if (!dragging) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      var dx = x - lastX;
      moved += Math.abs(dx);
      angle += dx * 0.004;
      lastX = x;
      paint();
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
      setIndex(Math.round(-angle / step));
    }

    items.forEach(function (el, i) { el.addEventListener('click', function () { if (moved <= 6) setIndex(i); }); });
    wrap.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    wrap.addEventListener('touchstart', down, { passive: true });
    wrap.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);

    var prevBtn = document.getElementById('artist-prev');
    var nextBtn = document.getElementById('artist-next');
    function goNext() { userStop = true; setIndex(index + 1); }
    function goPrev() { userStop = true; setIndex(index - 1); }
    if (nextBtn) nextBtn.addEventListener('click', goNext);
    if (prevBtn) prevBtn.addEventListener('click', goPrev);

    /* Small-screen layout: move the prev/next buttons to flank the
       artist name directly, matching the source's DOM restructure. */
    var artRow = document.querySelector('[data-art-row]');
    function layoutArtistRow() {
      if (!artRow || !prevBtn || !nextBtn || !nameEl || !captionEl) return;
      var tight = window.innerWidth < 760;
      artRow.classList.toggle('is-tight', tight);
      if (tight) {
        if (!nameRow) {
          nameRow = document.createElement('div');
          nameRow.className = 'name-row';
          nameEl.parentNode.insertBefore(nameRow, nameEl);
          nameRow.appendChild(nameEl);
        }
        if (prevBtn.parentNode !== nameRow) nameRow.insertBefore(prevBtn, nameEl);
        if (nextBtn.parentNode !== nameRow) nameRow.appendChild(nextBtn);
      } else if (nameRow) {
        artRow.insertBefore(prevBtn, artRow.firstChild);
        artRow.appendChild(nextBtn);
        nameEl.style.margin = '';
      }
    }
    window.addEventListener('resize', layoutArtistRow);
    layoutArtistRow();

    setIndex(0, true);
    paint();
    frame();
  })();

  /* ---------------------------------------------------------------------
   * Newsletter form — client-side validation, simulated success
   * ------------------------------------------------------------------- */
  (function setupNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    var input = document.getElementById('nl-email');
    var errorEl = document.getElementById('nl-error');
    var errorText = document.getElementById('nl-error-text');
    var successEl = document.getElementById('nl-success');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (!ok) {
        errorText.textContent = v
          ? 'That email address does not look complete. Please check it and try again.'
          : 'Please enter your email address.';
        errorEl.hidden = false;
        successEl.hidden = true;
        return;
      }
      errorEl.hidden = true;
      successEl.hidden = false;
      input.value = '';
    });
  })();

  /* ---------------------------------------------------------------------
   * Close the mobile menu automatically if the viewport grows past the
   * mobile breakpoint while it is open.
   * ------------------------------------------------------------------- */
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 940 && menuOpen) closeMenu();
  });
})();
