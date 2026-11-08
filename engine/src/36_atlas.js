// =============================================================================================
// 36_atlas.js · Alpha 7: the atlas.
//   A book that fills as you travel: the peoples and faiths you have met, the realms you have
//   crossed and how they stand to one another, the towns you have seen, the trade lines and
//   markets you know, the marked places you have visited, the lands you have walked. Each page
//   counts what you have found against what the world holds, and draws what it can.
// =============================================================================================
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const $ = id => document.getElementById(id);
  const real = a => a.filter(x => x != null && x > 0);
  const STANCE = { Ally: "#7ee08a", Friendly: "#b8e07e", Neutral: null, Unknown: null, Suspicion: "#e0c27e", Rival: "#f0a060", Enemy: "#ff6e5a", Vassal: "#8fb8ff", Suzerain: "#8fb8ff" };

  G.atlasPages = function () {
    const s = this.s, P = this.w.P, live = l => l.filter(x => x && x.i && !x.removed).length;
    return [
      { id: "peoples", name: "Peoples", got: real(s.seen.cu).length, of: live(P.cultures) },
      { id: "faiths", name: "Faiths", got: real(s.seen.re).length, of: live(P.religions) },
      { id: "realms", name: "Realms", got: real(s.seen.st).length, of: live(P.states) },
      { id: "towns", name: "Towns", got: s.seen.b.length, of: P.burgs.filter(Boolean).length },
      { id: "trade", name: "Trade and lines", got: Object.keys(s.lineSeen || {}).length, of: this.sim ? this.sim.lines.length : 0 },
      { id: "places", name: "Marked places", got: s.done_m.length, of: P.markers.length },
      { id: "lands", name: "Lands", got: real(s.seen.bi).length, of: P.biomes.filter(b => b && b.i).length },
    ];
  };
  G.renderAtlas = function (body) {
    const pages = this.atlasPages();
    this._aSel = U.clamp(this._aSel || 0, 0, pages.length - 1);
    const p = pages[this._aSel];
    body.innerHTML = `<ul class="jlist alist">${pages.map((x, i) => `<li data-i="${i}" class="${i === this._aSel ? "sel" : ""}"><span>${x.name}</span><span class="bar"><i style="width:${x.of ? Math.round((100 * x.got) / x.of) : 0}%"></i></span><span class="dim">${x.got} of ${x.of}</span></li>`).join("")}</ul><div class="jdetail atlas" id="apage"></div>`;
    body.querySelectorAll(".alist li").forEach(li => (li.onclick = () => { this._aSel = +li.dataset.i; this.renderAtlas(body); }));
    $("apage").innerHTML = `<h3>${p.name}</h3>` + (this[`atlas_${p.id}`] ? this[`atlas_${p.id}`]() : "");
    const cv = $("acv");
    if (cv && this[`atlasDraw_${p.id}`]) this[`atlasDraw_${p.id}`](cv);
  };
  G.atlasKey = function (e) {
    const k = e.key, n = this.atlasPages().length;
    if (k === "ArrowUp" || k === "w" || k === "W") { this._aSel = (this._aSel - 1 + n) % n; this.renderAtlas($("mbody")); return true; }
    if (k === "ArrowDown" || k === "s" || k === "S") { this._aSel = (this._aSel + 1) % n; this.renderAtlas($("mbody")); return true; }
    return false;
  };
  const sw = col => `<span class="sw" style="background:${U.esc(col || "#888")}"></span>`;
  const empty = what => `<p class="dim">Nothing yet. ${what}</p>`;

  G.atlas_peoples = function () {
    const s = this.s, P = this.w.P, ids = real(s.seen.cu);
    if (!ids.length) return empty("Peoples are entered when you walk their country.");
    return `<ul class="cards">${ids.map(i => { const c = P.cultures[i], n = P.burgs.filter(b => b && b.culture === i).length; return `<li>${sw(c.color)}<b>${U.esc(c.name)}</b> <span class="dim">${U.esc(c.type || "")} · ${n} towns${i === this.tv.culture ? " · your people" : ""}</span> ${T("data")}</li>`; }).join("")}</ul>`;
  };
  G.atlas_faiths = function () {
    const s = this.s, P = this.w.P, ids = real(s.seen.re);
    if (!ids.length) return empty("Faiths are entered when you walk where they are kept.");
    return `<ul class="cards">${ids.map(i => { const r = P.religions[i], seat = P.burgs.find(b => b && b.cell === r.center), been = seat && s.seen.b.includes(seat.i);
      return `<li>${sw(r.color)}<b>${U.esc(r.name)}</b> <span class="dim">${U.esc(r.type || "")}${r.form ? `, ${U.esc(r.form)}` : ""}${r.deity ? ` · ${U.esc(r.deity)}` : ""}</span><br><span class="${been ? "hook" : "dim"}">Seat: ${seat ? U.esc(seat.name) : "none"}${been ? " (you have been there)" : ""}</span>${i === this.tv.faith ? " · your faith" : ""} ${T("data")}</li>`; }).join("")}</ul>`;
  };
  G.atlas_realms = function () {
    const s = this.s, P = this.w.P, ids = real(s.seen.st);
    if (!ids.length) return empty("Realms are entered when you cross into them.");
    return `<canvas id="acv" width="360" height="240"></canvas><p class="dim">How the realms you know stand to one another: green allies and friends, orange rivals, red enemies ${T("data")}.</p>` +
      `<ul class="cards">${ids.map(i => { const st = P.states[i], wars = (st.campaigns || []).filter(c => c.end == null); return `<li>${sw(st.color)}<b>${U.esc(st.fullName || st.name)}</b> <span class="dim">${U.esc(st.form || "")} · capital ${U.esc(P.burgs[st.capital]?.name || "?")}</span>${wars.length ? `<br><span class="late">At war: ${wars.map(c => U.esc(c.name)).join(", ")}</span>` : ""}</li>`; }).join("")}</ul>`;
  };
  G.atlasDraw_realms = function (cv) {
    const s = this.s, P = this.w.P, ids = real(s.seen.st), ctx = cv.getContext("2d"), W = cv.width, H = cv.height, n = ids.length;
    const pos = new Map(ids.map((id, k) => [id, [W / 2 + Math.cos((2 * Math.PI * k) / n - Math.PI / 2) * (W / 2 - 60) * (n > 1 ? 1 : 0), H / 2 + Math.sin((2 * Math.PI * k) / n - Math.PI / 2) * (H / 2 - 30) * (n > 1 ? 1 : 0)]]));
    ctx.clearRect(0, 0, W, H); ctx.lineWidth = 2;
    for (const a of ids) for (const b of ids) if (a < b) { const col = STANCE[P.states[a].diplomacy?.[b]]; if (!col) continue; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(...pos.get(a)); ctx.lineTo(...pos.get(b)); ctx.stroke(); }
    ctx.font = "12px DotGothic16, monospace"; ctx.textAlign = "center";
    for (const id of ids) { const [x, y] = pos.get(id); ctx.fillStyle = P.states[id].color || "#888"; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.strokeRect(x - 6, y - 6, 12, 12); ctx.fillStyle = "#f4f6ff"; ctx.fillText(P.states[id].name, x, y + 20); }
  };
  G.atlas_towns = function () {
    const s = this.s, P = this.w.P, list = s.seen.b.map(i => P.burgs[i]).filter(Boolean).sort((a, c) => c.population - a.population);
    if (!list.length) return empty("Towns are entered when you reach them.");
    return `<canvas id="acv" width="360" height="200"></canvas><ul class="cards">${list.slice(0, 40).map(b => `<li><b>${U.esc(b.name)}</b> <span class="dim">${U.esc(b.group)} · ${U.esc(b.type)} · ${U.esc(P.states[b.state]?.name || "unclaimed")}${b.port ? " · port" : ""}</span></li>`).join("")}</ul>`;
  };
  G.atlasMini = function (cv) {
    const w = this.w, ctx = cv.getContext("2d"), sc = Math.min(cv.width / w.cols, cv.height / w.rows);
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 0.7; ctx.drawImage(this.ren.worldImage(), 0, 0, w.cols * sc, w.rows * sc); ctx.globalAlpha = 1;
    return t => [(t[0] + 0.5) * sc, (t[1] + 0.5) * sc];
  };
  G.atlasDraw_towns = function (cv) {
    const at = this.atlasMini(cv), ctx = cv.getContext("2d");
    for (const i of this.s.seen.b) { const b = this.w.P.burgs[i]; if (!b) continue; const [x, y] = at(b.t); ctx.fillStyle = "#fff"; ctx.fillRect(x - 2, y - 2, 4, 4); }
  };
  G.atlas_trade = function () {
    const s = this.s, P = this.w.P, book = Object.values(s.priceBook || {});
    const lines = Object.keys(s.lineSeen || {}).length;
    return `<canvas id="acv" width="360" height="200"></canvas><p class="dim">${lines ? `${lines} lines you have read on timetables or heard of: blue by sea, tan by road, red dashed where they stand still` : "Read timetables at harbours and coach offices to fill this page"} ${T("mixed")}.</p>` +
      (book.length ? `<h4>Markets you have seen</h4><ul class="cards">${book.slice(-20).reverse().map(x => `<li><b>${U.esc(x.at)}</b> <span class="dim">a day's food 🟡 ${x.ration} · ${x.rations} rations to spare · ${U.esc(x.season || "")} · ${AZ.Clock.fmt(x.t)}</span></li>`).join("")}</ul>` : empty("Markets are entered when you visit them."));
  };
  G.atlasDraw_trade = function (cv) {
    const at = this.atlasMini(cv), ctx = cv.getContext("2d"), P = this.w.P;
    if (!this.sim) return;
    for (const [id, seen] of Object.entries(this.s.lineSeen || {})) {
      const L = this.sim.lines[+id]; if (!L) continue;
      ctx.strokeStyle = !seen.ok ? "rgba(255,110,90,0.9)" : L.mode === "sea" ? "rgba(140,220,255,0.9)" : "rgba(230,190,120,0.95)";
      ctx.setLineDash(seen.ok ? [] : [3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...at(P.burgs[L.from].t)); ctx.lineTo(...at(P.burgs[L.to].t)); ctx.stroke(); ctx.setLineDash([]);
    }
  };
  G.atlas_places = function () {
    const s = this.s, P = this.w.P, by = new Map();
    for (const m of P.markers) { const o = by.get(m.type) || { got: [], of: 0 }; o.of++; if (s.done_m.includes(m.i)) o.got.push(m); by.set(m.type, o); }
    const rows = [...by.entries()].sort((a, c) => c[1].got.length - a[1].got.length || a[0].localeCompare(c[0]));
    return `<ul class="cards">${rows.map(([type, o]) => `<li><b>${U.esc(U.cap(type.replace(/-/g, " ")))}</b> <span class="dim">${o.got.length} of ${o.of}</span>${o.got.length ? `<br>${o.got.slice(0, 6).map(m => U.esc(m.name)).join(", ")}` : ""}</li>`).join("")}</ul>`;
  };
  G.atlas_lands = function () {
    const s = this.s, P = this.w.P, ids = real(s.seen.bi);
    if (!ids.length) return empty("Lands are entered as you walk them.");
    return `<ul class="cards">${ids.map(i => { const b = P.biomes[i]; return `<li>${sw(b.color)}<b>${U.esc(b.name)}</b> <span class="dim">habitability ${b.habitability} · the going ${b.cost <= 50 ? "easy" : b.cost <= 100 ? "slow" : "hard"} (move cost ${b.cost})</span> ${T("data")}</li>`; }).join("")}</ul>`;
  };
})();
