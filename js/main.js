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

    window.sarleRefreshArtist = function () { setCaption(index); };
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
        var msg = v
          ? 'That email address does not look complete. Please check it and try again.'
          : 'Please enter your email address.';
        errorText.textContent = window.sarleT ? window.sarleT(msg) : msg;
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
   * i18n — EN / EST / RUS. Translations are keyed by the English source
   * string; every text node keeps its original English on the node itself,
   * so switching back and forth is lossless.
   * ------------------------------------------------------------------- */
  (function setupI18n() {
    const EST = {
      'Gallery': 'Galerii', 'Exhibition': 'Näitus', 'Artists': 'Kunstnikud', 'Contact': 'Kontakt',
      'Gallery & Art Studio': 'Galerii ja kunstistuudio',
      'Subscribe to the newsletter': 'Telli uudiskiri',
      'Drag & press to explore': 'Lohista ja klõpsa',
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
      'Thank you. Your subscription is confirmed — we will write when the next exhibition opens.': 'Aitäh. Tellimus on kinnitatud — kirjutame, kui avaneb järgmine näitus.',
      'That email address does not look complete. Please check it and try again.': 'See e-posti aadress ei tundu täielik. Palun kontrolli ja proovi uuesti.',
      'Please enter your email address.': 'Palun sisesta oma e-posti aadress.',
      'PLAN YOUR VISIT': 'PLANEERI KÜLASTUS', 'YOU WILL BE WELCOMED': 'OLED OODATUD',
      'Address': 'Aadress', 'Phone': 'Telefon', 'Email': 'E-post',
      'Located in Old Town, Tallinn, Estonia, Aia tn 17.': 'Vanalinnas, Tallinnas, Aia tn 17.',
      'Get directions': 'Juhised kohale',
      'A cultural space in the very heart of Old Tallinn, bringing together art, music, exhibitions, and creative events.': 'Kultuuriruum Tallinna vanalinna südames, mis toob kokku kunsti, muusika, näitused ja loomingulised sündmused.',
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
      'Born in Yerevan, Armenia, she lives and works in Estonia. An artist, illustrator, and animation film director, she holds a Master’s degree in Animation from the Estonian Academy of Arts (EKA). Her films have participated in prestigious international festivals, including Berlinale, Annecy, Zagreb, and Hiroshima, and have received numerous awards.': 'Sündinud Jerevanis Armeenias, elab ja töötab Eestis. Kunstnik, illustraator ja animafilmide režissöör, omandanud animatsiooni magistrikraadi Eesti Kunstiakadeemias (EKA). Tema filmid on osalenud mainekatel rahvusvahelistel festivalidel, sealhulgas Berlinale, Annecy, Zagreb ja Hiroshima, ning pälvinud arvukalt auhindu.'
    };
    const RUS = {
      'Gallery': 'Галерея', 'Exhibition': 'Выставка', 'Artists': 'Художники', 'Contact': 'Контакты',
      'Gallery & Art Studio': 'Галерея и арт-студия',
      'Subscribe to the newsletter': 'Подписаться на рассылку',
      'Drag & press to explore': 'Прокрутите картины',
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
      'Thank you. Your subscription is confirmed — we will write when the next exhibition opens.': 'Спасибо. Подписка подтверждена — мы напишем, когда откроется следующая выставка.',
      'That email address does not look complete. Please check it and try again.': 'Адрес электронной почты выглядит неполным. Проверьте его и попробуйте снова.',
      'Please enter your email address.': 'Введите ваш адрес электронной почты.',
      'PLAN YOUR VISIT': 'ПЛАНИРУЙТЕ ВИЗИТ', 'YOU WILL BE WELCOMED': 'МЫ БУДЕМ РАДЫ ВАМ',
      'Address': 'Адрес', 'Phone': 'Телефон', 'Email': 'Эл. почта',
      'Located in Old Town, Tallinn, Estonia, Aia tn 17.': 'Старый город, Таллинн, Эстония, Aia tn 17.',
      'Get directions': 'Построить маршрут',
      'A cultural space in the very heart of Old Tallinn, bringing together art, music, exhibitions, and creative events.': 'Культурное пространство в самом сердце Старого Таллинна, объединяющее искусство, музыку, выставки и творческие события.',
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
      'Born in Yerevan, Armenia, she lives and works in Estonia. An artist, illustrator, and animation film director, she holds a Master’s degree in Animation from the Estonian Academy of Arts (EKA). Her films have participated in prestigious international festivals, including Berlinale, Annecy, Zagreb, and Hiroshima, and have received numerous awards.': 'Родилась в Ереване, Армения, живёт и работает в Эстонии. Художник, иллюстратор и режиссёр анимационного кино, магистр анимации Эстонской академии художеств (EKA). Её фильмы участвовали в престижных международных фестивалях, включая Берлинале, Аннси, Загреб и Хиросиму, и получили множество наград.'
    };

    var DICT = { EN: null, EST: EST, RUS: RUS };
    var lang = 'EN';
    try { lang = localStorage.getItem('sarle-lang') || 'EN'; } catch (e) {}

    function t(en) {
      var d = DICT[lang];
      return d && Object.prototype.hasOwnProperty.call(d, en) ? d[en] : en;
    }
    window.sarleT = t;

    function applyLang() {
      var caption = document.getElementById('art-caption');
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (n.__sarleEn === undefined && (!n.nodeValue || !n.nodeValue.trim())) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode;
          if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
          if (caption && caption.contains(p)) return NodeFilter.FILTER_REJECT;
          if (p.closest && p.closest('[data-lang-btn]')) return NodeFilter.FILTER_REJECT;
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
    }
    window.sarleApplyLang = applyLang;

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
      try { localStorage.setItem('sarle-lang', lang); } catch (err) {}
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
