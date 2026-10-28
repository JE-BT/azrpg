// =============================================================================================
// 33_viewwin.js · Alpha 6: the viewing window.
//   A small pixel scene of what the traveller can see, picked by travel mode, biome, weather,
//   light and season: the deck, a small boat, the quay, a town street, a road through the country,
//   the back of a wagon, camp, an airship's rail. Its light follows AZ.Clock (sunrise and sunset
//   from latitude and the day of the year); roofs take the culture's colour and the citadel flies
//   the state's.
// =============================================================================================
AZ.ViewWin = (() => {
  const U = AZ.U, W = 210, H = 118;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  let buf = null, img = null;
  const put = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255; };
  const rect = (x, y, w, h, c) => { for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++) for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) put(i, j, c); };
  const get = (x, y) => { const o = (y * W + x) * 4; return [buf[o], buf[o + 1], buf[o + 2]]; };
  const mix = U.mix;
  // a dithered vertical gradient through colour stops, in bands, the way old games drew skies
  function grad(y0, y1, stops, x0 = 0, x1 = W, bands = 7) {
    for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = x0; x < x1; x++) {
      let t = (y - y0) / Math.max(1, y1 - y0 - 1);
      t = U.clamp(t + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) / bands, 0, 1);
      t = Math.round(t * bands) / bands;
      put(x, y, U.ramp(stops, t));
    }
  }
  function sky(p, yH) {
    const golden = p.phase === "dawn" || p.phase === "dusk", night = p.phase === "night";
    let st = night ? [[0, [8, 10, 30]], [1, [28, 36, 74]]]
      : golden ? [[0, [44, 46, 104]], [0.55, [190, 104, 112]], [1, [250, 184, 112]]]
      : [[0, [70, 116, 188]], [0.7, [150, 186, 222]], [1, [200, 220, 234]]];
    if (/rain|storm|snow|fog/.test(p.wx)) st = st.map(([t, c]) => [t, mix(c, night ? [30, 32, 40] : [150, 156, 166], p.wx === "storm" ? 0.7 : 0.5)]);
    grad(0, yH, st);
    const r = U.rng(`stars:${p.seed}`);
    if (night && !/rain|storm|fog/.test(p.wx)) for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * yH * 0.9; if ((i + Math.floor(p.time / 900)) % 9) put(x, y, i % 5 ? [200, 206, 230] : [255, 255, 255]); }
    // the sun crosses from sunrise to sunset; the moon by night
    const clear = !/rain|storm|fog/.test(p.wx);
    if (clear && p.dl > 0) {
      const span = Math.max(0.5, p.set - p.rise), f = (p.hour - p.rise) / span;
      if (f > -0.04 && f < 1.04) {
        const x = 18 + f * (W - 36), e = Math.sin(Math.PI * U.clamp(f, 0, 1)), y = yH - 4 - e * (yH - 16);
        const c = golden ? [255, 214, 140] : [255, 246, 214];
        for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dy * dy <= 22 && y + dy < yH) put(x + dx, y + dy, c);
      }
    }
    if (clear && night) { const x = 40 + ((p.day * 7) % 130), y = 14 + ((p.day * 3) % 10); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) put(x + dx, y + dy, [236, 238, 250]); }
    // clouds drift
    const n = p.wx === "storm" ? 9 : /rain|snow|cloudy/.test(p.wx) ? 7 : p.wx === "fog" ? 0 : 3, rc = U.rng(`clouds:${p.seed}`);
    const cc = night ? [70, 76, 104] : golden ? [236, 170, 160] : /rain|storm|snow|cloudy/.test(p.wx) ? [118, 124, 136] : [246, 248, 252];
    for (let i = 0; i < n; i++) {
      const cx = ((rc() * (W + 80) + p.time / 400 * (0.3 + rc())) % (W + 80)) - 40, cy = 6 + rc() * yH * 0.45, w = 18 + rc() * 34;
      rect(cx, cy, w, 3, cc); rect(cx + w * 0.2, cy - 2, w * 0.5, 2, cc); rect(cx + w * 0.1, cy + 3, w * 0.8, 1, mix(cc, [0, 0, 0], 0.12));
    }
  }
  function hills(y, amp, col, seed) {
    for (let x = 0; x < W; x++) { const h = (U.vnoise(x, 0, 23, seed) * 0.7 + U.vnoise(x, 0, 7, seed + 1) * 0.3) * amp; for (let yy = Math.floor(y - h); yy < y + 2; yy++) put(x, yy, col); }
  }
  function water(y0, y1, p, near) {
    const night = p.phase === "night", golden = p.phase === "dawn" || p.phase === "dusk";
    const top = night ? [24, 34, 70] : golden ? [96, 84, 124] : [70, 112, 168], deep = night ? [12, 18, 44] : golden ? [52, 52, 96] : near ? [36, 74, 128] : [44, 86, 146];
    grad(y0, y1, [[0, top], [1, deep]], 0, W, 6);
    const r = U.rng(`spark:${p.seed}`), shift = Math.floor(p.time / 260);
    const sp = night ? [120, 130, 170] : golden ? [250, 200, 150] : [214, 230, 246];
    for (let i = 0; i < 90; i++) { const y = y0 + 1 + Math.floor(r() * (y1 - y0 - 1)), x = (r() * W + shift * (1 + (i % 3))) % W, len = 2 + Math.floor(r() * 4 * ((y - y0) / (y1 - y0) + 0.3)); if ((i + shift) % 4) rect(x, y, len, 1, sp); }
  }
  function person(x, y, col, sit) {
    const skin = [214, 170, 130];
    rect(x, y, 3, 2, skin); rect(x, y + 2, 3, sit ? 3 : 4, col); if (!sit) rect(x, y + 6, 1, 2, [60, 46, 40]), rect(x + 2, y + 6, 1, 2, [60, 46, 40]);
  }
  const CLOTH = [[60, 120, 110], [150, 60, 54], [70, 80, 150], [120, 110, 50], [110, 70, 120]];
  function trees(p, yTop, kind, seed) {
    const r = U.rng(`trees:${seed}`), snow = p.snow;
    const n = kind === "dense" ? 26 : kind === "conifer" ? 18 : kind === "sparse" ? 5 : kind === "palm" ? 7 : 10;
    const list = [];
    for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, d = r(); const y = yTop + 2 + d * (H - yTop - 8); const spread = 30 + (y - yTop) * 1.2; const x = W / 2 + side * (18 + (y - yTop) * 0.5 + r() * spread); list.push([x, y, 4 + (y - yTop) * 0.22]); }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of list) {
      if (kind === "conifer") { const g = snow ? [200, 210, 214] : [34, 78, 54]; for (let k = 0; k < s * 2.2; k++) rect(x - k * 0.45, y - s * 2.2 + k, k * 0.9 + 1, 1, k % 3 ? g : mix(g, [0, 0, 0], 0.2)); rect(x, y, 1, s * 0.4, [80, 56, 40]); }
      else if (kind === "palm") { rect(x, y - s * 1.6, 1, s * 1.6, [110, 84, 52]); rect(x - s * 0.7, y - s * 1.7, s * 1.4, 2, [56, 120, 60]); }
      else { const g = snow ? [150, 140, 130] : kind === "dense" ? [46, 98, 52] : [70, 128, 64]; rect(x, y - s * 0.6, 1, s * 0.6, [80, 60, 42]); if (!snow) { rect(x - s * 0.6, y - s * 1.4, s * 1.2, s * 0.8, g); rect(x - s * 0.4, y - s * 1.7, s * 0.8, s * 0.4, mix(g, [255, 255, 255], 0.12)); } else rect(x - s * 0.5, y - s * 1.3, s, 1, g); }
    }
  }
  function ground(p) {
    const b = p.biome || "";
    const base = /desert/i.test(b) ? [210, 182, 118] : /tundra|glacier/i.test(b) ? [206, 212, 218] : /savanna/i.test(b) ? [176, 166, 86] : /wetland/i.test(b) ? [96, 120, 72] : /rain/i.test(b) ? [52, 104, 56] : [112, 156, 72];
    return p.snow ? mix(base, [236, 240, 244], 0.75) : base;
  }
  function landscape(p, yH, road) {
    const gcol = ground(p);
    hills(yH, 9, mix(gcol, [120, 140, 170], 0.55), 3 + (p.seed % 50));
    hills(yH + 4, 5, mix(gcol, [60, 80, 90], 0.3), 9 + (p.seed % 50));
    grad(yH + 3, H, [[0, mix(gcol, [255, 255, 255], 0.08)], [1, mix(gcol, [0, 0, 0], 0.2)]], 0, W, 5);
    if (road) for (let y = yH + 4; y < H; y++) { const f = (y - yH) / (H - yH), half = 2 + f * 30, x0 = W / 2 - half; rect(x0, y, half * 2, 1, (y & 1) ? [164, 136, 98] : [150, 124, 88]); }
    const b = p.biome || "";
    const kind = /taiga|boreal/i.test(b) ? "conifer" : /desert|tundra|glacier/i.test(b) ? "none" : /rain|forest/i.test(b) ? "dense" : /savanna|grass/i.test(b) ? "sparse" : "mixed";
    if (kind !== "none") trees(p, yH + 4, /tropical/i.test(b) && kind === "sparse" ? "palm" : kind, p.seed);
  }
  // ------------------------------------------------------------------ scenes
  const SCENES = {
    deck(p) {
      sky(p, 58); if (p.coast) hills(58, 6, mix([90, 110, 120], [40, 50, 80], p.phase === "night" ? 0.6 : 0), 5);
      water(58, 88, p, false);
      rect(0, 86, W, 4, [96, 64, 40]); for (let x = 6; x < W; x += 16) rect(x, 82, 2, 6, [110, 74, 46]); rect(0, 81, W, 2, [128, 88, 54]);
      grad(90, H, [[0, [150, 104, 64]], [1, [104, 70, 44]]], 0, W, 4); for (let y = 93; y < H; y += 6) rect(0, y, W, 1, [96, 64, 40]);
      rect(166, 0, 6, 98, [110, 76, 48]); rect(167, 0, 1, 98, [140, 100, 64]);
      for (let k = 0; k < 44; k++) rect(120 + k * 0.9, 4 + k * 0.4, 44 - k * 0.9 + 2, 1, k % 7 ? [236, 228, 206] : [214, 204, 180]);
      for (let k = 0; k < 40; k++) put(172 + k, 40 + k * 1.05, [40, 30, 26]);
      for (let i = 0; i < p.people; i++) person(40 + i * 22 + (i > 1 ? 70 : 0), 100, CLOTH[i % 5], i > 0 && p.pastime);
      if (p.damaged) damage(p, 120, 4);
    },
    boat(p) {
      sky(p, 52); if (p.coast) hills(52, 7, [80, 104, 96], 7);
      water(52, 100, p, true);
      for (let x = 0; x < W; x++) { const y = 98 + Math.round(((x - W / 2) / (W / 2)) ** 2 * 6); rect(x, y, 1, H - y, [112, 76, 46]); put(x, y, [150, 106, 64]); }
      rect(104, 30, 3, 74, [104, 72, 44]);
      for (let i = 0; i < Math.min(3, p.people); i++) person(56 + i * 40, 104, CLOTH[i % 5], true);
      if (p.damaged) damage(p, 92, 30);
    },
    quay(p) {
      sky(p, 46);
      const r = U.rng(`town:${p.seed}`), roof = p.cul || [150, 70, 60];
      for (let x = 0; x < W;) { const w = 10 + Math.floor(r() * 12), h = 12 + Math.floor(r() * 16), y = 64 - h; rect(x, y, w - 1, h, mix([214, 200, 176], [120, 110, 100], r() * 0.4)); rect(x - 1, y - 3, w + 1, 3, mix(roof, [0, 0, 0], r() * 0.3)); for (let k = 0; k < 3; k++) rect(x + 2 + k * 3, y + 4, 1, 2, p.phase === "night" ? [250, 210, 120] : [70, 70, 80]); x += w; }
      if (p.capital) { rect(150, 18, 12, 46, [176, 170, 160]); rect(164, 26, 22, 38, [190, 184, 172]); rect(156, 6, 1, 12, [60, 50, 40]); rect(157, 6, 8, 5, p.flag || [80, 160, 120]); }
      water(64, 86, p, true);
      rect(40, 72, 70, 8, [86, 58, 36]); rect(72, 40, 2, 32, [100, 70, 44]); rect(60, 44, 24, 12, [230, 224, 204]);
      grad(86, H, [[0, [160, 158, 150]], [1, [120, 118, 112]]], 0, W, 4); for (let y = 90; y < H; y += 5) for (let x = (y % 10) * 2; x < W; x += 14) rect(x, y, 1, 4, [104, 102, 98]);
      for (let x = 30; x < W; x += 50) rect(x, 82, 4, 6, [60, 56, 52]);
      for (let i = 0; i < p.people; i++) person(50 + i * 36, 100, CLOTH[i % 5]);
    },
    town(p) {
      sky(p, 44);
      const r = U.rng(`street:${p.seed}`), roof = p.cul || [150, 70, 60];
      for (const side of [-1, 1]) for (let k = 0; k < 6; k++) { const d = k / 6, x = side < 0 ? 0 + k * 14 : W - 14 - k * 14, h = 54 - k * 6, y = 92 - h - k * 2, w = 16 - k; rect(x, y, w, h, mix([216, 200, 170], [130, 116, 100], r() * 0.4 + d * 0.2)); rect(x - 1, y - 3, w + 2, 3, mix(roof, [0, 0, 0], r() * 0.3)); for (let j = 0; j < 2; j++) rect(x + 3 + j * 6, y + 8, 2, 3, p.phase === "night" ? [250, 210, 120] : [60, 60, 70]); }
      grad(84, H, [[0, [172, 160, 140]], [1, [130, 120, 104]]], 0, W, 4);
      for (let i = 0; i < p.people; i++) person(80 + i * 18, 98, CLOTH[i % 5]);
    },
    road(p) { sky(p, 56); landscape(p, 56, true); for (let i = 0; i < p.people; i++) person(98 + i * 7, 100 - i * 2, CLOTH[i % 5]); },
    wagon(p) {
      sky(p, 50); landscape(p, 50, true);
      rect(0, 0, W, 8, [208, 196, 168]); for (let x = 0; x < W; x += 30) rect(x, 0, 2, 8, [150, 130, 100]);
      rect(0, 0, 14, H, [96, 64, 40]); rect(W - 14, 0, 14, H, [96, 64, 40]);
      grad(84, H, [[0, [140, 96, 60]], [1, [96, 66, 42]]], 0, W, 4); for (let y = 88; y < H; y += 7) rect(14, y, W - 28, 1, [80, 54, 34]);
      rect(30, 80, 30, 10, [196, 180, 140]); rect(150, 78, 18, 12, [120, 90, 60]);
      for (let i = 0; i < Math.max(1, p.people); i++) person(84 + i * 30, 96, CLOTH[i % 5], true);
    },
    camp(p) {
      sky(p, 62); const gcol = mix(ground(p), [10, 14, 30], p.phase === "night" ? 0.6 : 0.2);
      hills(62, 8, mix(gcol, [20, 26, 50], 0.4), 4); grad(62, H, [[0, gcol], [1, mix(gcol, [0, 0, 0], 0.4)]], 0, W, 4);
      for (let k = 0; k < 30; k++) rect(40 + k * 0.8, 70 + k * 0.9, 50 - k * 1.6, 1, k % 4 ? [140, 110, 76] : [110, 86, 60]); rect(64, 84, 3, 14, [40, 28, 20]);
      const fl = Math.floor(p.time / 140) % 3, fx = 140, fy = 98;
      if (p.phase !== "day") for (let dy = -22; dy <= 22; dy++) for (let dx = -32; dx <= 32; dx++) { const d = (dx * dx) / 1024 + (dy * dy) / 484; if (d < 1 && fy + dy < H && fy + dy > 60) { const c = get(fx + dx, fy + dy); put(fx + dx, fy + dy, mix(c, [255, 160, 80], (1 - d) * 0.35)); } }
      rect(fx - 6, fy + 2, 12, 2, [80, 56, 36]); rect(fx - 3, fy - 4 - fl, 6, 6 + fl, [250, 170, 60]); rect(fx - 1, fy - 7 - fl, 2, 4, [255, 230, 140]);
      for (let i = 0; i < Math.max(1, p.people); i++) person(fx - 26 + i * 40 + (i ? 10 : 0), 96, CLOTH[i % 5], true);
    },
    air(p) {
      sky(p, 84); const cl = p.phase === "night" ? [60, 64, 90] : [236, 238, 246];
      for (let y = 70; y < H; y++) for (let x = 0; x < W; x++) if (U.vnoise(x + p.time / 300, y, 9, 77) > 0.42 - (y - 70) / 80) put(x, y, mix(cl, [150, 160, 190], (y - 70) / 70));
      rect(0, 96, W, 3, [110, 76, 48]); for (let x = 8; x < W; x += 18) rect(x, 96, 2, 22, [96, 64, 40]);
      for (let i = 0; i < p.people; i++) person(60 + i * 30, 104, CLOTH[i % 5]);
    },
  };
  // a damaged vessel: the sail torn, a gap in the rail, a patched plank, water on the deck
  function damage(p, sx, sy) {
    const r = U.rng(`dmg:${p.seed}`);
    for (let k = 0; k < 7; k++) { const x = sx + 6 + r() * 30, y = sy + 4 + r() * 22; rect(x, y, 2 + r() * 4, 2 + r() * 3, mix(get(Math.min(W - 1, x | 0), Math.min(H - 1, y | 0)), [40, 44, 70], 0.75)); }
    rect(70, 81, 18, 6, [70, 90, 130]); rect(74, 84, 10, 1, [150, 170, 200]);
    rect(20, 96, 26, 3, [64, 40, 28]); rect(30, 108, 40, 2, [92, 120, 160]);
  }
  function weather(p) {
    const r = U.rng(`rain:${Math.floor(p.time / 90)}`);
    if (/rain|storm/.test(p.wx)) for (let i = 0; i < (p.wx === "storm" ? 160 : 90); i++) { const x = r() * W, y = r() * H; for (let k = 0; k < 4; k++) put(x - k * 0.5, y + k, [180, 200, 226]); }
    if (p.wx === "snow") for (let i = 0; i < 80; i++) put(r() * W, r() * H, [250, 250, 255]);
    if (p.wx === "fog") for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = get(x, y); put(x, y, mix(c, [204, 210, 216], 0.42)); }
  }
  function light(p) {
    if (p.phase === "day") return;
    const tint = p.phase === "night" ? [24, 30, 66] : [120, 72, 84], k = p.phase === "night" ? 0.5 : 0.2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; const c = [buf[o], buf[o + 1], buf[o + 2]]; if (c[0] > 240 && c[1] > 190 && c[2] < 170) continue; const m = mix(c, tint, k); buf[o] = m[0]; buf[o + 1] = m[1]; buf[o + 2] = m[2]; }
  }
  function draw(cv, p) {
    const ctx = cv.getContext("2d");
    if (!img || cv.width !== W) { cv.width = W; cv.height = H; img = ctx.createImageData(W, H); }
    buf = img.data;
    (SCENES[p.scene] || SCENES.road)(p);
    if (p.scene !== "camp") light(p); else if (p.phase === "night") { /* the fire lights the camp; the sky is already dark */ }
    weather(p);
    ctx.putImageData(img, 0, 0);
  }
  return { draw, W, H, SCENES: Object.keys(SCENES) };
})();

