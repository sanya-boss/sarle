/* Hero 3D gallery with lightbox. Touch: horizontal swipe rotates, vertical scrolls the page. */
(function () {
  'use strict';
  var wrap = document.getElementById('hp-gallery-wrap');
  var scene = document.getElementById('hp-carousel');
  if (!wrap || !scene) return;
  var items = Array.prototype.slice.call(scene.querySelectorAll('.hp-gallery-3d__item'));
  var N = items.length;
  var lightbox = document.getElementById('hp-lightbox');
  var lbImg = document.getElementById('hp-lb-img');
  var lbBg = document.getElementById('hp-lb-bg');
  var lbClose = document.getElementById('hp-lb-close');

  var AUTO_SPEED = 0.018, DRAG_FACTOR = 0.22, INERTIA_DECAY = 0.935, INERTIA_STOP = 0.008;
  var RADIUS_LG = 620, RADIUS_MD = 430, RADIUS_SM = 310;

  var START_INDEX = 5; // darkest photo (hero-06) faces the viewer first so the logo reads clearly
  var angle = ((-(360 / N) * START_INDEX) % 360 + 360) % 360, velocity = 0, isDragging = false, dragStartX = 0, dragStartY = 0;
  var dragAngle = 0, prevAngle = 0, dragMoved = false, axis = null, isTouch = false;

  function getRadius() {
    var w = window.innerWidth;
    var r = w > 960 ? RADIUS_LG : (w > 640 ? RADIUS_MD : RADIUS_SM);
    var itemW = items[0] ? items[0].offsetWidth : 0;
    if (w <= 640) return itemW * 2.7;
    return Math.max(60, Math.min(r, wrap.clientWidth / 2 - itemW * 0.15 - 8));
  }

  function render() {
    var radius = getRadius();
    var step = 360 / N;
    var iw = items[0].offsetWidth, ih = items[0].offsetHeight;
    for (var i = 0; i < N; i++) {
      var cardAngle = step * i + angle;
      var rad = cardAngle * Math.PI / 180;
      var cosVal = Math.cos(rad);
      var x = Math.sin(rad) * radius;
      var z = cosVal * radius;
      var sc = 0.38 + 0.62 * ((cosVal + 1) / 2);
      items[i].style.transform = 'translateX(' + x.toFixed(2) + 'px) translateZ(' + z.toFixed(2) + 'px) rotateY(' + (-cardAngle).toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      items[i].style.marginLeft = (-iw / 2) + 'px';
      items[i].style.marginTop = (-ih / 2) + 'px';
      var op = 1;
      if (cosVal < -0.2) {
        var tb = Math.min(1, (-0.2 - cosVal) / 0.3);
        op = (i % 2) ? 1 - tb : 1 - tb * 0.55;
      }
      items[i].style.opacity = op.toFixed(3);
      items[i].style.visibility = op < 0.01 ? 'hidden' : 'visible';
      items[i].style.zIndex = Math.round((cosVal + 1) * 50);
    }
  }

  function loop() {
    if (!isDragging) {
      if (Math.abs(velocity) > INERTIA_STOP) { angle += velocity; velocity *= INERTIA_DECAY; }
      else { velocity = 0; angle += AUTO_SPEED; }
    }
    angle = ((angle % 360) + 360) % 360;
    render();
    requestAnimationFrame(loop);
  }

  function begin(x) {
    isDragging = true; dragMoved = false; dragStartX = x;
    dragAngle = angle; prevAngle = angle; velocity = 0;
    wrap.classList.add('hp-gallery-3d--dragging');
  }
  function drag(x) {
    var delta = x - dragStartX;
    if (Math.abs(delta) > 4) dragMoved = true;
    angle = dragAngle + delta * DRAG_FACTOR;
    velocity = angle - prevAngle;
    prevAngle = angle;
  }
  function end() {
    if (!isDragging) return;
    isDragging = false;
    wrap.classList.remove('hp-gallery-3d--dragging');
  }

  wrap.addEventListener('mousedown', function (e) { if (!isTouch) begin(e.clientX); });
  window.addEventListener('mousemove', function (e) { if (isDragging && !isTouch) drag(e.clientX); });
  window.addEventListener('mouseup', function () { if (!isTouch) end(); });

  wrap.addEventListener('touchstart', function (e) {
    isTouch = true; axis = null; dragMoved = false;
    dragStartX = e.touches[0].clientX; dragStartY = e.touches[0].clientY;
  }, { passive: true });
  wrap.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (axis === null) {
      var dx = Math.abs(t.clientX - dragStartX), dy = Math.abs(t.clientY - dragStartY);
      if (dx < 6 && dy < 6) return;
      axis = dx > dy ? 'x' : 'y';
      if (axis === 'x') begin(t.clientX);
    }
    if (axis !== 'x') return;
    if (e.cancelable) e.preventDefault();
    drag(t.clientX);
  }, { passive: false });
  wrap.addEventListener('touchend', function () { if (axis === 'x') end(); axis = null; }, { passive: true });

  var lbCloseTimer = null;
  function openLightbox(src) {
    if (!lightbox) return;
    clearTimeout(lbCloseTimer);
    lbImg.src = src;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('hp-gallery-3d__lightbox--open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('hp-gallery-3d__lightbox--open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbCloseTimer = setTimeout(function () { lbImg.removeAttribute('src'); }, 380);
  }

  scene.addEventListener('click', function (e) {
    if (dragMoved) { dragMoved = false; return; }
    var item = e.target.closest('.hp-gallery-3d__item');
    if (!item) return;
    var img = item.querySelector('img');
    if (img && img.getAttribute('src')) openLightbox(img.getAttribute('src'));
  });
  if (lbBg) lbBg.addEventListener('click', closeLightbox);
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  scene.addEventListener('dragstart', function (e) { e.preventDefault(); });

  render();
  requestAnimationFrame(loop);
})();
