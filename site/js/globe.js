/* Interactive 3D Earth for slide 02 (Open Call).
 * Plain WebGL, no libraries. Replaces the still planet <img class="oc-planet">
 * with a <canvas> of the same size and place; if WebGL is not available, the
 * picture simply stays.
 *   Ground: NASA Blue Marble Next Generation (public domain), assets/intro/earth-2048.jpg
 *   Clouds: assets/intro/clouds-2048.jpg (generated, greyscale: white = cloud), used twice:
 *           a main layer plus a fainter one at another speed, so the cover keeps changing
 *
 * Behaviour: on its own the globe slowly swings back and forth around Europe and
 * the clouds drift. Visitors can grab it and spin it (mouse or finger); it keeps
 * the momentum, and a few seconds after letting go it eases back to Europe.
 *
 * Tweak here:
 */
(function () {
  var HOME_LON = 20;        // where it starts and rests: longitude facing the viewer (20 = Europe)
  var FAR_LON = -90;        // the other end of the swing (-90 = the middle of the USA); it turns there over the Atlantic, never over the Pacific
  var HOME_TILT = 32;       // how far the north pole leans towards the viewer (degrees) — Europe near the middle
  var TILT_PLAY = 14;       // up/down dragging is allowed only this far (degrees) and springs back
  var SWING_SECONDS = 32;   // one full swing Europe → USA → Europe
  var CLOUD_SECONDS = 220;  // clouds drift once around the planet in this time
  var CLOUD2_SECONDS = 110; // a second, fainter cloud layer moves at another speed, so the clouds slowly change shape
  var RETURN_AFTER = 2600;  // ms after letting go before it eases back to Europe

  var img = document.querySelector('.iv-slide--light img.oc-planet');
  if (!img) return;
  var slide = img.closest('.iv-slide');

  var canvas = document.createElement('canvas');
  canvas.className = img.className + ' oc-globe';
  canvas.setAttribute('style', img.getAttribute('style') || '');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', (img.getAttribute('alt') || 'Planet Earth') + ' — drag to turn');

  var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return; // keep the still picture

  var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision highp float;',
    'varying vec2 v;',
    'uniform sampler2D tex;',
    'uniform sampler2D clouds;',
    'uniform float lon;',       // ground rotation, radians
    'uniform float cloudLon;',  // cloud rotation, radians
    'uniform float cloud2Lon;', // second cloud layer, radians
    'uniform float tilt;',      // radians
    'const float R = 0.94;',    // planet radius inside the square (room for the glow)
    'const float PI = 3.14159265;',
    'const float SHADOW = 0.62;',                             // how dark the shadow side gets (0 = none, 1 = black)
    'const vec3 EU = vec3(0.1664, 0.7660, 0.6209);',          // centre of Europe (50°N, 15°E) as a direction
    'const float EU_INNER = 0.30;', 'const float EU_OUTER = 0.62;',  // clear area radius, radians (~17° fully, fading out to ~35°)
    'const float EU_CLEAR = 0.8;',                            // how much cloud is removed there (0 = none, 1 = all)
    'void main(){',
    '  vec2 q = v / R;',
    '  float r2 = dot(q, q);',
    '  vec3 L = normalize(vec3(-0.55, 0.55, 0.65));',       // light from the upper left, like the poster
    '  if (r2 > 1.0) {',                                     // soft blue halo outside the planet
    '    float d = (length(v) - R) / (1.0 - R);',
    '    float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4) * 0.38;',
    '    gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * a, a);',
    '    return;',
    '  }',
    '  vec3 n = vec3(q, sqrt(1.0 - r2));',
    '  float c = cos(tilt), s = sin(tilt);',
    '  vec3 w = vec3(n.x, c * n.y + s * n.z, -s * n.y + c * n.z);', // lean the north pole towards the viewer
    '  float la = asin(clamp(w.y, -1.0, 1.0));',
    '  float base = atan(w.x, w.z);',
    '  vec2 uv = vec2(fract((base + lon) / (2.0 * PI) + 0.5), 0.5 - la / PI);',
    '  vec3 col = texture2D(tex, uv).rgb;',
    '  float sea = smoothstep(0.02, 0.12, col.b - max(col.r, col.g));',
    '  float diff = max(dot(n, L), 0.0);',
    '  float day = smoothstep(-0.45, 0.55, dot(n, L));',      // soft shadow side, lower right (SHADOW sets how dark)
    '  vec2 cuv = vec2(fract((base + cloudLon) / (2.0 * PI) + 0.5), uv.y);',
    '  vec2 cuv2 = vec2(fract((base + cloud2Lon) / (2.0 * PI) + 0.31), clamp(1.0 - uv.y + 0.04 * sin(base * 3.0 + cloud2Lon), 0.0, 1.0));',
    '  float cl = max(texture2D(clouds, cuv).r, texture2D(clouds, cuv2).r * 0.55);',
    '  float shade = texture2D(clouds, cuv + vec2(0.004, -0.004)).r;',  // soft cloud shadow on the ground
    '  float glon = base + lon;',                              // ground longitude here
    '  vec3 g = vec3(cos(la) * sin(glon), sin(la), cos(la) * cos(glon));',
    '  float clear = 1.0 - smoothstep(EU_INNER, EU_OUTER, acos(clamp(dot(g, EU), -1.0, 1.0)));',
    '  cl *= 1.0 - EU_CLEAR * clear; shade *= 1.0 - EU_CLEAR * clear;', // thinner clouds over Europe
    '  col *= 1.0 - 0.28 * shade;',
    '  vec3 lit = col * mix(1.0 - SHADOW, 1.0, day) * (0.55 + 0.85 * diff);',
    '  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  lit += vec3(1.0) * pow(max(dot(n, H), 0.0), 60.0) * 0.45 * sea;',
    '  lit = mix(lit, vec3(1.0) * (0.62 + 0.5 * diff) * mix(1.0 - SHADOW * 0.85, 1.0, day), cl * 0.9);',  // white clouds on top
    '  float rim = pow(1.0 - n.z, 2.6);',                    // atmosphere at the edge
    '  lit = mix(lit, vec3(0.45, 0.72, 1.0) * mix(0.55, 1.0, day), rim * mix(0.45, 0.75, day));',
    '  float edge = smoothstep(1.0, 0.985, r2);',             // antialiased outline
    '  gl_FragColor = vec4(lit * edge, edge);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch (e) { return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var pLoc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
  var uLon = gl.getUniformLocation(prog, 'lon');
  var uCloudLon = gl.getUniformLocation(prog, 'cloudLon');
  var uCloud2Lon = gl.getUniformLocation(prog, 'cloud2Lon');
  var uTilt = gl.getUniformLocation(prog, 'tilt');
  gl.uniform1i(gl.getUniformLocation(prog, 'tex'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'clouds'), 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  var ready = false, loaded = 0;
  function loadTex(unit, src, format) {
    var t = gl.createTexture(), im = new Image();
    im.onload = function () {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, im);
      // no mipmaps: they would draw a seam where the map's edges meet
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (++loaded === 2) begin();
    };
    im.src = new URL(src, document.baseURI).href;
  }
  function begin() {
    ready = true;
    // swap the still picture for the globe
    img.parentNode.insertBefore(canvas, img.nextSibling);
    canvas.parentNode.insertBefore(pin, canvas.nextSibling);
    img.style.setProperty('display', 'none', 'important');
    resize();
  }
  loadTex(0, '/assets/intro/earth-2048.jpg', gl.RGB);
  loadTex(1, '/assets/intro/clouds-2048.jpg', gl.LUMINANCE);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    if (canvas.width !== w) { canvas.width = w; canvas.height = w; gl.viewport(0, 0, w, w); }
  }

  /* ---- motion: auto swing around Europe + drag with momentum ---------------- */
  var D = Math.PI / 180;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now(), last = t0;
  var curLon = HOME_LON * D, curTilt = HOME_TILT * D;   // what is shown now
  var velLon = 0, velTilt = 0;                          // momentum after a throw (rad per ms)
  var dragging = false, lastMove = -1e9, px = 0, py = 0, pt = 0;

  function autoLon(t) {
    if (reduced) return HOME_LON * D;
    // cosine: starts on Europe, slows down at each end, America at half time
    var mid = (HOME_LON + FAR_LON) / 2, amp = (HOME_LON - FAR_LON) / 2;
    return (mid + amp * Math.cos((t - t0) / 1000 / SWING_SECONDS * 2 * Math.PI)) * D;
  }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  function step(t) {
    var dt = Math.min(64, t - last); last = t;
    if (!dragging) {
      if (t - lastMove < RETURN_AFTER) {
        // coast sideways with the throw, slowing down; the tilt settles back at once
        curLon += velLon * dt;
        var f = Math.pow(0.94, dt / 16.7); velLon *= f;
        curTilt += (HOME_TILT * D - curTilt) * (1 - Math.pow(0.9, dt / 16.7));
      } else {
        // ease back to the automatic swing around Europe
        var k = 1 - Math.pow(0.965, dt / 16.7);
        curLon += wrap(autoLon(t) - curLon) * k;
        curTilt += (HOME_TILT * D - curTilt) * k;
      }
    }
    curTilt = Math.max((HOME_TILT - TILT_PLAY) * D, Math.min((HOME_TILT + TILT_PLAY) * D, curTilt));
  }

  function draw(t) {
    if (!ready) return;
    resize();
    step(t);
    gl.uniform1f(uLon, curLon);
    var sec = reduced ? 0 : (t - t0) / 1000;
    gl.uniform1f(uCloudLon, curLon + sec / CLOUD_SECONDS * 2 * Math.PI);
    gl.uniform1f(uCloud2Lon, curLon + sec / CLOUD2_SECONDS * 2 * Math.PI);
    gl.uniform1f(uTilt, curTilt);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    placePin();
  }


  /* ---- points: Tallinn first, then other cities light up one by one -----------
   * Plain HTML on top of the globe (styles: .oc-pin in open-call.css). They follow
   * the globe as it turns and fade out when they go round the back.
   * Tallinn appears first (CSS: 2 s after the slide opens); the cities after it,
   * each more slowly, CITY_STEP ms apart. */
  var PIN_AT = [59.437, 24.754];   // Tallinn, lat / lon
  var CITY_START = 3200;           // ms after the slide opens: first city starts to appear
  var CITY_STEP = 360;             // ms between cities
  var CITY_FADE = 2200;            // how long each city takes to fade in, ms
  var CITIES = [                   // lat, lon — in the order they light up
    [51.507, -0.128],   // London
    [48.857, 2.352],    // Paris
    [52.52, 13.405],    // Berlin
    [41.902, 12.496],   // Rome
    [40.417, -3.704],   // Madrid
    [59.329, 18.069],   // Stockholm
    [41.009, 28.978],   // Istanbul
    [30.044, 31.236],   // Cairo
    [25.205, 55.271],   // Dubai
    [6.524, 3.379],     // Lagos
    [19.076, 72.878],   // Mumbai
    [-1.292, 36.822],   // Nairobi
    [64.147, -21.943],  // Reykjavik
    [39.904, 116.407],  // Beijing
    [-33.925, 18.424],  // Cape Town
    [35.676, 139.65],   // Tokyo
    // the Americas light up last, while the globe turns towards them
    [-23.551, -46.633], // São Paulo
    [-22.907, -43.173], // Rio de Janeiro
    [-34.604, -58.382], // Buenos Aires
    [42.360, -71.059],  // Boston
    [40.713, -74.006],  // New York
    [45.502, -73.567],  // Montreal
    [43.653, -79.383],  // Toronto
    [38.907, -77.037],  // Washington
    [25.762, -80.192],  // Miami
    [23.113, -82.366],  // Havana
    [4.711, -74.072],   // Bogotá
    [-12.046, -77.043], // Lima
    [-33.449, -70.669], // Santiago
    [41.878, -87.630],  // Chicago
    [29.760, -95.370],  // Houston
    [19.433, -99.133],  // Mexico City
    [39.739, -104.990], // Denver
    [49.283, -123.121], // Vancouver
    [47.606, -122.332], // Seattle
    [37.775, -122.419], // San Francisco
    [34.052, -118.244]  // Los Angeles
  ];
  function toVec(ll) {
    var la = ll[0] * D, lo = ll[1] * D;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  }
  function makePin(ll, city, i) {
    var el = document.createElement('div');
    el.className = 'oc-pin' + (city ? ' oc-pin--city' : '');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="oc-pin-dot"></i>';
    if (city && !reduced) {
      el.style.animationDelay = (CITY_START + i * CITY_STEP) + 'ms';
      el.style.animationDuration = CITY_FADE + 'ms';
      el.style.setProperty('--glow-delay', (-(i * 1.37) % 3.6).toFixed(2) + 's');  // not all breathing in step
    }
    return { el: el, v: toVec(ll) };
  }
  var pins = [makePin(PIN_AT, false, 0)].concat(CITIES.map(function (ll, i) { return makePin(ll, true, i); }));
  var pin = document.createDocumentFragment();
  pins.forEach(function (p) { pin.appendChild(p.el); });

  function placePin() {
    var parent = canvas.parentNode;
    if (!parent) return;
    // turn the globe's way: same maths as the shader, backwards
    var cl = Math.cos(curLon), sl = Math.sin(curLon), c = Math.cos(curTilt), s = Math.sin(curTilt);
    var cr = canvas.getBoundingClientRect(), pr = parent.getBoundingClientRect();
    for (var i = 0; i < pins.length; i++) {
      var v = pins[i].v;
      var wx = v[0] * cl - v[2] * sl, wz = v[2] * cl + v[0] * sl, wy = v[1];
      var ny = c * wy - s * wz, nz = s * wy + c * wz;
      var x = cr.left - pr.left + (1 + wx * 0.94) / 2 * cr.width;
      var y = cr.top - pr.top + (1 - ny * 0.94) / 2 * cr.height;
      var st = pins[i].el.style;
      st.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      st.setProperty('--pin-vis', Math.max(0, Math.min(1, (nz - 0.12) * 5)).toFixed(3));
    }
  }

  var visible = true;
  function loop(t) {
    // only spend frames while the slide is shown and on screen
    if (visible && (!slide || slide.classList.contains('is-active') || slide.classList.contains('is-leaving'))) draw(t);
    else last = t;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* drag to turn: sideways turns the globe, up/down tilts it */
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true; velLon = velTilt = 0;
    px = e.clientX; py = e.clientY; pt = performance.now();
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  }
  function move(e) {
    if (!dragging) return;
    var now = performance.now(), size = canvas.clientWidth || 300;
    var dx = e.clientX - px, dy = e.clientY - py, dt = Math.max(1, now - pt);
    var dLon = -dx / size * Math.PI, dTilt = dy / size * Math.PI * 0.35;   // sideways follows the finger, up/down only a little
    curLon += dLon;
    curTilt = Math.max((HOME_TILT - TILT_PLAY) * D, Math.min((HOME_TILT + TILT_PLAY) * D, curTilt + dTilt));
    velLon = dLon / dt; velTilt = 0;
    px = e.clientX; py = e.clientY; pt = now; lastMove = now;
  }
  function up() {
    if (!dragging) return;
    dragging = false; lastMove = performance.now();
    if (lastMove - pt > 90) velLon = velTilt = 0;   // held still before letting go: no throw
    canvas.classList.remove('is-dragging');
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up);
  // keep the slider's own swipe from switching slides while turning the globe
  ['touchstart', 'touchmove', 'touchend'].forEach(function (type) {
    canvas.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
})();