// which scene, and how it looks now
AZ.Game.prototype.windowParams = function () {
  const s = this.s, w = this.w, U = AZ.U, lat = this.lat(), t = this.shownClock ? this.shownClock() : s.clock;
  const sun = AZ.Clock.sun(t, lat), ph = AZ.Clock.light(t, lat).phase, wx = AZ.Weather.at(w, s.c, s.r, t).kind;
  const cell = w.cell(s.c, s.r), biome = w.isLand(s.c, s.r) ? w.P.biomes[w.C.biome[cell]]?.name || "" : "";
  const season = AZ.Clock.season(lat, t), snow = season === "winter" && Math.abs(lat) > 34 && w.isLand(s.c, s.r) || /glacier/i.test(biome);
  const b = this.burgHere ? this.burgHere() : null, inTown = !!b && !s.aboard;
  const coast = !w.isLand(s.c, s.r) && w.near(s.c, s.r, 8).some(n => n.kind === "burg");
  const party = (s.party || []).length, v = s.vessel, act = this.tl && this.tl.activity;
  let scene = "road", label = "";
  if (this.riding()) { scene = s.voyage.mode === "land" ? "wagon" : "deck"; label = s.voyage.mode === "land" ? `From the back of ${s.voyage.ship}` : `The deck of ${s.voyage.ship}`; }
  else if (s.aboard && v) { scene = v.cls === "air" ? "air" : /^(galley|smallship|ship|greatship)$/.test(v.cls) ? "deck" : "boat"; label = `Aboard your ${v.kind.toLowerCase()}`; }
  else if (inTown || (b && s.aboard)) { scene = b.port ? "quay" : "town"; label = `${b.port ? "The quay at" : "The streets of"} ${b.name}`; }
  else if ((ph === "night" && t - (this.tl ? this.tl.moved : 0) > 1) || (act && /camp|sleep|rest/i.test(act.label))) { scene = "camp"; label = "Camp"; }
  else label = `${U.cap(biome || "the country")} · ${s.mount ? "riding" : "on foot"}`;
  const cul = b ? w.P.cultures[b.culture]?.color : w.P.cultures[w.C.culture[cell]]?.color, st = b ? w.P.states[b.state]?.color : null;
  const damaged = !!((v && s.aboard && !s.voyage && (v.damaged || s.cond.damaged)));
  if (damaged) label += " · damaged";
  return { scene, label, damaged, hour: sun.hour, rise: sun.rise, set: sun.set, dl: sun.dl, day: sun.day, phase: ph, wx, season, biome, snow, coast, capital: !!(b && (b.capital || b.citadel || b.walls)),
    cul: cul ? U.hex2rgb(cul) : null, flag: st ? U.hex2rgb(st) : null, people: 1 + Math.min(3, party) + (scene === "deck" && this.riding() ? 2 : 0) + (scene === "quay" || scene === "town" ? 2 : 0),
    pastime: !!act, seed: (s.c * 73856093) ^ (s.r * 19349663), time: (typeof performance !== "undefined" ? performance.now() : 0) };
};
