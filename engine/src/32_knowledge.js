// =============================================================================================
// 32_knowledge.js · Alpha 6: what you know.
//   The character sees only what he carries or remembers. Every place, price and sailing he knows
//   carries a level (in sight, seen, heard of), a date and a source. Documents are exact while
//   carried (the notebook, copied handbills) or present (the sailings board, the market); everything
//   else is memory: prices stay exact for three weeks and then read as cheap, usual or dear;
//   sailings stay exact for two weeks and then read as "about weekly"; news keeps its date; ground
//   seen fades on the map with age. Writing in the notebook keeps figures exact.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U;
  AZ.BLUR = { priceDays: 21, sailDays: 14 };
  G.kn = function () {
    const s = this.s;
    s.kn = s.kn || {};
    for (const k of ["places", "prices", "notebook", "boards"]) s.kn[k] = s.kn[k] || {};
    s.kn.docs = s.kn.docs || [];
    return s.kn;
  };
  // ------------------------------------------------------------------ ground seen, by day (0 = never)
  G.ensureSeen = function () {
    const w = this.w;
    if (!this.seenDay || this.seenDay.length !== w.cols * w.rows) this.seenDay = new Uint16Array(w.cols * w.rows);
    return this.seenDay;
  };
  const reveal6 = G.reveal;
  G.reveal = function () {
    reveal6.call(this);
    const s = this.s, w = this.w;
    if (!s || !this.know) return;
    const sd = this.ensureSeen(), R = this.know.sightTiles(s.c, s.r, s.aboard), d = Math.min(65535, Math.floor(s.clock / 24) + 1);
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
      if (dc * dc + dr * dr > R * R) continue;
      const c = s.c + dc, r = s.r + dr;
      if (w.inb(c, r)) sd[w.idx(c, r)] = d;
    }
    if (this.fogTouch) this.fogTouch(s.c, s.r, R);
  };
  G.tileKnow = function (c, r) { // "sight" | "seen" | "unknown", with the day it was seen
    const s = this.s, w = this.w;
    if (!w.inb(c, r)) return { lvl: "unknown" };
    const R = this.know.sightTiles(s.c, s.r, s.aboard);
    if ((c - s.c) ** 2 + (r - s.r) ** 2 <= R * R) return { lvl: "sight" };
    const d = this.ensureSeen()[w.idx(c, r)];
    return d ? { lvl: "seen", day: d - 1 } : { lvl: "unknown" };
  };
  const rle = a => { const out = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i] && j - i < 1e6) j++; out.push(a[i], j - i); i = j; } return out; };
  const save6 = G.saveGame;
  G.saveGame = function () {
    const ok = save6.call(this);
    if (ok && this.seenDay) { try { this.store.setItem(this.key + ":sd", JSON.stringify(rle(this.seenDay))); } catch (e) { /* full */ } }
    return ok;
  };
  const load6 = G.loadGame;
  G.loadGame = function () {
    const ok = load6.call(this);
    if (!ok) return ok;
    const sd = this.ensureSeen(); sd.fill(0);
    let runs = null;
    try { runs = JSON.parse(this.store.getItem(this.key + ":sd") || "null"); } catch (e) { runs = null; }
    if (runs && runs.length) { let o = 0; for (let k = 0; k < runs.length; k += 2) { sd.fill(runs[k], o, o + runs[k + 1]); o += runs[k + 1]; } }
    else { const d = Math.floor(this.s.clock / 24) + 1; for (let i = 0; i < sd.length; i++) if (this.isExplored(i)) sd[i] = d; } // saves from before Alpha 6
    this.kn();
    if (this.fogReset) this.fogReset();
    return ok;
  };
  const fresh6 = G.fresh;
  G.fresh = function (...a) {
    const r = fresh6.apply(this, a), s = this.s;
    this.ensureSeen().fill(0);
    s.kn = null; this.kn(); s.feed = []; s.dayLog = null; s.track = [[s.c, s.r]];
    this.reveal();
    if (this.jr) for (const cp of this.jr.cps) {
      const b = cp.place.burg;
      if (b && cp.place.at) this.knowPlace(`b${b.i}`, cp.i === 0 ? "seen" : "heard", cp.i === 0 ? "you set out from here" : "the journey's plan");
      else this.knowPlace(`cp${cp.i}`, "heard", "the journey's plan", { name: cp.place.name, t: cp.tile });
    }
    const home = this.tv && this.tv.home;
    if (home && home.i != null) this.knowPlace(`b${home.i}`, "seen", "home");
    if (this.fogReset) this.fogReset();
    return r;
  };
  // ------------------------------------------------------------------ places
  G.knowPlace = function (key, lvl, src, extra = {}) {
    if (!this.s) return null;
    const K = this.kn().places, p = K[key];
    if (p && p.lvl === "seen" && lvl === "heard") return p;
    if (p && p.lvl === lvl && lvl === "heard") return p; // the first word of a place is the one remembered
    K[key] = { ...(p || {}), name: extra.name, t: extra.t, lvl, day: Math.floor(this.s.clock / 24), src: src || (p && p.src) || "" };
    if (!K[key].name) delete K[key].name;
    if (!K[key].t) delete K[key].t;
    this.mapDirty = true;
    return K[key];
  };
  G.placeOf = function (key) { // name and tile of a known place
    const w = this.w, p = this.kn().places[key];
    if (!p) return null;
    if (key[0] === "b") { const b = w.P.burgs[+key.slice(1)]; return b ? { ...p, name: b.name, tile: b.t, burg: b, port: !!b.port } : null; }
    if (key[0] === "m") { const m = w.P.markers.find(x => x && x.i === +key.slice(1)); return m ? { ...p, name: m.name, tile: m.t, marker: m } : null; }
    return p.t ? { ...p, tile: p.t } : null;
  };
  G.knownPlaces = function () { return Object.keys(this.kn().places).map(k => ({ key: k, ...this.placeOf(k) })).filter(p => p.tile); };
  const after7 = G.afterStep;
  G.afterStep = function (...a) {
    const r = after7.apply(this, a), s = this.s, w = this.w;
    if (!s || !this.know) return r;
    const R = this.know.sightTiles(s.c, s.r, s.aboard);
    for (const n of w.near(s.c, s.r, R)) {
      if (n.kind === "burg") this.knowPlace(`b${n.o.i}`, "seen", n.d < 0.5 ? "you were there" : "seen from the road");
      else if (n.kind === "marker") this.knowPlace(`m${n.o.i}`, "seen", "seen");
    }
    return r;
  };
  const lead6 = G.addLead;
  G.addLead = function (l) {
    const ok = lead6.call(this, l);
    if (ok && l && l.t && this.s) {
      const near = this.w.near(l.t[0], l.t[1], 0.6).find(n => n.kind === "burg");
      if (/^m\d+$/.test(l.key)) this.knowPlace(l.key, l.from === "sighted" ? "seen" : "heard", l.from);
      else if (near) this.knowPlace(`b${near.o.i}`, "heard", l.from);
      else this.knowPlace(`L${l.key}`, "heard", l.from, { name: l.name, t: l.t });
    }
    return ok;
  };
  const thr6 = G.startThread;
  G.startThread = function (def, ...a) {
    const r = thr6.call(this, def, ...a);
    try { for (const st of (def && def.steps) || []) { const b = st.goal && st.goal.burg != null ? this.w.P.burgs[st.goal.burg] : null; if (b) this.knowPlace(`b${b.i}`, "heard", `side story: ${def.title}`); } } catch (e) { /* a thread without places */ }
    return r;
  };
  // ------------------------------------------------------------------ prices and sailings
  G.notePricesSeen = function (b) {
    const goods = {};
    for (const g of this.w.P.goods) { let q = null; try { q = this.goodQuote(b, g.i); } catch (e) { q = null; } if (q && (q.canBuy || q.made)) goods[g.i] = U.rn(q.buy, 2); }
    this.kn().prices[b.i] = { t: this.s.clock, at: b.name, ration: AZ.Prices.ration(this.w, b), goods };
  };
  const market6 = G.market;
  G.market = async function (b) { this.notePricesSeen(b); this.knowPlace(`b${b.i}`, "seen", "you were there"); return market6.call(this, b); };
  G.noteBoard = function (b) {
    const s = this.s, w = this.w, lines = [];
    try {
      if (this.sim) for (const d of this.sim.departures(b, s.clock).filter(d => d.t > s.clock).slice(0, 12)) { const L = d.L; lines.push({ ship: L.ship, to: w.P.burgs[L.to]?.name, toB: L.to, dep: d.t, every: L.period, mode: L.mode, ok: d.ok !== false }); }
      else if (this.shipOffers) for (const o of this.shipOffers(b) || []) lines.push({ ship: o.ship, to: o.dest && o.dest.name, toB: o.dest && o.dest.i, dep: o.departAt, mode: "sea", fare: o.fare, ok: true });
    } catch (e) { /* no harbour */ }
    this.kn().boards[b.i] = { t: s.clock, at: b.name, lines };
  };
  const harb6 = G.harbour;
  G.harbour = async function (b) { this.noteBoard(b); return harb6.call(this, b); };
  // a world median for each good, to say what a remembered price was like
  G.medianPrice = function (gid) {
    this._med = this._med || {};
    if (this._med[gid] !== undefined) return this._med[gid];
    const bs = this.w.P.burgs.filter(Boolean), step = Math.max(1, Math.floor(bs.length / 120)), xs = [];
    for (let i = 0; i < bs.length; i += step) { let q = null; try { q = gid === "ration" ? AZ.Prices.ration(this.w, bs[i]) : this.goodQuote(bs[i], +gid); } catch (e) { q = null; } const v = q == null ? null : typeof q === "number" ? q : q.buy; if (v) xs.push(v); }
    xs.sort((a, b) => a - b);
    return (this._med[gid] = xs.length ? xs[Math.floor(xs.length / 2)] : null);
  };
  G.priceWord = function (gid, v) { const m = this.medianPrice(gid); if (!m || !v) return "?"; const r = v / m; return r < 0.8 ? "cheap" : r > 1.25 ? "dear" : "about usual"; };
  G.goodName = function (gid) { return (this.w.P.goods.find(g => g.i === +gid) || {}).name || "goods"; };
  // what is exact, and from where: the notebook, a document present here, or memory (dated, blurring)
  G.priceView = function (bi) {
    const K = this.kn(), now = this.s.clock, nb = K.notebook[bi], mem = K.prices[bi], here = this.burgHere && this.burgHere();
    const present = here && here.i === +bi && mem && now - mem.t < 24;
    if (present) return { src: "the market, today", exact: true, rec: mem };
    if (nb && (!mem || nb.t >= mem.t - 1)) return { src: `your notebook, ${AZ.Clock.fmt(nb.t)}`, exact: true, rec: nb };
    if (mem && now - mem.t <= AZ.BLUR.priceDays * 24) return { src: `remembered from ${AZ.Clock.fmt(mem.t)}`, exact: true, rec: mem };
    if (mem) return { src: `remembered from ${AZ.Clock.fmt(mem.t)}; the figures have blurred`, exact: false, rec: mem, nb };
    if (nb) return { src: `your notebook, ${AZ.Clock.fmt(nb.t)}`, exact: true, rec: nb };
    return null;
  };
  G.boardView = function (bi) {
    const K = this.kn(), now = this.s.clock, bd = K.boards[bi], here = this.burgHere && this.burgHere();
    const bill = K.docs.filter(d => d.kind === "handbill" && d.bi === +bi).sort((a, b) => b.t - a.t)[0];
    if (here && here.i === +bi && bd && now - bd.t < 24) return { src: "the sailings board, here and now", exact: true, rec: bd };
    if (bill && (!bd || bill.t >= bd.t - 1)) return { src: `your copied handbill, ${AZ.Clock.fmt(bill.t)}`, exact: true, rec: bill };
    if (bd && now - bd.t <= AZ.BLUR.sailDays * 24) return { src: `remembered from ${AZ.Clock.fmt(bd.t)}`, exact: true, rec: bd };
    if (bd) return { src: `remembered from ${AZ.Clock.fmt(bd.t)}; the dates have blurred`, exact: false, rec: bd };
    return null;
  };
  AZ.oftenWords = d => (!d ? "now and then" : d <= 2 ? "every day or two" : d <= 5 ? "twice a week or so" : d <= 9 ? "about weekly" : d <= 18 ? "every fortnight or so" : "about monthly");
  // ------------------------------------------------------------------ the notebook and handbills
  G.notebookPending = function () {
    const K = this.kn(), now = this.s.clock;
    return Object.entries(K.prices).filter(([bi, p]) => now - p.t <= AZ.BLUR.priceDays * 24 && (!K.notebook[bi] || K.notebook[bi].t < p.t)).map(([bi]) => +bi);
  };
  G.writeNotebook = function () {
    const K = this.kn(), list = this.notebookPending();
    for (const bi of list) K.notebook[bi] = JSON.parse(JSON.stringify(K.prices[bi]));
    this.feedPush({ k: "note", html: list.length ? `You write up your notebook: prices at ${list.map(bi => U.esc(this.w.P.burgs[bi].name)).join(", ")}, exact.` : "Your notebook is up to date.", cls: "teal" });
    return list.length;
  };
  G.boardHere = function () { const b = this.burgHere && this.burgHere(), bd = b && this.kn().boards[b.i]; return bd && this.s.clock - bd.t < 24 && bd.lines.length ? { b, bd } : null; };
  G.copyBoard = function () {
    const h = this.boardHere(); if (!h) return false;
    const K = this.kn();
    K.docs.push({ kind: "handbill", bi: h.b.i, at: h.b.name, t: h.bd.t, lines: h.bd.lines.slice(0, 12) });
    if (K.docs.length > 40) K.docs.splice(0, K.docs.length - 40);
    this.feedPush({ k: "note", html: `You copy the sailings board at ${U.esc(h.b.name)} onto a handbill: ${h.bd.lines.length} departures, exact.`, cls: "teal" });
    return true;
  };
})();
