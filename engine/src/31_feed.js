// =============================================================================================
// 31_feed.js · Alpha 6: one voice.
//   Every message passes the narrator, which files it as a decision (a card that needs an answer),
//   a scene (a card, if Settings stop for scenes), a note (into the feed) or routine (folded into
//   the day card). A day card is filed at dusk: miles, where, weather, food, one story line and the
//   race. No sentence is filed twice in a day.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U;
  const plain = h => String(h == null ? "" : h).replace(/<span class="tag[^>]*>[^<]*<\/span>/g, "").replace(/<(br|div|\/div|p|\/p|li|tr|\/td)[^>]*>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  AZ.plain = plain;
  AZ.firstSentence = t => { const parts = String(t).split(/(?<=[.!?”])\s+/); let out = parts[0] || ""; for (let i = 1; i < parts.length && out.length < 40; i++) out += " " + parts[i]; return out.length > 200 ? out.slice(0, 197) + "…" : out; };
  const ROUTINE = /^(\d+ ?(h|d|hours?|days?)\b|Aboard the|Back aboard|Weather:|Waypoint reached|Lens:|Days pass|Normal pace|Holding|Sailing on|You turn in below|At anchor until dawn|Saved|Autopilot|Two days' rest|The crew sails on through the night)/i;

  G.feedPush = function (e) {
    const s = this.s;
    if (!s) return false;
    s.feed = s.feed || [];
    const t = e.t != null ? e.t : this.shownClock ? this.shownClock() : s.clock, day = Math.floor(t / 24);
    const key = plain(e.html).replace(/^(On the move|Tents|Sails|Sighted|Weather|News in [^:]{1,30}): /, "").slice(0, 160);
    if (!key) return false;
    if (e.k !== "day" && s.feed.some(x => x.day === day && x.key === key)) return false; // never the same sentence twice in a day
    const html = String(e.html).length > 900 ? `${plain(e.html).slice(0, 600)}…` : String(e.html);
    s.feed.push({ k: e.k || "note", t, day, key, html, cls: e.cls || "", track: e.track });
    if (s.feed.length > 320) s.feed.splice(0, s.feed.length - 320);
    if (e.k === "scene" || (e.k === "note" && /teal|gold/.test(e.cls || ""))) { const d = this.dayLog(); if (!d.line) { const ln = AZ.firstSentence(e.line || plain(e.html).replace(/\s*\(\d+ pages\)\s*$/, "")); if (ln.length >= 30) d.line = ln; } }
    this.feedDirty = true; this.dirty = true;
    return true;
  };
  // a toast becomes a note, or routine; the reason a step was refused is a passing hint
  G.feedNote = function (html, cls = "") {
    if (this._why && plain(html) === plain(this._why)) { this._why = null; return this.hint(html); }
    const p = plain(html), k = ROUTINE.test(p) ? "routine" : "note";
    const ok = this.feedPush({ k, html, cls });
    if (ok && k === "note" && this.set && this.set.stopNotes && this.tl) { this.tl.paused = true; this.hint(`${html} · paused`); }
  };
  const pass6 = G.passable;
  G.passable = function (c, r) { const p = pass6.call(this, c, r); if (p && !p.ok) this._why = p.why; return p; };

  // ------------------------------------------------------------------ the day's record and its card
  G.dayLog = function () {
    const s = this.s;
    if (!s.dayLog) s.dayLog = { t0: s.clock, miles: 0, places: [], wx: [], food: 0, line: "" };
    return s.dayLog;
  };
  G.whereWords = function () {
    const s = this.s, w = this.w, cell = w.cell(s.c, s.r), b = this.burgHere ? this.burgHere() : null;
    if (b) return w.burgAt.get(w.idx(s.c, s.r)) ? `at ${b.name}` : `in ${b.name} harbour`;
    if (w.isLand(s.c, s.r)) return `in ${w.C.province[cell] ? w.P.provinces[w.C.province[cell]].name : w.C.state[cell] ? w.P.states[w.C.state[cell]].name : "the neutral lands"}`;
    const near = w.near(s.c, s.r, 6).find(n => n.kind === "burg");
    return `on the ${w.waterName(s.c, s.r).replace(/^the /i, "")}${near ? `, ${U.num(Math.max(1, Math.round(near.d * w.miles)))} mi off ${near.o.name}` : ""}`;
  };
  AZ.spanWords = h => { h = Math.abs(h); return h < 5 ? "a few hours" : h < 9 ? "a quarter of a day" : h < 18 ? "about half a day" : h < 36 ? "about a day" : `about ${Math.round(h / 24)} days`; };
  G.paceWords = function (r) {
    r = r || (this.raceStatus ? this.raceStatus() : null);
    if (!r) return "";
    const tol = ((r.rule && r.rule.tol) || 1) * 24;
    return Math.abs(r.ahead) <= Math.min(tol, 12) ? "on par" : r.ahead > 0 ? `${AZ.spanWords(r.ahead)} ahead` : `${AZ.spanWords(r.ahead)} behind`;
  };
  G.fileDayCard = function (at) {
    const s = this.s, d = this.dayLog();
    const reset = () => { s.dayLog = { t0: at, miles: 0, places: [], wx: [], food: 0, line: "" }; };
    if (d.miles < 0.5 && !d.line && !d.places.length) return reset(); // a still day needs no card
    const pace = this.paceWords();
    const parts = [`${U.num(Math.round(d.miles))} mi`, this.whereWords(), d.wx.length ? d.wx.slice(-2).join(", then ") : "", d.food ? U.plural(d.food, "ration") : "", pace ? `⏱ ${pace}` : ""].filter(Boolean);
    const html = `<b class="hook">Day ${Math.floor(at / 24) + 1}</b> · ${parts.map(x => U.esc(x)).join(" · ")}${d.places.length ? `<div class="dim">Into ${U.esc(d.places.slice(0, 4).join(", "))}</div>` : ""}${d.line ? `<div>${U.esc(d.line)}</div>` : ""}`;
    this.feedPush({ k: "day", html, t: at, track: [s.c, s.r] });
    reset();
  };
  const nd6 = G.newDay;
  G.newDay = function () { const f0 = this.s.sup.food, r = nd6.call(this); if (this.s.dayLog) this.s.dayLog.food += Math.max(0, f0 - this.s.sup.food); return r; };
  const tick6 = G.tick;
  G.tick = function () {
    const s = this.s, k0 = s && s.wxKind, r = tick6.call(this);
    if (s && s.wxKind && s.wxKind !== k0 && this.a6) { const wx = this.weather(); const d = this.dayLog(); if (!d.wx.includes(wx.label)) d.wx.push(wx.label); }
    return r;
  };

  // ------------------------------------------------------------------ the wrappers: every window passes the narrator
  AZ.installNarrator = function (g) {
    const ui = g.ui, say0 = ui.say.bind(ui), choose0 = ui.choose.bind(ui), banner0 = ui.banner.bind(ui);
    ui.toast = (html, cls) => { if (g.a6 && g.screen === "story" && g._opt && g.infoAdd) g.infoAdd(html); return g.feedNote(html, cls); };
    ui.banner = (title, sub) => { if (g.s && g.a6) { const d = g.dayLog(), tt = plain(title); if (tt && !d.places.includes(tt) && !/harbour$/.test(tt)) d.places.push(tt); } return banner0(title, sub); };
    ui.say = async (pages, who) => {
      const routed = g.storySay ? g.storySay(pages, who) : null; // on Story, an option answers in the Information panel
      if (routed) return routed;
      await g.playout();
      const list = (Array.isArray(pages) ? pages : [pages]).flat().filter(p => p != null && p !== "").map(String);
      if (!list.length) return;
      const ln = list.map(x => plain(x)).find(x => x.length >= 40) || "";
      g.feedPush({ k: "scene", line: ln, html: `${who ? `<b>${who}</b>: ` : ""}${list[0]}${list.length > 1 ? ` <span class="dim">(${list.length} pages)</span>` : ""}`, cls: /hook/.test(list[0]) ? "gold" : "" });
      // scenes off: the page goes to the feed and play goes on; the journey's own pages always stop
      if (g.set && !g.set.stopScenes && !/class="hook"|★|Checkpoint|complete|report card/i.test(list.join(" "))) return;
      return say0(pages, who);
    };
    ui.choose = async (prompt, options, opts = {}) => {
      const host = g.hostFor ? g.hostFor(prompt, options) : null;
      let k;
      if (host) k = await g.hostChoose(host, prompt, options, opts);
      else { const r = g.storyChoose ? g.storyChoose(prompt, options, opts) : null; if (r) k = await r; else { await g.playout(); k = await choose0(prompt, options, opts); } }
      const o = options[k];
      if (o && !host) g.feedPush({ k: "routine", html: `${plain(prompt).slice(0, 90)} → ${plain(o.label).slice(0, 90)}` });
      if (g.tl) g.tl.chosen = true;
      return k;
    };
  };
})();
