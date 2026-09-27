/*
 * Sarle Art Gallery & Studio — front-end behavior.
 * Vanilla JS, no dependencies. Ported 1:1 from the original design's
 * DCLogic component (header blur, hero + artist 3D ring carousels,
 * intro slider, lightbox, philosophy parallax, newsletter sign-up).
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
   * Scroll reveal (fade + rise into view)
   * ------------------------------------------------------------------- */
  (function setupReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length || reduced || !('IntersectionObserver' in window)) return;

    var fadeOnly = !!document.querySelector('.shop-title');
    nodes.forEach(function (el) {
      el.style.opacity = '0';
      if (fadeOnly) {
        el.style.transition = 'opacity 900ms ease';
      } else {
        el.style.transform = 'translateY(22px)';
        el.style.transition = 'opacity 1000ms cubic-bezier(.22,.61,.36,1), transform 1000ms cubic-bezier(.22,.61,.36,1)';
      }
    });

    function revealNode(el, delay) {
      if (el.dataset.revealed) return;
      el.dataset.revealed = '1';
      setTimeout(function () { el.style.opacity = '1'; if (!fadeOnly) el.style.transform = 'none'; }, delay || 0);
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

    function startObserve() { nodes.forEach(function (el) { io.observe(el); }); }
    if (document.fonts && document.fonts.ready) {
      var started = false;
      var go = function () { if (!started) { started = true; startObserve(); } };
      document.fonts.ready.then(go);
      setTimeout(go, 1200);
    } else startObserve();

    setTimeout(function () {
      if (ioFired) return;
      nodes.forEach(function (el) { revealNode(el, 0); });
    }, 2000);
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

    if (section) {
      var sx = 0, sy = 0, sAxis = null;
      section.style.touchAction = 'pan-y';
      section.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; sAxis = null; }, { passive: true });
      section.addEventListener('touchmove', function (e) {
        if (sAxis) return;
        var dx = Math.abs(e.touches[0].clientX - sx), dy = Math.abs(e.touches[0].clientY - sy);
        if (dx > 10 || dy > 10) sAxis = dx > dy ? 'x' : 'y';
      }, { passive: true });
      section.addEventListener('touchend', function (e) {
        if (sAxis !== 'x') return;
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) < 40) return;
        userStopped = true; if (timer) clearInterval(timer);
        if (dx < 0) go(current + 1, 1); else go(current - 1, -1);
      }, { passive: true });
    }
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

    function radius() {
      var cw = wrap.clientWidth;
      var r = Math.max(opts.rMin, Math.min(opts.rMax, cw * opts.rFactor));
      var fit = cw / 2 - Math.max(opts.wMin, Math.min(opts.wMax, wrap.clientHeight * opts.wFactor)) * 0.5 - 16;
      return Math.max(80, Math.min(r, fit));
    }

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
      startX = lastX;
      startY = e.touches ? e.touches[0].clientY : 0;
      axis = e.touches ? null : 'x';
      lastT = Date.now();
      vel = 0;
    }
    var startX = 0, startY = 0, axis = null;
    function move(e) {
      if (!dragging) return;
      if (e.touches && axis === null) {
        var tdx = Math.abs(e.touches[0].clientX - startX);
        var tdy = Math.abs(e.touches[0].clientY - startY);
        if (tdx < 8 && tdy < 8) return;
        axis = tdx > tdy ? 'x' : 'y';
        if (axis === 'y') { up(); return; }
      }
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
    rMin: 430, rMax: 820, rFactor: 0.43,
    wMin: 100, wMax: 190, wFactor: 0.235,
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
      // The front card is magnified by the CSS perspective (1500px); size it
      // against that factor so it never overflows the ring container.
      var frontMag = 0.98 * (1500 / Math.max(300, 1500 - R));
      var ih = Math.max(200, Math.min(460, (h * 0.94) / frontMag));
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

    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    items.forEach(function (el, i) { el.addEventListener('click', function () { if (isTouch) return; if (moved <= 6) setIndex(i); }); });
    wrap.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    if (true) {
      var tsx = 0, tsy = 0, tAxis = null;
      wrap.addEventListener('touchstart', function (e) {
        tsx = lastX = e.touches[0].clientX; tsy = e.touches[0].clientY; tAxis = null; moved = 0;
      }, { passive: true });
      wrap.addEventListener('touchmove', function (e) {
        var x = e.touches[0].clientX;
        if (tAxis === null) {
          var adx = Math.abs(x - tsx), ady = Math.abs(e.touches[0].clientY - tsy);
          if (adx < 6 && ady < 6) return;
          tAxis = adx > ady ? 'x' : 'y';
          if (tAxis === 'x') { dragging = true; userStop = true; wrap.classList.add('is-dragging'); lastX = x; }
        }
        if (tAxis !== 'x') return;
        if (e.cancelable) e.preventDefault();
        var dx = x - lastX;
        moved += Math.abs(dx);
        angle += dx * 0.009;
        lastX = x;
        paint();
      }, { passive: false });
      wrap.addEventListener('touchend', function () { if (tAxis === 'x') up(); tAxis = null; }, { passive: true });
      wrap.addEventListener('click', function (e) {
        if (moved > 6) return;
        var cur = items[index];
        if (cur && cur.contains(e.target) && !userStop) { userStop = true; setIndex(index); }
      });
    }

    var prevBtn = document.getElementById('artist-prev');
    var nextBtn = document.getElementById('artist-next');
    function goNext() { userStop = true; setIndex(index + 1); }
    function goPrev() { userStop = true; setIndex(index - 1); }
    wrap.goNext = goNext; wrap.goPrev = goPrev;
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

    window.sarleRefreshArtist = function () { setCaption(index); };
    setIndex(0, true);
    paint();
    frame();
  })();

  /* ---------------------------------------------------------------------
   * Newsletter form → Google Apps Script web app → Google Sheets.
   * Transport: POST x-www-form-urlencoded (a CORS "simple" request, no
   * preflight). Apps Script answers with a 302 to googleusercontent.com,
   * which serves the JSON with Access-Control-Allow-Origin: *, so the reply
   * is readable here. Success is shown only when the server's JSON says ok
   * and echoes this request's id. Client checks are convenience, not bot
   * protection; the server re-validates everything.
   * ------------------------------------------------------------------- */
  (function setupNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    var input = document.getElementById('nl-email');
    var consent = document.getElementById('nl-consent');
    var honeypot = document.getElementById('nl-website');
    var button = form.querySelector('button[type="submit"]');
    var pendingEl = document.getElementById('nl-pending');
    var errorEl = document.getElementById('nl-error');
    var successEl = document.getElementById('nl-success');
    var config = window.SARLE_NEWSLETTER || {};
    var endpoint = String(config.endpoint || '').trim();
    var TIMEOUT_MS = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : 20000;
    var MIN_INTERVAL_MS = 4000;
    var EMAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._%+'-]{0,63}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

    var TEXT = {
      EN: {
        sending: 'Sending…',
        ok: 'Thank you. Your subscription is confirmed — we will write when the next exhibition opens.',
        empty_email: 'Please enter your email address.',
        invalid_email: 'That email address does not look complete. Please check it and try again.',
        consent_required: 'Please confirm that you agree to receive the newsletter.',
        invalid_language: 'Could not determine the page language. Please choose EN, EST or RUS and try again.',
        rate_limited: 'Too many attempts. Please wait a minute and try again.',
        busy: 'The server is busy right now. Please try again in a moment.',
        server_error: 'Something went wrong on our side. Your email was not saved — please try again later.',
        network_error: 'Could not reach the server. Check your connection and try again.',
        timeout: 'The server is taking too long to respond. Please try again.',
        not_configured: 'Subscription is temporarily unavailable. Please try again later.'
      },
      RU: {
        sending: 'Отправляем…',
        ok: 'Спасибо. Подписка подтверждена — мы напишем, когда откроется следующая выставка.',
        empty_email: 'Введите ваш адрес электронной почты.',
        invalid_email: 'Адрес электронной почты выглядит неполным. Проверьте его и попробуйте снова.',
        consent_required: 'Подтвердите согласие на получение новостной рассылки.',
        invalid_language: 'Не удалось определить язык страницы. Выберите EN, EST или RUS и попробуйте снова.',
        rate_limited: 'Слишком много попыток. Подождите минуту и попробуйте снова.',
        busy: 'Сервер сейчас занят. Попробуйте ещё раз через несколько секунд.',
        server_error: 'Что-то пошло не так на нашей стороне. Адрес не сохранён — попробуйте позже.',
        network_error: 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.',
        timeout: 'Сервер отвечает слишком долго. Попробуйте снова.',
        not_configured: 'Подписка временно недоступна. Попробуйте позже.'
      },
      ET: {
        sending: 'Saadame…',
        ok: 'Aitäh. Tellimus on kinnitatud — kirjutame, kui avaneb järgmine näitus.',
        empty_email: 'Palun sisesta oma e-posti aadress.',
        invalid_email: 'See e-posti aadress ei tundu täielik. Palun kontrolli ja proovi uuesti.',
        consent_required: 'Palun kinnita nõusolek uudiskirja saamiseks.',
        invalid_language: 'Lehe keelt ei õnnestunud määrata. Vali EN, EST või RUS ja proovi uuesti.',
        rate_limited: 'Liiga palju katseid. Oota minut ja proovi uuesti.',
        busy: 'Server on praegu hõivatud. Proovi mõne hetke pärast uuesti.',
        server_error: 'Midagi läks meie poolel valesti. Aadressi ei salvestatud — proovi hiljem uuesti.',
        network_error: 'Serveriga ei õnnestunud ühendust saada. Kontrolli ühendust ja proovi uuesti.',
        timeout: 'Server vastab liiga kaua. Proovi uuesti.',
        not_configured: 'Tellimine pole praegu saadaval. Proovi hiljem uuesti.'
      }
    };

    // Site codes (EN/EST/RUS) and ISO tags (en-GB, ru-RU, et-EE…) → RU/EN/ET.
    // Anything else is null: never guess a column.
    function normalizeLang(raw) {
      var base = String(raw || '').trim().toLowerCase().replace('_', '-').split('-')[0];
      return { en: 'EN', ru: 'RU', rus: 'RU', et: 'ET', est: 'ET' }[base] || null;
    }
    function pageLang() {
      return normalizeLang(window.sarleGetLang ? window.sarleGetLang() : document.documentElement.lang);
    }

    var shown = null; // { kind: 'pending' | 'error' | 'success', code }
    function render() {
      var dict = TEXT[pageLang() || 'EN'];
      [pendingEl, errorEl, successEl].forEach(function (el) { el.hidden = true; });
      if (!shown) return;
      var el = shown.kind === 'pending' ? pendingEl : shown.kind === 'error' ? errorEl : successEl;
      document.getElementById(el.id + '-text').textContent = dict[shown.code] || dict.server_error;
      el.hidden = false;
    }
    function show(kind, code) { shown = { kind: kind, code: code }; render(); }
    document.addEventListener('sarle:langchange', render);

    function newRequestId() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    }

    var busy = false;
    var lastSentAt = 0;
    function setBusy(on) {
      busy = on;
      button.disabled = on;
      form.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var email = (input.value || '').trim();
      if (!email) { show('error', 'empty_email'); input.focus(); return; }
      if (email.length > 254 || email.indexOf('..') !== -1 || !EMAIL_RE.test(email)) { show('error', 'invalid_email'); input.focus(); return; }
      if (!consent.checked) { show('error', 'consent_required'); consent.focus(); return; }
      var lang = pageLang();
      if (!lang) { show('error', 'invalid_language'); return; }
      if (!endpoint) { show('error', 'not_configured'); return; }
      if (Date.now() - lastSentAt < MIN_INTERVAL_MS) { show('error', 'rate_limited'); return; }

      lastSentAt = Date.now();
      var requestId = newRequestId();
      var body = new URLSearchParams();
      body.set('email', email);
      body.set('lang', lang);
      body.set('consent', 'yes');
      body.set('website', honeypot ? honeypot.value : '');
      body.set('requestId', requestId);

      var controller = window.AbortController ? new AbortController() : null;
      var timedOut = false;
      var timer = setTimeout(function () { timedOut = true; if (controller) controller.abort(); }, TIMEOUT_MS);
      setBusy(true);
      show('pending', 'sending');

      fetch(endpoint, { method: 'POST', body: body, redirect: 'follow', cache: 'no-store', credentials: 'omit', signal: controller ? controller.signal : undefined })
        .then(function (res) {
          if (!res.ok) { var httpErr = new Error('HTTP ' + res.status); httpErr.name = 'HttpError'; throw httpErr; }
          return res.json();
        })
        .then(function (data) {
          if (timedOut) return;
          if (!data || data.requestId !== requestId) { show('error', 'server_error'); return; }
          if (data.ok === true) {
            show('success', 'ok');
            input.value = '';
            consent.checked = false;
          } else {
            show('error', TEXT.EN[data.code] ? data.code : 'server_error');
          }
        })
        .catch(function (err) {
          if (timedOut) { show('error', 'timeout'); return; }
          // A reply that is not our JSON (HTTP error, HTML error page) is a server problem.
          show('error', err && (err.name === 'SyntaxError' || err.name === 'HttpError') ? 'server_error' : 'network_error');
        })
        .then(function () {
          clearTimeout(timer);
          setBusy(false);
        });
    });
  })();


  /* ---------------------------------------------------------------------
   * i18n — EN / EST / RUS. Translations are keyed by the English source
   * string; every text node keeps its original English on the node itself,
   * so switching back and forth is lossless.
   * ------------------------------------------------------------------- */
  (function setupI18n() {
    const EST = {
      'Gallery': 'Galerii', 'Exhibition': 'Näitus', 'Artists': 'Kunstnikud', 'Contact': 'Kontakt',
      'Gallery & Art Studio': 'Galerii ja kunstistuudio',
      'Subscribe to the newsletter': 'Telli uudiskiri',
      'Scroll down': 'Keri alla',
      'Skip to content': 'Liigu sisu juurde',
      "WE'LL BE GLAD TO SEE YOU!": 'OLED OODATUD!',
      'WHERE ART': 'KUS KUNST', 'MEETS SOUL': 'KOHTUB HINGEGA',
      'A contemporary art and cultural space in the very heart of Old Tallinn.': 'Kaasaegse kunsti ja kultuuri ruum vanalinna südames.',
      'Current exhibition': 'Praegune näitus',
      'CONTINUATION': 'ALGUSE', 'OF THE BEGINNING': 'JÄTKUMINE',
      'Every continuation carries a beginning within it. Every beginning already contains the path ahead.': 'Iga jätk kannab endas algust. Iga algus sisaldab juba teed, mis on ees.',
      'Learn more': 'Loe lähemalt',
      'About us': 'Meist',
      'Located at Aia tn 17, amid the historic architecture of the Old Town, the gallery creates a space where art and people meet.': 'Aia tn 17 asuv galerii loob vanalinna ajaloolise arhitektuuri keskel ruumi, kus kunst ja inimesed kohtuvad.',
      'Exhibitions, concerts, auctions, lectures, meetings with artists, educational and charitable projects take place here. It is a place where art does not exist separately from life — it becomes a part of it.': 'Siin toimuvad näitused, kontserdid, oksjonid, loengud, kohtumised kunstnikega ning hariduslikud ja heategevuslikud projektid. See on koht, kus kunst ei eksisteeri elust eraldi — see saab elu osaks.',
      'View map': 'Vaata kaarti',
      'On view, right now': 'Praegu avatud',
      'CURRENT EXHIBITION': 'PRAEGUNE NÄITUS',
      'Evgeny Kos solo exhibition continues an artistic journey begun earlier. Nature, dreamlike imagery and the mechanical world meet in surreal works. The railway becomes a symbol of movement, inner searching and change. Each canvas creates a space for sincere dialogue with the viewer. The exhibition invites us to pause, look closer and feel life’s movement.': 'Jevgeni Kosi isikunäitus jätkab varem alanud kunstiteekonda. Loodus, unenäolised kujundid ja mehaaniline maailm kohtuvad sürrealistlikes töödes. Raudteest saab liikumise, sisemise otsingu ja muutuse sümbol. Iga lõuend loob ruumi siiraks dialoogiks vaatajaga. Näitus kutsub peatuma, lähemalt vaatama ja tundma elu liikumist.',
      'DATES': 'KUUPÄEVAD', 'ARTIST': 'KUNSTNIK', 'VENUE': 'TOIMUMISKOHT', 'ADDRESS': 'AADRESS',
      'THE': '', 'ARTISTS': 'KUNSTNIKUD',
      'Meet the artists whose practices shape the gallery’s evolving dialogue.': 'Tutvu kunstnikega, kelle looming kujundab galerii arenevat dialoogi.',
      'Philosophy': 'Filosoofia',
      'We believe that art brings people closer together.': 'Usume, et kunst toob inimesed üksteisele lähemale.',
      'LET’S CREATE TOGETHER!': 'LOOME KOOS!',
      'News about exhibitions, gatherings, concerts, auctions, and special projects of Sarle Art Gallery & Studio.': 'Uudised näituste, kohtumiste, kontsertide, oksjonite ja Sarle Art Gallery & Studio eriprojektide kohta.',
      'Your email': 'Sinu e-post', 'Subscribe': 'Telli',
      'You consent to the use of your personal data.': 'Nõustud oma isikuandmete kasutamisega.',
      'I agree to receive the Sarle Art Gallery & Studio newsletter by email.': 'Nõustun saama Sarle Art Gallery & Studio uudiskirja e-posti teel.',
      'Thank you. Your subscription is confirmed — we will write when the next exhibition opens.': 'Aitäh. Tellimus on kinnitatud — kirjutame, kui avaneb järgmine näitus.',
      'That email address does not look complete. Please check it and try again.': 'See e-posti aadress ei tundu täielik. Palun kontrolli ja proovi uuesti.',
      'Please enter your email address.': 'Palun sisesta oma e-posti aadress.',
      'PLAN YOUR VISIT': 'PLANEERI KÜLASTUS', 'YOU WILL BE WELCOMED': 'OLED OODATUD',
      'Address': 'Aadress', 'Phone': 'Telefon', 'Email': 'E-post',
      'Located in Old Town, Tallinn, Estonia, Aia tn 17.': 'Vanalinnas, Tallinnas, Aia tn 17.',
      'Get directions': 'Juhised kohale',
      'A cultural space in the very heart of Old Tallinn, bringing together art, music, exhibitions, and creative events.': 'Kultuuriruum Tallinna vanalinna südames, mis toob kokku kunsti, muusika, näitused ja loomingulised sündmused.',
      'Shop': 'Pood', 'The artist': 'Kunstnik', 'Main page': 'Avaleht',
      'Artworks on sale': 'Müügil olevad tööd',
      'SHOP': 'POOD',
      'Artworks from a private collection': 'Erakogust pärit kunstiteosed',
      'Five works available': 'Viis tööd saadaval',
      'ARTWORKS': 'MÜÜGIL', 'ON SALE': 'OLEVAD TÖÖD',
      'Years': 'Aastad', 'Practice': 'Tegevusala', 'In the collection': 'Kogus',
      'Latvian painter and educator': 'Läti maalikunstnik ja õppejõud',
      'Five works, oil on canvas': 'Viis tööd, õli lõuendil',
      'Juris Jurjāns in his studio': 'Juris Jurjāns oma ateljees',
      'See the works': 'Vaata töid',
      'Canvas, oil': 'Lõuend, õli', 'AVAILABLE': 'SAADAVAL', 'Request': 'Küsi lähemalt',
      '«The Angel»': '«Ingel»', '«Golden orange irises»': '«Kuldoranžid iirised»',
      '«Owl at sunset»': '«Öökull päikeseloojangul»', '«Rococo»': '«Rokokoo»', '«The smell of poppy»': '«Mooni lõhn»',
      'Acquisition': 'Omandamine',
      'Interested in a work from the collection?': 'Huvitab mõni töö kogust?',
      'Write to us and we will send condition details, provenance and the price for any piece.': 'Kirjuta meile ja saadame iga teose seisukorra, päritolu ja hinna.',
      'In the private collection of': 'Galerii',
      'are works by the Latvian artist': 'erakogus on läti kunstniku',
      'Juris Jurjāns (1944–2023)': 'Juris Jurjānsi (1944–2023)',
      'Juris Jurjāns was a renowned Latvian painter and educator, a representative of Latvian art of the second half of the 20th and early 21st centuries. His artistic world is filled with natural motifs, flowers, birds, and butterflies, while expressive color and subtle symbolism give his works a distinctive emotional atmosphere.': 'Juris Jurjāns oli tunnustatud läti maalikunstnik ja õppejõud, 20. sajandi teise poole ja 21. sajandi alguse läti kunsti esindaja. Tema kunstimaailm on täis loodusmotiive, lilli, linde ja liblikaid, ekspressiivne värv ja peen sümbolism annavad töödele omanäolise emotsionaalse õhkkonna.',
      'For more than forty years, the artist was connected with the Art Academy of Latvia, where he taught and influenced several generations of artists. His works are represented in museum and private collections in Latvia and beyond.': 'Enam kui neljakümne aasta jooksul oli kunstnik seotud Läti Kunstiakadeemiaga, kus ta õpetas ja mõjutas mitut kunstnike põlvkonda. Tema tööd on esindatud muuseumi- ja erakogudes Lätis ja mujal.',
      'Sarle Art Gallery & Studio presents selected works by Juris Jurjāns from its private collection, available for private acquisition.': 'Sarle Art Gallery & Studio esitleb oma erakogust valitud Juris Jurjānsi töid, mis on saadaval eraomandamiseks.',
      'Visit': 'Külasta', 'Navigate': 'Navigeeri', 'Current Exhibition': 'Praegune näitus', 'Language': 'Keel',
      'Privacy policy': 'Privaatsuspoliitika', 'Back to top ↑': 'Üles ↑',
      'Sculptor — bronze and stone': 'Skulptor — pronks ja kivi',
      'Painter': 'Maalikunstnik',
      'Industrial painter — on view now': 'Industriaalmaalija — praegu väljas',
      'Painter and graphic artist': 'Maali- ja graafikakunstnik',
      'Architect, artist and scenographer': 'Arhitekt, kunstnik ja stsenograaf',
      'Painter, lecturer and art writer': 'Maalikunstnik, õppejõud ja kunstikirjanik',
      'Artist, illustrator and animation director': 'Kunstnik, illustraator ja animafilmide režissöör',
      'A renowned Estonian sculptor who works primarily with bronze and stone. His creations are inspired by mythology, nature, and the human figure, blending monumentality with expressiveness and warmth. Tauno Kangro’s works are displayed in public spaces across Estonia and beyond, and are also held in private collections in various countries around the world.': 'Tunnustatud Eesti skulptor, kes töötab peamiselt pronksi ja kiviga. Tema loomingut inspireerivad mütoloogia, loodus ja inimkuju, ühendades monumentaalsuse väljendusrikkuse ja soojusega. Tauno Kangro tööd on üleval avalikes ruumides üle Eesti ja mujal ning kuuluvad erakogudesse eri riikides.',
      'An Azerbaijani artist who has been living and working in Estonia since 2008. His paintings are filled with light, warmth, and deep inner tranquility, while vibrant color becomes a language of emotions and memories. Rovshan Nur’s works have been exhibited in Estonia and abroad and are held in private collections in various countries around the world.': 'Aserbaidžaani kunstnik, kes on elanud ja töötanud Eestis alates 2008. aastast. Tema maalid on täis valgust, soojust ja sügavat sisemist rahu, erksast värvist saab emotsioonide ja mälestuste keel. Rovshan Nuri töid on eksponeeritud Eestis ja välismaal ning need kuuluvad erakogudesse eri riikides.',
      'An industrial painter who transforms the cold language of machines into the language of human emotion. In his works, metal and mechanisms seem to come alive, becoming reflections of a person’s feelings and inner states. Through the austere aesthetics of the industrial world, Evgeny explores inner drama and the subtle movements of the human soul.': 'Industriaalmaalija, kes muudab masinate külma keele inimlike tunnete keeleks. Tema töödes näivad metall ja mehhanismid ellu ärkavat, peegeldades inimese tundeid ja sisemisi seisundeid. Industriaalmaailma karmi esteetika kaudu uurib Jevgeni sisemist draamat ja hinge peeneid liikumisi.',
      'Born in 1957. An artist who works freely on the border between painting and graphic art, using oil, watercolor, pastel, and ink. His solo exhibitions have been held in Finland, Sweden, Norway, and at the Embassy of China in Estonia. The artist’s works are part of museum and private collections, including the collection of the Estonian National Museum.': 'Sündinud 1957. Kunstnik, kes liigub vabalt maali ja graafika piiril, kasutades õli, akvarelli, pastelli ja tušši. Tema isikunäitusi on toimunud Soomes, Rootsis, Norras ja Hiina saatkonnas Eestis. Kunstniku tööd kuuluvad muuseumi- ja erakogudesse, sealhulgas Eesti Rahva Muuseumi kogusse.',
      'An architect, artist, designer, and scenographer. Founder of the Narva Art School. She works in painting, film, theatre, interior design, and book illustration. Her solo exhibitions have been held in the United States, Poland, Austria, Slovenia, Finland, and Estonia, and her works have received international recognition. Laureate of the LaPersona Award 2025 and Narva Cultural Figure of the Year 2025.': 'Arhitekt, kunstnik, disainer ja stsenograaf. Narva kunstikooli asutaja. Ta tegutseb maalikunstis, filmis, teatris, sisekujunduses ja raamatuillustratsioonis. Tema isikunäitusi on toimunud Ameerika Ühendriikides, Poolas, Austrias, Sloveenias, Soomes ja Eestis ning tema tööd on pälvinud rahvusvahelist tunnustust. LaPersona auhinna 2025 laureaat ja Narva aasta kultuuritegija 2025.',
      'Born in 1967 in Tallinn. A painter, author of several texts on art theory and contemporary artists, and a lecturer; she lives and works in Narva. For Maie, painting is a way of looking and seeing — a means of conveying the uniqueness of the natural world through a personal selection of artistic tools, and a large, colorful canvas is a selfless form of happiness.': 'Sündinud 1967 Tallinnas. Maalikunstnik, mitme kunstiteooriat ja kaasaegseid kunstnikke käsitleva teksti autor ning õppejõud; elab ja töötab Narvas. Maie jaoks on maalimine vaatamise ja nägemise viis — vahend loodusmaailma ainulaadsuse edasiandmiseks isiklikult valitud kunstivahenditega, ning suur värviline lõuend on omakasupüüdmatu õnn.',
      'Born in Yerevan, Armenia, she lives and works in Estonia. An artist, illustrator, and animation film director, she holds a Master’s degree in Animation from the Estonian Academy of Arts (EKA). Her films have participated in prestigious international festivals, including Berlinale, Annecy, Zagreb, and Hiroshima, and have received numerous awards.': 'Sündinud Jerevanis Armeenias, elab ja töötab Eestis. Kunstnik, illustraator ja animafilmide režissöör, omandanud animatsiooni magistrikraadi Eesti Kunstiakadeemias (EKA). Tema filmid on osalenud mainekatel rahvusvahelistel festivalidel, sealhulgas Berlinale, Annecy, Zagreb ja Hiroshima, ning pälvinud arvukalt auhindu.',
      "The story": "Lugu",
      "The founder": "Asutaja",
      "GALLERY": "GALERII",
      "Founded by Svetlana Sarle": "Asutanud Svetlana Sarle",
      "In memory of Vilnis Strazdinš": "Vilnis Strazdinši mälestuseks",
      "Tallinn, Estonia": "Tallinn, Eesti",
      "Aia tn 17, Old Town": "Aia tn 17, vanalinn",
      "A contemporary artistic and cultural space that has organically become part of the historical environment of the Old Town.": "Kaasaegne kunsti- ja kultuuriruum, mis on orgaaniliselt saanud osaks vanalinna ajaloolisest keskkonnast.",
      "Today, Sarle Art Gallery & Studio brings together painting, graphics, photography, sculpture, installation, multimedia art, music, and educational projects.": "Täna ühendab Sarle Art Gallery & Studio maali, graafikat, fotograafiat, skulptuuri, installatsiooni, multimeediakunsti, muusikat ja haridusprojekte.",
      "Svetlana Sarle and Vilnis Strazdinš": "Svetlana Sarle ja Vilnis Strazdinš",
      "Vilnis Strazdinš was a prominent Latvian businessman, yet deeply passionate about painting, music, and the dream of having his own gallery.": "Vilnis Strazdinš oli tuntud Läti ärimees, kes oli sügavalt kirglik maalikunsti ja muusika vastu ning unistas oma galeriist.",
      "In Tallinn, Vilnis opened a clinic and, seeing people struggling with illness, said:": "Tallinnas avas Vilnis kliiniku ning, nähes haigustega võitlevaid inimesi, ütles:",
      "«We must distract them from their suffering and create a project where, by spending a few hours in a hall, people can immerse themselves in healthy beauty and classical music.»": "«Peame juhtima nende mõtted kannatustelt eemale ja looma projekti, kus inimesed saavad mõne tunni saalis veetes sukelduda tervislikku ilusse ja klassikalisse muusikasse.»",
      "Art enthusiast": "Kunstisõber",
      "His dream was for the gallery to have a dress code — and that dream has come true.": "Tema unistus oli, et galeriis kehtiks riietumiskood — ja see unistus on täitunud.",
      "“Heavenly beings,” — Vilnis would say, — “must be untouchable and surrounded by music and love.”": "„Taevased olendid,” — ütles Vilnis, — „peavad olema puutumatud ning ümbritsetud muusika ja armastusega.”",
      "His dream has come true: the temple of art is alive.": "Tema unistus on täitunud: kunstitempel elab.",
      "In one year, it has hosted 13 exhibitions, 7 concerts, and numerous lectures.": "Ühe aastaga on siin toimunud 13 näitust, 7 kontserti ja arvukalt loenguid.",
      "Thank you, Vilnis Strazdinš.": "Aitäh, Vilnis Strazdinš.",
      "Tallinn will preserve your memory.": "Tallinn hoiab sinu mälestust.",
      "A dream": "Unistus",
      "Behind Sarle Art Gallery & Studio stands a person for whom art is inseparable from human feelings, relationships, and inner honesty.": "Sarle Art Gallery & Studio taga seisab inimene, kelle jaoks kunst on lahutamatu inimlikest tunnetest, suhetest ja sisemisest aususest.",
      "Svetlana Sarle possesses a rare combination of strength and sensitivity. Those who know her closely speak of her openness, remarkable emotional depth, kindness, and her ability to empathize profoundly with others.": "Svetlana Sarles on haruldane jõu ja tundlikkuse ühendus. Need, kes teda lähedalt tunnevad, räägivad tema avatusest, erakordsest emotsionaalsest sügavusest, lahkusest ja oskusest teistele sügavalt kaasa tunda.",
      "Her character unites an inner core with a warm and open attitude toward people. Despite disappointments and life’s challenges, she has preserved her ability to believe in others, to remain honest, decent, and deeply compassionate.": "Tema iseloomus ühinevad sisemine tugevus ning soe ja avatud suhtumine inimestesse. Vaatamata pettumustele ja elu katsumustele on ta säilitanud oskuse uskuda teistesse, jääda ausaks, korralikuks ja sügavalt kaastundlikuks.",
      "Svetlana is a trained dramatic theatre actress. She worked in theatre and as a television announcer. Later, she led a clinic and, after completing that chapter of her life, returned once again to creativity.": "Svetlana on hariduselt draamanäitleja. Ta töötas teatris ja telediktorina. Hiljem juhtis ta kliinikut ning pärast selle eluetapi lõppu pöördus taas loomingu juurde.",
      "Sarle Art Gallery & Studio was born from the desire to create a space where art remains genuine, and where a person can remain themselves.": "Sarle Art Gallery & Studio sündis soovist luua ruum, kus kunst jääb ehtsaks ja kus inimene saab jääda iseendaks.",
      "FIVE WORKS · PRIVATE COLLECTION": "VIIS TÖÖD · ERAKOGU",
    };
    const RUS = {
      'Gallery': 'Галерея', 'Exhibition': 'Выставка', 'Artists': 'Художники', 'Contact': 'Контакты',
      'Gallery & Art Studio': 'Галерея и арт-студия',
      'Subscribe to the newsletter': 'Подписаться на рассылку',
      'Scroll down': 'Скролльте вниз',
      'Skip to content': 'Перейти к содержимому',
      "WE'LL BE GLAD TO SEE YOU!": 'МЫ БУДЕМ РАДЫ ВАМ!',
      'WHERE ART': 'ГДЕ ИСКУССТВО', 'MEETS SOUL': 'ВСТРЕЧАЕТ ДУШУ',
      'A contemporary art and cultural space in the very heart of Old Tallinn.': 'Пространство современного искусства и культуры в самом сердце Старого Таллинна.',
      'Current exhibition': 'Текущая выставка',
      'CONTINUATION': 'ПРОДОЛЖЕНИЕ', 'OF THE BEGINNING': 'НАЧАЛА',
      'Every continuation carries a beginning within it. Every beginning already contains the path ahead.': 'Каждое продолжение несёт в себе начало. Каждое начало уже содержит путь вперёд.',
      'Learn more': 'Подробнее',
      'About us': 'О нас',
      'Located at Aia tn 17, amid the historic architecture of the Old Town, the gallery creates a space where art and people meet.': 'Расположенная на Aia tn 17, среди исторической архитектуры Старого города, галерея создаёт пространство, где встречаются искусство и люди.',
      'Exhibitions, concerts, auctions, lectures, meetings with artists, educational and charitable projects take place here. It is a place where art does not exist separately from life — it becomes a part of it.': 'Здесь проходят выставки, концерты, аукционы, лекции, встречи с художниками, образовательные и благотворительные проекты. Это место, где искусство не существует отдельно от жизни — оно становится её частью.',
      'View map': 'Смотреть карту',
      'On view, right now': 'Сейчас в галерее',
      'CURRENT EXHIBITION': 'ТЕКУЩАЯ ВЫСТАВКА',
      'Evgeny Kos solo exhibition continues an artistic journey begun earlier. Nature, dreamlike imagery and the mechanical world meet in surreal works. The railway becomes a symbol of movement, inner searching and change. Each canvas creates a space for sincere dialogue with the viewer. The exhibition invites us to pause, look closer and feel life’s movement.': 'Персональная выставка Евгения Коса продолжает художественный путь, начатый ранее. Природа, сновидческие образы и мир механизмов встречаются в сюрреалистичных работах. Железная дорога становится символом движения, внутреннего поиска и перемен. Каждое полотно создаёт пространство искреннего диалога со зрителем. Выставка приглашает остановиться, всмотреться и почувствовать движение жизни.',
      'DATES': 'ДАТЫ', 'ARTIST': 'ХУДОЖНИК', 'VENUE': 'ПЛОЩАДКА', 'ADDRESS': 'АДРЕС',
      'THE': '', 'ARTISTS': 'ХУДОЖНИКИ',
      'Meet the artists whose practices shape the gallery’s evolving dialogue.': 'Познакомьтесь с художниками, чьи практики формируют живой диалог галереи.',
      'Philosophy': 'Философия',
      'We believe that art brings people closer together.': 'Мы верим, что искусство сближает людей.',
      'LET’S CREATE TOGETHER!': 'ДАВАЙТЕ ТВОРИТЬ ВМЕСТЕ!',
      'News about exhibitions, gatherings, concerts, auctions, and special projects of Sarle Art Gallery & Studio.': 'Новости о выставках, встречах, концертах, аукционах и специальных проектах Sarle Art Gallery & Studio.',
      'Your email': 'Ваш e-mail', 'Subscribe': 'Подписаться',
      'You consent to the use of your personal data.': 'Вы соглашаетесь на использование ваших персональных данных.',
      'I agree to receive the Sarle Art Gallery & Studio newsletter by email.': 'Я даю согласие на получение новостной рассылки Sarle Art Gallery & Studio по электронной почте.',
      'Thank you. Your subscription is confirmed — we will write when the next exhibition opens.': 'Спасибо. Подписка подтверждена — мы напишем, когда откроется следующая выставка.',
      'That email address does not look complete. Please check it and try again.': 'Адрес электронной почты выглядит неполным. Проверьте его и попробуйте снова.',
      'Please enter your email address.': 'Введите ваш адрес электронной почты.',
      'PLAN YOUR VISIT': 'ПЛАНИРУЙТЕ ВИЗИТ', 'YOU WILL BE WELCOMED': 'МЫ БУДЕМ РАДЫ ВАМ',
      'Address': 'Адрес', 'Phone': 'Телефон', 'Email': 'Эл. почта',
      'Located in Old Town, Tallinn, Estonia, Aia tn 17.': 'Старый город, Таллинн, Эстония, Aia tn 17.',
      'Get directions': 'Построить маршрут',
      'A cultural space in the very heart of Old Tallinn, bringing together art, music, exhibitions, and creative events.': 'Культурное пространство в самом сердце Старого Таллинна, объединяющее искусство, музыку, выставки и творческие события.',
      'Shop': 'Магазин', 'The artist': 'Художник', 'Main page': 'Главная',
      'Artworks on sale': 'Работы в продаже',
      'SHOP': 'МАГАЗИН',
      'Artworks from a private collection': 'Работы из частной коллекции',
      'Five works available': 'Пять работ доступно',
      'ARTWORKS': 'РАБОТЫ', 'ON SALE': 'В ПРОДАЖЕ',
      'Years': 'Годы', 'Practice': 'Деятельность', 'In the collection': 'В коллекции',
      'Latvian painter and educator': 'Латвийский живописец и педагог',
      'Five works, oil on canvas': 'Пять работ, холст, масло',
      'Juris Jurjāns in his studio': 'Юрис Юрьянс в своей мастерской',
      'See the works': 'Смотреть работы',
      'Canvas, oil': 'Холст, масло', 'AVAILABLE': 'В НАЛИЧИИ', 'Request': 'Запросить',
      '«The Angel»': '«Ангел»', '«Golden orange irises»': '«Золотые оранжевые ирисы»',
      '«Owl at sunset»': '«Сова на закате»', '«Rococo»': '«Рококо»', '«The smell of poppy»': '«Запах мака»',
      'Acquisition': 'Приобретение',
      'Interested in a work from the collection?': 'Заинтересовала работа из коллекции?',
      'Write to us and we will send condition details, provenance and the price for any piece.': 'Напишите нам, и мы пришлём информацию о состоянии, происхождении и цене любой работы.',
      'In the private collection of': 'В частной коллекции',
      'are works by the Latvian artist': 'находятся работы латвийского художника',
      'Juris Jurjāns (1944–2023)': 'Юриса Юрьянса (1944–2023)',
      'Juris Jurjāns was a renowned Latvian painter and educator, a representative of Latvian art of the second half of the 20th and early 21st centuries. His artistic world is filled with natural motifs, flowers, birds, and butterflies, while expressive color and subtle symbolism give his works a distinctive emotional atmosphere.': 'Юрис Юрьянс — известный латвийский живописец и педагог, представитель латвийского искусства второй половины XX и начала XXI века. Его художественный мир наполнен природными мотивами, цветами, птицами и бабочками, а выразительный цвет и тонкий символизм придают работам особую эмоциональную атмосферу.',
      'For more than forty years, the artist was connected with the Art Academy of Latvia, where he taught and influenced several generations of artists. His works are represented in museum and private collections in Latvia and beyond.': 'Более сорока лет художник был связан с Латвийской академией художеств, где преподавал и повлиял на несколько поколений художников. Его работы представлены в музейных и частных собраниях в Латвии и за её пределами.',
      'Sarle Art Gallery & Studio presents selected works by Juris Jurjāns from its private collection, available for private acquisition.': 'Sarle Art Gallery & Studio представляет избранные работы Юриса Юрьянса из своей частной коллекции, доступные для частного приобретения.',
      'Visit': 'Визит', 'Navigate': 'Навигация', 'Current Exhibition': 'Текущая выставка', 'Language': 'Язык',
      'Privacy policy': 'Политика конфиденциальности', 'Back to top ↑': 'Наверх ↑',
      'Sculptor — bronze and stone': 'Скульптор — бронза и камень',
      'Painter': 'Живописец',
      'Industrial painter — on view now': 'Индустриальный живописец — сейчас в галерее',
      'Painter and graphic artist': 'Живописец и график',
      'Architect, artist and scenographer': 'Архитектор, художник и сценограф',
      'Painter, lecturer and art writer': 'Живописец, преподаватель и автор текстов об искусстве',
      'Artist, illustrator and animation director': 'Художник, иллюстратор и режиссёр анимации',
      'A renowned Estonian sculptor who works primarily with bronze and stone. His creations are inspired by mythology, nature, and the human figure, blending monumentality with expressiveness and warmth. Tauno Kangro’s works are displayed in public spaces across Estonia and beyond, and are also held in private collections in various countries around the world.': 'Известный эстонский скульптор, работающий преимущественно с бронзой и камнем. Его произведения вдохновлены мифологией, природой и человеческой фигурой, соединяя монументальность с выразительностью и теплотой. Работы Тауно Кангро установлены в общественных пространствах Эстонии и за её пределами, а также хранятся в частных коллекциях разных стран мира.',
      'An Azerbaijani artist who has been living and working in Estonia since 2008. His paintings are filled with light, warmth, and deep inner tranquility, while vibrant color becomes a language of emotions and memories. Rovshan Nur’s works have been exhibited in Estonia and abroad and are held in private collections in various countries around the world.': 'Азербайджанский художник, живущий и работающий в Эстонии с 2008 года. Его картины наполнены светом, теплом и глубоким внутренним покоем, а насыщенный цвет становится языком эмоций и воспоминаний. Работы Ровшана Нура выставлялись в Эстонии и за рубежом и находятся в частных коллекциях разных стран мира.',
      'An industrial painter who transforms the cold language of machines into the language of human emotion. In his works, metal and mechanisms seem to come alive, becoming reflections of a person’s feelings and inner states. Through the austere aesthetics of the industrial world, Evgeny explores inner drama and the subtle movements of the human soul.': 'Индустриальный живописец, превращающий холодный язык машин в язык человеческих чувств. В его работах металл и механизмы словно оживают, становясь отражением переживаний и внутренних состояний человека. Через суровую эстетику индустриального мира Евгений исследует внутреннюю драму и тонкие движения человеческой души.',
      'Born in 1957. An artist who works freely on the border between painting and graphic art, using oil, watercolor, pastel, and ink. His solo exhibitions have been held in Finland, Sweden, Norway, and at the Embassy of China in Estonia. The artist’s works are part of museum and private collections, including the collection of the Estonian National Museum.': 'Родился в 1957 году. Художник, свободно работающий на границе живописи и графики, используя масло, акварель, пастель и тушь. Его персональные выставки проходили в Финляндии, Швеции, Норвегии и в посольстве Китая в Эстонии. Работы художника входят в музейные и частные собрания, включая коллекцию Эстонского национального музея.',
      'An architect, artist, designer, and scenographer. Founder of the Narva Art School. She works in painting, film, theatre, interior design, and book illustration. Her solo exhibitions have been held in the United States, Poland, Austria, Slovenia, Finland, and Estonia, and her works have received international recognition. Laureate of the LaPersona Award 2025 and Narva Cultural Figure of the Year 2025.': 'Архитектор, художник, дизайнер и сценограф. Основательница Нарвской художественной школы. Работает в живописи, кино, театре, дизайне интерьера и книжной иллюстрации. Её персональные выставки проходили в США, Польше, Австрии, Словении, Финляндии и Эстонии, а работы получили международное признание. Лауреат премии LaPersona 2025 и «Деятель культуры Нарвы 2025».',
      'Born in 1967 in Tallinn. A painter, author of several texts on art theory and contemporary artists, and a lecturer; she lives and works in Narva. For Maie, painting is a way of looking and seeing — a means of conveying the uniqueness of the natural world through a personal selection of artistic tools, and a large, colorful canvas is a selfless form of happiness.': 'Родилась в 1967 году в Таллинне. Живописец, автор ряда текстов по теории искусства и о современных художниках, преподаватель; живёт и работает в Нарве. Для Майе живопись — это способ смотреть и видеть, средство передать уникальность мира природы через личный выбор художественных инструментов, а большой цветной холст — бескорыстная форма счастья.',
      'Born in Yerevan, Armenia, she lives and works in Estonia. An artist, illustrator, and animation film director, she holds a Master’s degree in Animation from the Estonian Academy of Arts (EKA). Her films have participated in prestigious international festivals, including Berlinale, Annecy, Zagreb, and Hiroshima, and have received numerous awards.': 'Родилась в Ереване, Армения, живёт и работает в Эстонии. Художник, иллюстратор и режиссёр анимационного кино, магистр анимации Эстонской академии художеств (EKA). Её фильмы участвовали в престижных международных фестивалях, включая Берлинале, Аннси, Загреб и Хиросиму, и получили множество наград.',
      "The story": "История",
      "The founder": "Основательница",
      "GALLERY": "ГАЛЕРЕЯ",
      "Founded by Svetlana Sarle": "Основательница — Svetlana Sarle",
      "In memory of Vilnis Strazdinš": "В память о Vilnis Strazdinš",
      "Tallinn, Estonia": "Таллин, Эстония",
      "Aia tn 17, Old Town": "Aia tn 17, Старый город",
      "A contemporary artistic and cultural space that has organically become part of the historical environment of the Old Town.": "Современное художественное и культурное пространство, органично ставшее частью исторической среды Старого города.",
      "Today, Sarle Art Gallery & Studio brings together painting, graphics, photography, sculpture, installation, multimedia art, music, and educational projects.": "Сегодня Sarle Art Gallery & Studio объединяет живопись, графику, фотографию, скульптуру, инсталляцию, мультимедийное искусство, музыку и образовательные проекты.",
      "Svetlana Sarle and Vilnis Strazdinš": "Svetlana Sarle и Vilnis Strazdinš",
      "Vilnis Strazdinš was a prominent Latvian businessman, yet deeply passionate about painting, music, and the dream of having his own gallery.": "Vilnis Strazdinš был известным латвийским бизнесменом, но при этом глубоко увлекался живописью, музыкой и мечтал о собственной галерее.",
      "In Tallinn, Vilnis opened a clinic and, seeing people struggling with illness, said:": "В Таллине Vilnis открыл клинику и, видя людей, борющихся с болезнями, сказал:",
      "«We must distract them from their suffering and create a project where, by spending a few hours in a hall, people can immerse themselves in healthy beauty and classical music.»": "«Мы должны отвлечь их от страданий и создать проект, где люди, проведя несколько часов в зале, смогут погрузиться в здоровую красоту и классическую музыку».",
      "Art enthusiast": "Ценитель искусства",
      "His dream was for the gallery to have a dress code — and that dream has come true.": "Он мечтал, чтобы в галерее был дресс-код, — и эта мечта сбылась.",
      "“Heavenly beings,” — Vilnis would say, — “must be untouchable and surrounded by music and love.”": "«Небесные создания, — говорил Vilnis, — должны быть неприкосновенны и окружены музыкой и любовью».",
      "His dream has come true: the temple of art is alive.": "Его мечта сбылась: храм искусства живёт.",
      "In one year, it has hosted 13 exhibitions, 7 concerts, and numerous lectures.": "За один год здесь прошли 13 выставок, 7 концертов и множество лекций.",
      "Thank you, Vilnis Strazdinš.": "Спасибо, Vilnis Strazdinš.",
      "Tallinn will preserve your memory.": "Таллин сохранит память о тебе.",
      "A dream": "Мечта",
      "Behind Sarle Art Gallery & Studio stands a person for whom art is inseparable from human feelings, relationships, and inner honesty.": "За Sarle Art Gallery & Studio стоит человек, для которого искусство неотделимо от человеческих чувств, отношений и внутренней честности.",
      "Svetlana Sarle possesses a rare combination of strength and sensitivity. Those who know her closely speak of her openness, remarkable emotional depth, kindness, and her ability to empathize profoundly with others.": "Svetlana Sarle обладает редким сочетанием силы и чуткости. Те, кто знает её близко, говорят о её открытости, удивительной эмоциональной глубине, доброте и способности глубоко сопереживать другим.",
      "Her character unites an inner core with a warm and open attitude toward people. Despite disappointments and life’s challenges, she has preserved her ability to believe in others, to remain honest, decent, and deeply compassionate.": "В её характере соединяются внутренний стержень и тёплое, открытое отношение к людям. Несмотря на разочарования и жизненные испытания, она сохранила способность верить в людей, оставаться честной, порядочной и глубоко сострадающей.",
      "Svetlana is a trained dramatic theatre actress. She worked in theatre and as a television announcer. Later, she led a clinic and, after completing that chapter of her life, returned once again to creativity.": "Svetlana — профессиональная драматическая актриса. Она работала в театре и диктором на телевидении. Позже руководила клиникой, а завершив этот этап жизни, вновь вернулась к творчеству.",
      "Sarle Art Gallery & Studio was born from the desire to create a space where art remains genuine, and where a person can remain themselves.": "Sarle Art Gallery & Studio родилась из желания создать пространство, где искусство остаётся подлинным, а человек может оставаться собой.",
      "FIVE WORKS · PRIVATE COLLECTION": "ПЯТЬ РАБОТ · ЧАСТНАЯ КОЛЛЕКЦИЯ",
    };

    var DICT = { EN: null, EST: EST, RUS: RUS };
    var HTML_DICT = {"EST":{"g.intro1":"Eesti, Tallinn, vanalinn — oma inimeste süda, ja just siin, Aia tn 17, asub <strong>Sarle Art Gallery &amp; Studio</strong>.","g.intro2":"Samal aadressil asub ka tuntud Eesti skulptori <strong>Tauno Kangro</strong> galerii. Erinevate kunstisuundade kooseksisteerimine loob ainulaadse õhkkonna — dialoogiruumi traditsiooni ja kaasaegse kunsti vahel.","g.story1":"<strong>Svetlana Sarle</strong> asutas Sarle Art Gallery &amp; Studio oma lähedase sõbra <strong>Vilnis Strazdinši</strong> mälestuseks — tema oli see, kes esimesena mõtles galerii avamisele.","g.sky":"Ta lahkus 63-aastaselt, jättes endast maha helged, soojad ja südamlikud mälestused. Tal oli veel üks soov: aidata vanemaid laste kasvatamisel. Ta oli siiralt õnnelik, kui rääkis oma väikesest sõbrast, kelle ebatavaline nimi oli <strong>Sky</strong>.","g.values":"Svetlana jaoks sai galerii loomine mitte ainult oma lähedase sõbra Vilnis Strazdinši unistuse täitumiseks, vaid ka tema enda väärtuste jätkuks — <strong>armastus inimeste ja ilu vastu, austus mälestuse vastu, tänulikkus ja soov luua.</strong>","shop.bio1":"<strong>Sarle Art Gallery &amp; Studio</strong> erakogus on läti kunstniku <strong>Juris Jurjānsi (1944–2023)</strong> teosed. Valitud töid kogust on võimalik omandada."},"RUS":{"g.intro1":"Эстония, Таллин, Старый город — сердце его жителей, и именно здесь, на Aia tn 17, находится <strong>Sarle Art Gallery &amp; Studio</strong>.","g.intro2":"По этому же адресу находится галерея известного эстонского скульптора <strong>Tauno Kangro</strong>. Сосуществование разных художественных направлений создаёт особую атмосферу — пространство диалога между традицией и современным искусством.","g.story1":"Sarle Art Gallery &amp; Studio основала <strong>Svetlana Sarle</strong> в память о своём близком друге <strong>Vilnis Strazdinš</strong>, который первым задумал открыть галерею.","g.sky":"Он ушёл из жизни в 63 года, оставив после себя светлые, тёплые и искренние воспоминания. У него было ещё одно желание — помогать родителям в воспитании детей. Он был по-настоящему счастлив, рассказывая о своём маленьком друге с необычным именем <strong>Sky</strong>.","g.values":"Для Svetlana создание галереи стало не только исполнением мечты её близкого друга Vilnis Strazdinš, но и продолжением её собственных ценностей — <strong>любви к людям и красоте, уважения к памяти, благодарности и стремления созидать.</strong>","shop.bio1":"В частной коллекции <strong>Sarle Art Gallery &amp; Studio</strong> находятся работы латвийского художника <strong>Юриса Юрьянса (1944–2023)</strong>. Избранные работы из коллекции доступны для приобретения."}};
    var lang = 'EN';
    try { lang = sessionStorage.getItem('sarle-lang') || 'EN'; } catch (e) {}

    function t(en) {
      var d = DICT[lang];
      return d && Object.prototype.hasOwnProperty.call(d, en) ? d[en] : en;
    }
    window.sarleT = t;

    function applyLang() {
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        if (el.__sarleEnHtml === undefined) el.__sarleEnHtml = el.innerHTML;
        var h = HTML_DICT[lang] && HTML_DICT[lang][el.getAttribute('data-i18n')];
        el.innerHTML = h || el.__sarleEnHtml;
      });
      var caption = document.getElementById('art-caption');
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (n.__sarleEn === undefined && (!n.nodeValue || !n.nodeValue.trim())) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
          if (caption && caption.contains(p)) return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('[data-lang-btn]')) return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('[data-i18n]')) return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('[data-i18n-dynamic]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [], cur;
      while ((cur = walker.nextNode())) nodes.push(cur);
      nodes.forEach(function (n) {
        if (n.__sarleEn === undefined) n.__sarleEn = n.nodeValue;
        var en = n.__sarleEn, key = en.trim(), out = t(key);
        n.nodeValue = out === key ? en : en.replace(key, out);
      });

      document.querySelectorAll('.ar-item').forEach(function (el) {
        if (!el.dataset.roleEn) { el.dataset.roleEn = el.getAttribute('data-role'); el.dataset.bioEn = el.getAttribute('data-bio'); }
        el.setAttribute('data-role', t(el.dataset.roleEn));
        el.setAttribute('data-bio', t(el.dataset.bioEn));
      });
      if (window.sarleRefreshArtist) window.sarleRefreshArtist();
      document.documentElement.lang = lang === 'RUS' ? 'ru' : (lang === 'EST' ? 'et' : 'en');
      document.dispatchEvent(new CustomEvent('sarle:langchange', { detail: { lang: lang } }));
    }
    window.sarleApplyLang = applyLang;
    window.sarleGetLang = function () { return lang; };

    function paint() {
      document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
        var on = b.getAttribute('data-lang-btn') === lang;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
      if (!b) return;
      lang = b.getAttribute('data-lang-btn');
      try { sessionStorage.setItem('sarle-lang', lang); } catch (err) {}
      paint();
      applyLang();
    });

    paint();
    if (lang !== 'EN') applyLang();
  })();

  /* ---------------------------------------------------------------------
   * Close the mobile menu automatically if the viewport grows past the
   * mobile breakpoint while it is open.
   * ------------------------------------------------------------------- */
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 940 && menuOpen) closeMenu();
  });
})();
