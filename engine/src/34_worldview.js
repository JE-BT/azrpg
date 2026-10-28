// =============================================================================================
// 34_worldview.js · Alpha 6: the world as the traveller knows it.
//   The tiles are the traveller's eyes: in sight is drawn in full colour and live; ground seen
//   before is dimmed and fades with age, with nothing that moves; places heard of are a dashed ring
//   and a name; the rest is fogged (Settings: full fog, land shown, or none). Zoomed out, World is
//   the mental map. Planning aids read only what you know: hours on foot to any tile, and a gold
//   line round what you can reach before dusk.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U;
  AZ.ZOOMS = [{ map: 2 }, { map: 4 }, { map: 8 }, { tile: 1 }, { tile: 2 }, { tile: 3 }, { tile: 4 }];
  const FOG = [11, 15, 26];
  const fogA = (opt, d, today) => { // 0..255
    if (opt === "none") return 0;
    if (!d) return opt === "full" ? 248 : 190;
    const age = Math.max(0, today - (d - 1));
    return Math.round(255 * Math.min(opt === "full" ? 0.62 : 0.5, (opt === "full" ? 0.3 : 0.16) + age * 0.012));
  };
  G.fogOpt = function () { return this.atlas ? "none" : (this.set && this.set.fog) || "land"; };
  // ------------------------------------------------------------------ fog chunks on the tile view
  G.fogReset = function () { this._fogC = new Map(); this.mapDirty = true; };
  G.fogTouch = function (c, r, R) {
    if (!this._fogC) return;
    const CH = this.ren.CH;
    for (let cy = Math.floor((r - R) / CH); cy <= Math.floor((r + R) / CH); cy++) for (let cx = Math.floor((c - R) / CH); cx <= Math.floor((c + R) / CH); cx++) this._fogC.delete(cy * 4096 + cx);
    this.mapDirty = true;
  };
  G.fogChunk = function (cx, cy, opt, today) {
    this._fogC = this._fogC || new Map();
    const k = cy * 4096 + cx, hit = this._fogC.get(k);
    if (hit && hit.day === today && hit.opt === opt) return hit.cv;
    const w = this.w, CH = this.ren.CH, cv = hit && hit.cv || this.ren.mk(CH, CH), ctx = cv.getContext("2d"), img = ctx.createImageData(CH, CH), sd = this.ensureSeen();
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const c = cx * CH + tx, r = cy * CH + ty, o = (ty * CH + tx) * 4;
      img.data[o] = FOG[0]; img.data[o + 1] = FOG[1]; img.data[o + 2] = FOG[2];
      img.data[o + 3] = w.inb(c, r) ? fogA(opt, sd[w.idx(c, r)], today) : 255;
    }
    ctx.putImageData(img, 0, 0);
    this._fogC.set(k, { cv, day: today, opt });
    if (this._fogC.size > 160) this._fogC.delete(this._fogC.keys().next().value);
    return cv;
  };
  G.sightPx = function (S) { // the in-sight ring on screen: less at night and in fog
    const s = this.s, R = this.know.sightTiles(s.c, s.r, s.aboard), t = this.shownClock();
    const ph = AZ.Clock.light(t, this.lat()).phase, wx = AZ.Weather.at(this.w, s.c, s.r, t).kind;
    return R * S * (ph === "night" ? 0.6 : 1) * (wx === "fog" ? 0.55 : /rain|snow|storm/.test(wx) ? 0.85 : 1);
  };
  G.fogLayer = function (ctx, v, cx, cy) {
    const opt = this.fogOpt();
    if (opt === "none") return;
    const { left, top, S, W, H } = v, CH = this.ren.CH, w = this.w, today = Math.floor(this.shownClock() / 24);
    if (!this._fogCv || this._fogCv.width !== W || this._fogCv.height !== H) this._fogCv = this.ren.mk(W, H);
    const f = this._fogCv.getContext("2d");
    f.globalCompositeOperation = "source-over"; f.clearRect(0, 0, W, H); f.imageSmoothingEnabled = true;
    const c0 = Math.floor(left / CH), c1 = Math.floor((left + W / S) / CH), r0 = Math.floor(top / CH), r1 = Math.floor((top + H / S) / CH), CS = CH * S;
    for (let ky = r0; ky <= r1; ky++) for (let kx = c0; kx <= c1; kx++) {
      const X = Math.round((kx * CH - left) * S), Y = Math.round((ky * CH - top) * S);
      if (kx < 0 || ky < 0 || kx * CH >= w.cols || ky * CH >= w.rows) { f.fillStyle = `rgb(${FOG})`; f.fillRect(X, Y, CS, CS); continue; }
      f.drawImage(this.fogChunk(kx, ky, opt, today), X, Y, CS, CS);
    }
    const X = (cx + 0.5 - left) * S, Y = (cy + 0.5 - top) * S, R = this.sightPx(S);
    const gr = f.createRadialGradient(X, Y, Math.max(1, R - 1.4 * S), X, Y, R + 0.6 * S);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    f.globalCompositeOperation = "destination-out"; f.fillStyle = gr; f.beginPath(); f.arc(X, Y, R + 0.6 * S, 0, 7); f.fill();
    f.globalCompositeOperation = "source-over";
    ctx.drawImage(this._fogCv, 0, 0);
  };
  G.inSight = function (c, r) { if (this.fogOpt() === "none") return true; const s = this.s, R = this.know.sightTiles(s.c, s.r, s.aboard); return (c - s.c) ** 2 + (r - s.r) ** 2 <= R * R; };
  // ------------------------------------------------------------------ the mental map image: one pixel per tile
  G.knowImage = function (now) {
    const w = this.w, opt = this.fogOpt(), today = Math.floor(this.shownClock() / 24);
    if (this._kimg && !(this.mapDirty && now - this._kimgT > 1200) && this._kimgDay === today && this._kimgOpt === opt) return this._kimg;
    if (!this._kimg) this._kimg = this.ren.mk(w.cols, w.rows);
    const ctx = this._kimg.getContext("2d"), img = ctx.createImageData(w.cols, w.rows), d = img.data, sd = this.ensureSeen();
    for (let i = 0, n = w.cols * w.rows; i < n; i++) { const o = i * 4; d[o] = FOG[0]; d[o + 1] = FOG[1]; d[o + 2] = FOG[2]; d[o + 3] = fogA(opt, sd[i], today); }
    ctx.putImageData(img, 0, 0);
    this._kimgT = now; this._kimgDay = today; this._kimgOpt = opt; this.mapDirty = false;
    return this._kimg;
  };
  // ------------------------------------------------------------------ drawing a frame
  G.drawA6 = function (now) {
    const s = this.s, scr = this.screen || "world";
    if (!s) return;
    if (scr === "world" || scr === "journey") {
      const air = s.vessel && s.vessel.cls === "air", art = this.ren.art, orig = art.vessel;
      if (air) { const o = orig.bind(art); art.vessel = (k, d, c) => o(k === "boat" || k === "ship" ? "air" : k, d, c); }
      try {
        const Z = AZ.ZOOMS[this.zoomIdx ?? 4];
        if (scr === "journey") this.drawMental(now, 3, true); else if (Z.map) this.drawMental(now, Z.map, false); else { this.ren.zoom = Z.tile; this.drawTiles(now); }
      } finally { if (air) art.vessel = orig; }
    }
    const mn = Math.floor(this.shownClock() * 60); if (mn !== this._mn) { this._mn = mn; this.clockDirty = true; } // the clock window follows every minute, however it passed
    if (this.dirty) { this.dirty = false; this.hud(); }
    else if (this.clockDirty) { this.clockDirty = false; if (this.clockHud) this.clockHud(); }
    if (this.paintWindow && now - (this._winT || 0) > 180) { this._winT = now; this.paintWindow(); }
    if (scr === "world" && now - (this._pf || 0) > 60) { this._pf = now; this.ren.prefetch(s.c + 0.5, s.r + 0.5); }
  };
  G.animPos = function () {
    const s = this.s, a = this.anim, t = this.shownClock();
    if (!a || a.c1 == null || a.c1 <= a.c0) return { cx: s.c, cy: s.r, moving: false };
    const f = U.clamp((t - a.c0) / (a.c1 - a.c0), 0, 1);
    return { cx: a.from[0] + (a.to[0] - a.from[0]) * f, cy: a.from[1] + (a.to[1] - a.from[1]) * f, moving: f < 1 };
  };
  G.drawTiles = function (now) {
    const s = this.s, w = this.w, ren = this.ren, t = this.shownClock(), lat = this.lat();
    const { cx, cy, moving } = this.animPos();
    const frame = moving ? 1 + (Math.floor(now / 160) % 2) : 0;
    const sprites = [];
    if (this.sim) for (const r of this.sim.regs) if (r.a > 200 && Math.abs(r.t[0] - s.c) < 45 && Math.abs(r.t[1] - s.r) < 28 && this.inSight(r.t[0], r.t[1])) sprites.push({ img: ren.art.unit({ state: r.state, naval: false }), c: r.t[0], r: r.t[1] });
    if (s.vessel && !(s.aboard && !this.riding())) sprites.push({ img: this.vesselArt(s.vessel, "left"), c: s.vessel.c, r: s.vessel.r });
    if (s.voyage && !this.riding() && s.voyage.state === "port" && s.voyage.at && this.inSight(...s.voyage.at)) sprites.push({ img: ren.art.vessel(s.voyage.mode === "land" ? "wagon" : "ship", "left"), c: s.voyage.at[0], r: s.voyage.at[1] });
    const me = this.riding() && s.voyage.mode === "land" ? ren.art.vessel("wagon", s.dir === "left" ? "left" : "right") : s.aboard ? (this.riding() ? ren.art.vessel("ship", s.dir === "left" ? "left" : "right") : this.vesselArt(s.vessel, s.dir === "left" ? "left" : "right")) : ren.art.walker(s.dir, frame, this.tv.pal);
    sprites.push({ img: me, c: cx, r: cy });
    const cp = this.cpNext(), leg = cp && cp.legIn;
    const v = { camX: cx + 0.5, camY: cy + 0.5, sprites, lens: AZ.LENSES[this.lensIdx], light: AZ.Clock.light(t, lat), course: s.voyage && s.voyage.course ? s.voyage.course : leg ? leg.chain : null,
                goal: cp ? cp.tile : null, waypoint: s.waypoint, time: now, weather: AZ.Weather.at(w, s.c, s.r, t).kind, nights: leg && leg.nights ? leg.nights.map(n => n.tile) : null, path: s.auto && !s.voyage ? s.autoPath : null };
    ren.draw(v);
    const ctx = ren.cv.getContext("2d"), S = 16 * ren.zoom, W = ren.cv.width, H = ren.cv.height, left = v.camX - W / S / 2, top = v.camY - H / S / 2;
    this._cam = { mode: "tile", left, top, S, W, H };
    this.fogLayer(ctx, this._cam, cx, cy);
    if (this.set.reach && !s.aboard) this.drawReach(ctx, this._cam);
    this.drawLabels(ctx, this._cam, false);
    this.drawHover(ctx, this._cam);
  };
  G.drawMental = function (now, sc, journey) {
    const s = this.s, w = this.w, ren = this.ren, cv = ren.cv, ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    const { cx, cy } = this.animPos();
    const offX = journey && W > 820 ? 222 : 0, pan = (!journey && this._pan) || [0, 0];
    const left = cx + 0.5 - (W / 2 + offX) / sc - pan[0], top = cy + 0.5 - H / 2 / sc - pan[1];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = `rgb(${FOG})`; ctx.fillRect(0, 0, W, H);
    const blit = img => { const sx = Math.max(0, left), sy = Math.max(0, top), ex = Math.min(w.cols, left + W / sc), ey = Math.min(w.rows, top + H / sc); if (ex > sx && ey > sy) ctx.drawImage(img, sx, sy, ex - sx, ey - sy, (sx - left) * sc, (sy - top) * sc, (ex - sx) * sc, (ey - sy) * sc); };
    blit(ren.worldImage());
    const lens = AZ.LENSES[this.lensIdx];
    if (lens.id !== "none") { ctx.globalAlpha = 0.45; blit(ren.lensWorld(lens)); ctx.globalAlpha = 1; }
    blit(this.knowImage(now));
    const X = c => (c + 0.5 - left) * sc, Y = r => (r + 0.5 - top) * sc;
    // in sight: no veil
    const R = this.sightPx(sc);
    ctx.save(); ctx.beginPath(); ctx.arc(X(cx), Y(cy), R, 0, 7); ctx.clip(); ctx.drawImage(ren.worldImage(), Math.floor(cx - R / sc - 1), Math.floor(cy - R / sc - 1), Math.ceil(2 * R / sc + 3), Math.ceil(2 * R / sc + 3), X(Math.floor(cx - R / sc - 1)) - sc / 2, Y(Math.floor(cy - R / sc - 1)) - sc / 2, Math.ceil(2 * R / sc + 3) * sc, Math.ceil(2 * R / sc + 3) * sc); ctx.restore();
    const line = (pts, style, wdt, dash) => { if (!pts || pts.length < 2) return; ctx.strokeStyle = style; ctx.lineWidth = wdt; ctx.setLineDash(dash || []); ctx.beginPath(); pts.forEach(([c, r], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(c), Y(r))); ctx.stroke(); ctx.setLineDash([]); };
    if (this.jr) for (const sg of this.jr.segs) if (sg.moving && sg.chain) { const cur = this.cpNext() && this.cpNext().legIn === sg; line(sg.chain, cur ? "rgba(245,197,66,0.95)" : "rgba(245,197,66,0.45)", cur ? 2 : 1.2, cur ? null : [4, 4]); }
    line(s.track, "rgba(244,246,255,0.7)", 1.2, [2, 3]);
    if (s.voyage && s.voyage.course) line(s.voyage.course, "rgba(244,246,255,0.85)", 1.5);
    if (s.auto && s.autoPath) line(s.autoPath, "rgba(79,209,197,0.9)", 1.5);
    for (const l of s.leads || []) if (l && l.t) { ctx.fillStyle = "#4fd1c5"; ctx.fillRect(X(l.t[0]) - 2, Y(l.t[1]) - 2, 4, 4); }
    this._cam = { mode: "map", left, top, S: sc, W, H };
    this.drawLabels(ctx, this._cam, true);
    if (s.waypoint) { ctx.strokeStyle = "#4fd1c5"; ctx.lineWidth = 2; const x = X(s.waypoint[0]), y = Y(s.waypoint[1]); ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.stroke(); }
    if (s.vessel && !s.aboard) { ctx.fillStyle = "#fff"; ctx.fillRect(X(s.vessel.c) - 3, Y(s.vessel.r) - 3, 6, 6); }
    ctx.fillStyle = "rgba(245,197,66,0.3)"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(cx), Y(cy), 8, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f5c542"; ctx.beginPath(); ctx.arc(X(cx), Y(cy), 3, 0, 7); ctx.fill();
    this.drawHover(ctx, this._cam);
  };
  // ------------------------------------------------------------------ places you know, as labels
  G.drawLabels = function (ctx, cam, map) {
    const s = this.s, { left, top, S, W, H } = cam, today = Math.floor(this.shownClock() / 24);
    const X = c => (c + 0.5 - left) * S, Y = r => (r + 0.5 - top) * S;
    ctx.font = "12px DotGothic16, 'MS Gothic', monospace"; ctx.textBaseline = "middle";
    const box = (x, y, txt, sub, col, edge) => {
      const t1 = txt, w1 = ctx.measureText(t1).width, w2 = sub ? ctx.measureText(sub).width : 0, bw = Math.max(w1, w2 * 0.92) + 12, bh = sub ? 30 : 18;
      const bx = Math.round(x + 10), by = Math.round(y - bh / 2);
      if (bx > W || by > H || bx + bw < 0 || by + bh < 0) return;
      ctx.fillStyle = "rgba(10,12,24,0.8)"; ctx.fillRect(bx, by, bw, bh); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = col; ctx.fillText(t1, bx + 6, by + 9); if (sub) { ctx.save(); ctx.font = "11px DotGothic16, 'MS Gothic', monospace"; ctx.fillStyle = edge; ctx.fillText(sub, bx + 6, by + 22); ctx.restore(); }
    };
    const next = this.cpNext(), cpOf = {};
    if (this.jr) for (const cp of this.jr.cps) { if (cp.place.burg && cp.place.at) cpOf[`b${cp.place.burg.i}`] = cp; else cpOf[`cp${cp.i}`] = cp; }
    const focus = this.focusThread ? this.focusThread() : null, ft = focus && this.threadGoal ? this.threadGoal(focus) : null;
    const list = this.knownPlaces();
    for (const p of list) {
      const [c, r] = p.tile, x = X(c), y = Y(r);
      if (x < -150 || y < -40 || x > W + 40 || y > H + 40) continue;
      const cp = cpOf[p.key], sight = this.inSight(c, r);
      if (map && !cp && !(p.burg && (p.burg.capital || p.burg.port || p.lvl === "heard")) && S < 4 && !sight) continue;
      if (!map && sight && !cp && p.lvl === "seen" && p.burg) { ctx.fillStyle = "rgba(10,12,24,0.7)"; const tw = ctx.measureText(p.name).width; ctx.fillRect(x - tw / 2 - 4, y + S * 0.55, tw + 8, 15); ctx.fillStyle = "#f4f6ff"; ctx.fillText(p.name, x - tw / 2, y + S * 0.55 + 8); continue; }
      const heard = p.lvl === "heard";
      if (heard) { ctx.strokeStyle = "#c9b8f0"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, Math.max(8, S * (map ? 2.4 : 1.3)), 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      else if (map) { ctx.fillStyle = p.burg && p.burg.capital ? "#fff" : "rgba(244,246,255,0.8)"; ctx.fillRect(x - 2, y - 2, 4, 4); }
      const isNext = cp && next === cp, ago = today - (p.day || 0);
      const sub = cp ? `${heard ? "heard" : sight ? "in sight" : `seen${ago > 0 ? ` · ${ago} d ago` : ""}`} · ${cp.i === 0 ? "start" : `par Day ${Math.floor(cp.parArrive / 24) + 1}`}` : heard ? `heard · ${p.src}` : sight ? "" : `seen · Day ${(p.day || 0) + 1}`;
      if (map || cp || heard || !sight) box(x, y, `${isNext ? "▶ " : ""}${p.name}`, sub, cp ? "#f5c542" : heard ? "#f4f6ff" : "#f4f6ff", cp ? "#f5c542" : heard ? "#c9b8f0" : "#9be59b");
    }
    if (ft && focus) { const x = X(ft[0]), y = Y(ft[1]); ctx.strokeStyle = "#4fd1c5"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); box(x, y, `◆ ${focus.title}`, "side story", "#4fd1c5", "#4fd1c5"); }
  };
  // ------------------------------------------------------------------ hours on foot, by the paths you know
  G.walkHoursTile = function (c, r) {
    const w = this.w;
    if (!w.isLand(c, r)) return Infinity;
    const B = w.bits(c, r), b = w.P.biomes[w.C.biome[w.cell(c, r)]];
    if (B.river && !B.road && !B.trail && !w.burgAt.has(w.idx(c, r))) { const q = w.river(c, r)?.discharge || 0; if (q >= 1500) return Infinity; }
    let f = B.road ? 0.8 : B.trail ? 1 : U.clamp((b.cost || 50) / 50, 1, 4);
    const rel = w.reliefAt(c, r); if (rel && !B.road) f *= /mount/i.test(rel.icon) ? 1.6 : 1.2;
    let h = (w.miles / ((this.s.mount && this.s.mount.speed) || this.walkSpeed)) * f;
    if (B.river && !B.road && !B.trail) { const q = w.river(c, r)?.discharge || 0; h += q < 100 ? 0.5 : q < 500 ? 1.5 : 3; }
    if (!this.ensureSeen()[w.idx(c, r)]) h *= 1.3; // ground you have not seen is a guess
    return h;
  };
  G.reachMap = function () {
    const s = this.s, w = this.w, key = `${s.c},${s.r},${s.mount ? 1 : 0}`;
    if (this._reach && this._reach.key === key) return this._reach;
    const RAD = 64, N = RAD * 2 + 1, dist = new Float32Array(N * N).fill(Infinity), c0 = s.c - RAD, r0 = s.r - RAD;
    const heap = []; const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const i0 = RAD * N + RAD; dist[i0] = 0; push(0, i0);
    while (heap.length) {
      const [d, i] = pop(); if (d > dist[i] || d > 72) continue;
      const x = i % N, y = (i / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const h = this.walkHoursTile(c0 + nx, r0 + ny); if (!isFinite(h)) continue;
        const j = ny * N + nx, nd = d + h; if (nd < dist[j]) { dist[j] = nd; push(nd, j); }
      }
    }
    return (this._reach = { key, dist, N, c0, r0, RAD });
  };
  G.hoursTo = function (c, r) {
    const s = this.s, w = this.w;
    if (s.aboard) return null;
    const M = this.reachMap(), x = c - M.c0, y = r - M.r0;
    if (x >= 0 && y >= 0 && x < M.N && y < M.N && isFinite(M.dist[y * M.N + x])) return M.dist[y * M.N + x];
    if (!w.isLand(c, r)) return null;
    const p = w.path([s.c, s.r], [c, r], (cc, rr) => isFinite(this.walkHoursTile(cc, rr)), { limit: 200000, cost: (cc, rr) => this.walkHoursTile(cc, rr) });
    if (!p) return null;
    let h = 0; for (let i = 1; i < p.length; i++) h += this.walkHoursTile(...p[i]);
    return h;
  };
  G.untilDusk = function () { const t = this.shownClock(), su = AZ.Clock.sun(t, this.lat()); if (su.dl >= 24) return 24 - su.hour + 12; if (su.dl <= 0) return 0; return Math.max(0, su.set - su.hour); };
  G.drawReach = function (ctx, cam) {
    const M = this.reachMap(), budget = this.untilDusk(), { left, top, S } = cam;
    if (budget <= 0) return;
    ctx.strokeStyle = "rgba(245,197,66,0.9)"; ctx.lineWidth = 2; ctx.beginPath();
    const ok = (x, y) => x >= 0 && y >= 0 && x < M.N && y < M.N && M.dist[y * M.N + x] <= budget;
    for (let y = 0; y < M.N; y++) for (let x = 0; x < M.N; x++) {
      if (!ok(x, y)) continue;
      const X = (M.c0 + x - left) * S, Y = (M.r0 + y - top) * S;
      if (!ok(x, y - 1)) { ctx.moveTo(X, Y); ctx.lineTo(X + S, Y); }
      if (!ok(x, y + 1)) { ctx.moveTo(X, Y + S); ctx.lineTo(X + S, Y + S); }
      if (!ok(x - 1, y)) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + S); }
      if (!ok(x + 1, y)) { ctx.moveTo(X + S, Y); ctx.lineTo(X + S, Y + S); }
    }
    ctx.stroke();
  };
  G.drawHover = function (ctx, cam) {
    const hv = this._hover; if (!hv || !this.set.hours || this.s.aboard) return;
    const c = Math.floor(cam.left + hv.x / cam.S), r = Math.floor(cam.top + hv.y / cam.S);
    if (!this.w.isLand(c, r)) return;
    let h = null; const M = this.reachMap(), x = c - M.c0, y = r - M.r0;
    if (x >= 0 && y >= 0 && x < M.N && y < M.N) h = M.dist[y * M.N + x];
    const txt = h == null || !isFinite(h) ? "far: click for hours" : `${U.rn(h, 1)} h on foot${h <= this.untilDusk() ? " · before dusk" : " · after dark"}`;
    ctx.font = "12px DotGothic16, 'MS Gothic', monospace"; const tw = ctx.measureText(txt).width;
    ctx.fillStyle = "rgba(10,12,24,0.85)"; ctx.fillRect(hv.x + 14, hv.y + 10, tw + 12, 18); ctx.strokeStyle = "#f5c542"; ctx.strokeRect(hv.x + 14.5, hv.y + 10.5, tw + 11, 17);
    ctx.fillStyle = "#f5c542"; ctx.textBaseline = "middle"; ctx.fillText(txt, hv.x + 20, hv.y + 19);
  };
  // ------------------------------------------------------------------ a tile you point at
  G.tileAtScreen = function (x, y) { const cam = this._cam; if (!cam) return null; return [Math.floor(cam.left + x / cam.S), Math.floor(cam.top + y / cam.S)]; };
  G.tileCard = function (c, r) {
    const s = this.s, w = this.w, el = document.getElementById("world-card");
    if (!el || !w.inb(c, r)) return;
    const K = this.tileKnow(c, r), atlas = this.fogOpt() === "none", known = K.lvl !== "unknown" || atlas;
    const cell = w.cell(c, r), land = w.isLand(c, r);
    const place = this.knownPlaces().find(p => Math.abs(p.tile[0] - c) <= 1 && Math.abs(p.tile[1] - r) <= 1);
    const title = place ? place.name : known ? (land ? this.know.regionName(cell) : w.waterName(c, r)) : land ? "Country you have not seen" : "Water you have not seen";
    const lvl = place && place.lvl === "heard" ? `HEARD OF · ${U.esc(place.src || "")}${place.day != null ? `, DAY ${place.day + 1}` : ""}` : K.lvl === "sight" ? "IN SIGHT" : K.lvl === "seen" ? `SEEN · DAY ${K.day + 1}` : atlas ? "THE TRUE WORLD (ATLAS)" : "UNKNOWN";
    const L = [];
    if (known && land) L.push(`${U.esc(w.P.biomes[w.C.biome[cell]].name)} · ${U.esc(w.heightStr(w.h(c, r)))}${w.C.state[cell] ? ` · ${U.esc(w.P.states[w.C.state[cell]].name)}` : ""}`);
    if (place && place.burg && place.lvl === "seen") L.push(`${U.esc(U.cap((place.burg.group || "town").replace("_", " ")))}${place.burg.port ? " · harbour" : ""}`);
    const dd = this.know.dirDist(s.c, s.r, [c, r]);
    L.push(`${U.esc(dd.txt)} of you`);
    let hoursLine = "", canWalk = !s.aboard && land && !(c === s.c && r === s.r);
    if (canWalk) {
      const h = this.hoursTo(c, r), dusk = this.untilDusk();
      hoursLine = h == null ? "No way on foot that you know of." : `By the paths you know: <b>${U.rn(h, 1)} h</b> on foot. ${dusk > 0 ? `Dusk in ${U.rn(dusk, 1)} h: ${h <= dusk ? "there before dark." : "you would arrive after dark, or camp on the way."}` : "It is night."}`;
      const v = s.voyage;
      if (v && v.state === "port" && h != null) { const back = (v.departAt - this.shownClock()) - 2 * h; hoursLine += ` <span class="${back >= 0 ? "early" : "late"}">${U.esc(v.ship)} sails in ${AZ.Clock.span(v.departAt - this.shownClock())}: ${back >= 0 ? "out and back in time" : "you would miss her"}.</span>`; }
    }
    const own = s.aboard && s.vessel && !s.voyage;
    const btn = (id, label, cls = "") => `<button type="button" data-tc="${id}" class="${cls}">${label}</button>`;
    el.innerHTML = `<div class="tc-title ${place && place.lvl === "heard" ? "hook" : ""}">${U.esc(title)}</div><div class="dim small">${lvl}</div>${L.map(x => `<div>${x}</div>`).join("")}${hoursLine ? `<div>${hoursLine}</div>` : ""}
      <div class="tc-btns">${canWalk ? btn("walk", "Walk there", "gold") : ""}${own && !land ? btn("sail", "Sail there (the crew)", "gold") : ""}${btn("target", "Set as target")}${btn("close", "Close")}</div>`;
    el.classList.add("on");
    el.querySelectorAll("[data-tc]").forEach(b => (b.onclick = e => {
      e.stopPropagation();
      const id = b.dataset.tc;
      if (id === "walk") { s.waypoint = [c, r]; this.tl.heading = null; this.setAuto(true); if (s.auto) { this.tl.chosen = true; this.resume(); } }
      else if (id === "sail") { s.waypoint = [c, r]; this.sailOn({ wp: [c, r] }); }
      else if (id === "target") { s.waypoint = [c, r]; this.feedPush({ k: "routine", html: `Target set: ${U.esc(title)}.` }); }
      el.classList.remove("on"); this.dirty = true;
    }));
  };
})();
