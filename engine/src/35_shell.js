// =============================================================================================
// 35_shell.js · Alpha 7: the shell.
//   The tile map is always on screen. Around it: the objective (top left), the minimap (top right),
//   the clock, purse and food (bottom left), the journey under way (top centre) and the viewing
//   window, which V swings on and off (bottom right). Esc opens the menu, a window of five tabs:
//   Status, Items, Journal, Map and Atlas (36_atlas). Information comes from people and signs; the
//   menu shows what you have and what you have learned.
// =============================================================================================
AZ.VERSION = "azrpg Alpha 7";
(() => {
  const G = AZ.Game.prototype, U = AZ.U, T = AZ.T;
  const $ = id => document.getElementById(id);
  const TABS = [["status", "Status"], ["items", "Items"], ["journal", "Journal"], ["map", "Map"], ["atlas", "Atlas"]];
  const PH = { day: "☀", dawn: "◐", dusk: "◑", night: "☾" };
  const ZOOMS = [1, 2.5, 6];

  // ------------------------------------------------------------------ boot
  AZ.boot = async function (packText) {
    const status = $("status");
    try {
      const P = await AZ.loadPack(packText);
      const w = new AZ.World(P);
      const mk = (W, H) => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
      const art = new AZ.Art(w, mk), cv = $("view"), ren = new AZ.Renderer(w, art, cv, mk);
      let store;
      try { store = window.localStorage; store.getItem("x"); } catch (e) { store = { getItem: () => null, setItem: () => {} }; }
      const g = new AZ.Game(w, ren, new AZ.UI(), null, store);
      AZ.game = g;
      const fit = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; g.dirty = true; g._titleDrawn = false; if (g._tab === "map" && $("menu").classList.contains("on")) g.renderMenu(); };
      window.addEventListener("resize", fit); fit();
      window.addEventListener("beforeunload", () => g.saveGame());
      status.remove();
      g.bindInput();
      g.title();
      const loop = now => { try { g.frame(now); g.shellFrame(now); } catch (e) { console.error(e); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    } catch (err) { status.textContent = "The world could not be loaded: " + err.message; console.error(err); }
  };

  // ------------------------------------------------------------------ input
  G.bindInput = function () {
    const g = this, ui = this.ui;
    const DK = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
    const CMD = { " ": "act", Enter: "act", z: "act", Z: "act", Escape: "menu", x: "menu", X: "menu", m: "map", M: "map", j: "journal", J: "journal", i: "items", I: "items", c: "status", C: "status",
      1: "status", 2: "items", 3: "journal", 4: "map", 5: "atlas", f: "trip", F: "trip", r: "rest", R: "rest", l: "look", L: "look", v: "view", V: "view", h: "help", H: "help", "?": "help", "+": "zin", "=": "zin", "-": "zout", _: "zout" };
    const press = d => {
      if (!g.s || ui.busy()) return;
      if (g.riding()) { ui.toast("You are a passenger. Space for the options."); return; }
      if (g.s.auto) g.stopTrip("You stop and take the lead.");
      if (!g.held.includes(d)) g.held.push(d);
    };
    window.addEventListener("keydown", e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ui.key(e)) { e.preventDefault(); return; }
      if (!g.s || ui.sceneOn) return;
      if (DK[e.key]) { e.preventDefault(); if (!e.repeat) press(DK[e.key]); else if (!g.held.includes(DK[e.key]) && !ui.busy() && !g.riding() && !g.s.auto) g.held.push(DK[e.key]); return; }
      const c = CMD[e.key];
      if (c) { e.preventDefault(); g.command(c); }
    });
    window.addEventListener("keyup", e => { const d = DK[e.key]; if (d) g.held = g.held.filter(x => x !== d); });
    window.addEventListener("blur", () => (g.held = []));
    document.querySelectorAll("[data-pad]").forEach(btn => {
      const d = btn.dataset.pad, off = e => { e.preventDefault(); g.held = g.held.filter(x => x !== d); };
      btn.addEventListener("pointerdown", e => { e.preventDefault(); if (ui.active) ui.key({ key: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[d] }); else if (ui.modalKey) ui.modalKey({ key: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[d] }); else press(d); });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) btn.addEventListener(ev, off);
    });
    document.querySelectorAll("[data-cmd]").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      const c = btn.dataset.cmd;
      if (ui.active) return ui.key({ key: c === "act" ? "Enter" : "Escape" });
      if (ui.modalKey && c === "menu") return g.closeMenu();
      if (g.s && !ui.busy()) g.command(c);
    }));
    $("hud-mini").addEventListener("click", () => { if (g.s && !ui.busy()) g.openMenu("map"); });
  };
  G.command = function (c) {
    const s = this.s;
    if (!s || this.ui.busy()) return;
    if (c === "act") return this.interact();
    if (c === "menu") return this.openMenu(this._tab || "status");
    if (TABS.some(t => t[0] === c)) return this.openMenu(c);
    if (c === "trip") return this.riding() ? this.rideMenu() : s.auto ? this.tripMenu() : this.journeyPlanner();
    if (c === "rest") return this.riding() ? this.rideMenu() : s.auto ? this.tripMenu() : this.rest();
    if (c === "look") return this.lookAround();
    if (c === "view") return this.toggleView();
    if (c === "help") return this.help();
    if (c === "zin" || c === "zout") { this.ren.zoom = U.clamp(this.ren.zoom + (c === "zin" ? 1 : -1), 1, 4); this.dirty = true; }
  };

  // ------------------------------------------------------------------ HUD, minimap, viewing window
  G.hud = function () {
    const s = this.s, w = this.w, t = s.clock, lat = this.lat(), ph = AZ.Clock.light(t, lat).phase, obj = this.objective(), th = this.trackedThread();
    $("hud-obj").innerHTML = `${obj ? `<div class="${obj.text[0] === "◆" ? "side" : "hook"}">${U.esc(obj.text)}</div>` : ""}${th && obj && obj.text[0] !== "◆" ? `<div class="side">◆ ${U.esc(th.steps[th.phase].text)}</div>` : ""}`;
    const eat = this.eaters(), conds = Object.keys(s.cond).map(k => AZ.COND[k]?.label).filter(Boolean);
    $("hud-clock").innerHTML = `<div class="big">${AZ.dayWords(t)}</div><div>${AZ.hhmm(t)} · ${PH[ph] || ""} ${ph} · ${AZ.Clock.season(lat, t)} · ${this.weather().label}</div>` +
      `<div>🟡 ${U.rn(s.purse, 1)} · food ${s.sup.food} <span class="dim">(${Math.floor(s.sup.food / eat)} d)</span>${conds.length ? ` · <span class="late">${conds.join(", ")}</span>` : ""}</div>`;
    const trip = $("hud-trip");
    if (this.riding()) { const v = s.voyage, e = this.voyageEta(); trip.innerHTML = `${U.cap(U.esc(v.ship))} → ${U.esc(v.stops[v.leg]?.name || "")} · about ${AZ.Clock.span(e.hours)} to the end · <span class="dim">Space: options</span>`; }
    else if (s.auto && s.trip) { const left = s.autoPath ? Math.max(0, s.autoPath.length - 1 - (this._autoK || 0)) : 0; trip.innerHTML = `Bound for ${U.esc(s.trip.name)} · ${U.num(Math.round(left * (s.autoPath?.mps || w.miles) / 5) * 5)} mi to go${this.fast ? " · quickly" : ""} · <span class="dim">Space: options</span>`; }
    else trip.innerHTML = "";
    this._miniDirty = true;
  };
  G.shellFrame = function (now) {
    if (!this.s) { if (!this._titleDrawn) this.drawTitleBackdrop(); return; }
    if (this._miniDirty && now - (this._miniT || 0) > 150) { this._miniDirty = false; this._miniT = now; this.drawMini(); }
    if (this.viewOn && now - (this._vpT || 0) > 125) { this._vpT = now; const p = this.windowParams(); AZ.ViewWin.draw($("vp-cv"), p); $("vp-label").textContent = p.label; }
  };
  G.drawMini = function () {
    const cv = $("mini"), ctx = cv.getContext("2d"), s = this.s, W = cv.width, H = cv.height, x0 = s.c - W / 4, y0 = s.r - H / 4;
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#070914"; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.ren.worldImage(), x0, y0, W / 2, H / 2, 0, 0, W, H);
    const dot = (t, col, z = 2) => { if (t) { ctx.fillStyle = col; ctx.fillRect((t[0] - x0) * 2 - z / 2, (t[1] - y0) * 2 - z / 2, z, z); } };
    const leg = this.cpNext()?.legIn, line = s.voyage && s.voyage.course ? s.voyage.course : s.auto && s.autoPath ? s.autoPath : leg ? leg.chain : null;
    if (line) for (let i = 0; i < line.length; i += 2) dot(line[i], s.voyage || s.auto ? "rgba(79,209,197,0.9)" : "rgba(245,197,66,0.85)", 2);
    const obj = this.objective();
    if (obj && obj.tile) dot(obj.tile, "#f5c542", 6);
    dot(s.waypoint, "#4fd1c5", 6);
    if (s.vessel && !s.aboard) dot([s.vessel.c, s.vessel.r], "#fff", 4);
    dot([s.c, s.r], "#ff4646", 5);
  };
  G.toggleView = function () { this.viewOn = !this.viewOn; $("vpanel").classList.toggle("on", this.viewOn); try { this.store.setItem("azrpg7:view", this.viewOn ? "1" : "0"); } catch (e) { /* private browsing */ } };
  G.drawTitleBackdrop = function () {
    const cv = $("view"), ctx = cv.getContext("2d"), img = this.ren.worldImage(), sc = Math.max(cv.width / img.width, cv.height / img.height);
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#070914"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 0.55; ctx.drawImage(img, (cv.width - img.width * sc) / 2, (cv.height - img.height * sc) / 2, img.width * sc, img.height * sc); ctx.globalAlpha = 1;
    this._titleDrawn = true;
  };

  // ------------------------------------------------------------------ the menu
  G.openMenu = function (tab) {
    if (!this.s) return;
    this.held = []; this._tab = tab || "status";
    $("menu").classList.add("on");
    this.ui.modalKey = e => this.menuKey(e);
    this.renderMenu();
  };
  G.closeMenu = function () { $("menu").classList.remove("on"); this.ui.modalKey = null; this.dirty = true; };
  G.renderMenu = function () {
    const tab = this._tab, body = $("mbody");
    $("mtabs").innerHTML = TABS.map(([id, name], i) => `<button type="button" data-tab="${id}" class="${id === tab ? "on" : ""}">${name}<small>${i + 1}</small></button>`).join("") + `<button type="button" class="mx" data-close aria-label="Close the menu">✕</button>`;
    $("mtabs").querySelectorAll("[data-tab]").forEach(b => (b.onclick = () => { this._tab = b.dataset.tab; this.renderMenu(); }));
    $("mtabs").querySelector("[data-close]").onclick = () => this.closeMenu();
    body.className = `win mbody t-${tab}`;
    const help = { status: "Who you are, your condition, your company and your standing.", items: "What you carry, your vessel and what you have stored.",
      journal: "↑ ↓ choose an entry · Enter: set out for it, or track it · the quest log, side quests, leads and records.",
      map: "Arrows move the cursor · Enter: plan a journey there · W: mark it · L: lens · + −: zoom · C: centre on you.", atlas: "↑ ↓ turn the pages · the world as you have found it." }[tab];
    $("mhelp").innerHTML = `${help} <span class="dim">Q E or ◀ ▶: tabs · Esc: close</span>`;
    if (tab === "status") body.innerHTML = this.statusHtml();
    else if (tab === "items") body.innerHTML = this.itemsHtml();
    else if (tab === "journal") this.renderJournal(body);
    else if (tab === "map") this.renderMap(body);
    else this.renderAtlas(body);
  };
  G.menuKey = function (e) {
    const k = e.key, i = TABS.findIndex(t => t[0] === this._tab), go = d => { this._tab = TABS[(i + d + TABS.length) % TABS.length][0]; this.renderMenu(); };
    if (k === "Escape" || k === "x" || k === "X" || k === "Backspace") return this.closeMenu();
    if (/^[1-5]$/.test(k)) { this._tab = TABS[+k - 1][0]; return this.renderMenu(); }
    if (k === "q" || k === "Q" || k === "PageUp") return go(-1);
    if (k === "e" || k === "E" || k === "Tab" || k === "PageDown") { if (e.preventDefault) e.preventDefault(); return go(1); }
    if (this._tab === "map" && this.mapKey(e)) return;
    if (this._tab === "journal" && this.journalKey(e)) return;
    if (this._tab === "atlas" && this.atlasKey && this.atlasKey(e)) return;
    if (k === "ArrowLeft") go(-1); else if (k === "ArrowRight") go(1);
  };

  // ------------------------------------------------------------------ Status and Items
  G.statusHtml = function () {
    const s = this.s, w = this.w, P = w.P, tv = this.tv, lat = this.lat(), home = P.burgs[tv.home];
    const stand = (tab, list) => Object.entries(tab || {}).filter(([, n]) => n).map(([i, n]) => `${U.esc(list[i]?.name || "?")} ${n > 0 ? "+" : ""}${n}`).join(", ") || "none yet";
    const conds = Object.keys(s.cond).map(k => AZ.COND[k]?.label).filter(Boolean);
    return `<div class="cols2"><section><h3>${U.esc(tv.name)}</h3><p class="dim">${U.esc(tv.kindLabel)} ${T("new")}</p>
      <p>${tv.age}, ${U.esc(tv.trade)}. ${U.esc(P.cultures[tv.culture]?.name || "")}, of the ${U.esc(P.religions[tv.faith]?.name || "old ways")}${home ? `; from ${U.esc(home.name)}` : ""}.</p>
      <p>${U.cap(U.esc(tv.why))}.</p><p class="dim">Trait: ${U.esc(AZ.TRAITS[tv.trait]?.label || "none")} (${U.esc(AZ.TRAITS[tv.trait]?.text || "")}).</p>
      <h3>Condition</h3><p>Awake ${Math.round(s.awake || 0)} hours${conds.length ? `; <span class="late">${conds.join(", ")}</span>` : "; well"}. Food: ${s.sup.food} rations, ${Math.floor(s.sup.food / this.eaters())} days for ${this.eaters() === 1 ? "you" : `${this.eaters()} mouths`}.</p></section>
      <section><h3>The company</h3>${s.party.length ? `<ul>${s.party.map(p => `<li>${U.esc(p.name)}, ${U.esc(p.role)}</li>`).join("")}</ul>` : `<p class="dim">You travel alone.</p>`}
      <h3>Standing</h3><p>With faiths: ${stand(s.stand.f, P.religions)}.<br>With states: ${stand(s.stand.s, P.states)}.</p>
      <h3>Now</h3><p>${AZ.Clock.fmt(s.clock)}, ${AZ.Clock.dateStr(s.clock)}: ${AZ.Clock.season(lat, s.clock)} here, ${Math.round(AZ.Clock.dayLength(lat, AZ.Clock.doyAt(s.clock)))} hours of daylight ${T("mixed")}.</p>
      <p class="hook">${U.esc(this.objective()?.text || "")}</p></section></div>`;
  };
  G.itemsHtml = function () {
    const s = this.s, w = this.w, cap = this.capacity(), f = s.flags || {}, items = [];
    items.push(`🟡 ${U.rn(s.purse, 2)}`, `${s.sup.food} rations of food (you can carry ${cap.food})`);
    const goods = Object.entries(s.goods || {}).filter(([, n]) => n > 0).map(([g, n]) => `${n} ${U.esc(this.know.good(g).toLowerCase())} <span class="dim">(paid 🟡 ${U.rn((s.basis || {})[g] || 0, 2)} each)</span>`);
    items.push(goods.length ? `Goods: ${goods.join(", ")} (${this.goodsCount()} of ${cap.goods} units)` : `Goods: none (room for ${cap.goods} units)`);
    items.push(U.cap(U.esc(this.tv.token)));
    if (f.relic) items.push("A relic in rotten cloth, for a temple of your faith");
    if (f.inscription) items.push("A copy of an inscription no one has read");
    if (f.flask) items.push("A flask of water from a healing spring");
    for (const th of s.threads.filter(t => !t.done)) { const st = th.steps[th.phase]; if (/letter|message|dispatch|offering|consignment|papers|report|relief|deliver/i.test(st.text)) items.push(`For “${U.esc(th.title)}”: ${U.esc(st.text.toLowerCase())}`); }
    if (s.voyage) items.push(`A ${s.voyage.mode === "land" ? "seat" : "berth"} on ${U.esc(s.voyage.ship)}, bound for ${U.esc(s.voyage.stops[s.voyage.stops.length - 1].name)}${s.voyage.state === "port" && !this.riding() ? `: it leaves ${AZ.Clock.fmt(s.voyage.departAt)}` : ""}`);
    let h = `<h3>What you carry</h3><ul class="carry">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
    const v = s.vessel;
    if (v) {
      const C = AZ.VCLASS[v.vc] || AZ.VCLASS.boat, hold = this.holdOf(v), port = this.vesselInPort(v), R = this.ctlRow(v);
      h += `<h3>${U.esc(v.kind)} <span class="dim">(${C.name}, ${R.label.toLowerCase()})</span></h3><p>${this.withVessel() ? (s.aboard ? "Under you." : "In the harbour here.") : `Waiting ${port ? `in ${U.esc(port.name)}` : "where you left her"}, with ${hold.food} rations in the hold.`} ${v.crew} hands, morale ${Math.round(v.morale ?? 70)}${v.strikes ? `, strikes ${v.strikes} of 3` : ""}${v.damaged ? `; <span class="late">damaged</span>` : ""}. She holds ${C.hold.food} rations and ${C.hold.goods} units; ${C.sheet} ${T("mixed")}.</p>`;
    }
    if (s.beast) { const L = AZ.LANDV[s.beast.vc]; h += `<h3>${U.esc(s.beast.kind)}</h3><p>A ${L.name}: ${L.hold.food} rations and ${L.hold.goods} units more on land${s.beast.hungry ? `; hungry ${s.beast.hungry} days` : ""}.</p>`; }
    const lots = Object.entries(s.stores || {});
    if (lots.length) h += `<h3>Stored</h3><ul>${lots.map(([bi, S]) => `<li>${U.esc(w.P.burgs[bi].name)}: ${U.esc(this.storeDesc(S.lots))} · 🟡 ${this.storeDue(w.P.burgs[bi])} due</li>`).join("")}</ul>`;
    const b = this.townNear();
    if (b) { const row = (id, x, label) => `<tr><td class="dim">${label || AZ.MONEY[id].label}</td><td>🟡 ${AZ.money(id, b, x)}</td></tr>`; h += `<h3>Prices at ${U.esc(b.name)} ${T("mixed")}</h3><table>${row("ration")}${row("wage", null, "A day's work")}${row("inn")}${row("fare", 100, "A sea passage, 100 miles")}${row("alms")}</table>`; }
    return h;
  };

  // ------------------------------------------------------------------ Journal
  G.journalItems = function () {
    const s = this.s, out = [];
    if (this.jr) { out.push({ head: U.esc(this.jr.J.name) }); for (const e of this.journeyEntries()) out.push({ kind: "cp", e }); }
    const act = s.threads.filter(t => !t.done), done = s.threads.filter(t => t.done);
    out.push({ head: "Side quests" });
    if (!act.length && !done.length) out.push({ kind: "none", text: "None yet: notice boards post errands." });
    for (const th of act) out.push({ kind: "th", th });
    for (const th of done.slice(-6)) out.push({ kind: "th", th });
    out.push({ head: "Leads" });
    for (const l of s.leads.slice(-12).reverse()) out.push({ kind: "lead", l });
    if (!s.leads.length) out.push({ kind: "none", text: "Rumours and sightings become leads." });
    out.push({ head: "Records" }, { kind: "people" }, { kind: "news" }, { kind: "log" });
    return out;
  };
  const MARK = { done: "✓", here: "★", next: "→", later: "·", skipped: "–" };
  G.renderJournal = function (body) {
    const items = this.journalItems(), sel = items.filter(x => !x.head);
    this._jItems = sel; this._jSel = U.clamp(this._jSel ?? Math.max(0, sel.findIndex(x => x.kind === "cp" && x.e.status !== "done")), 0, sel.length - 1);
    let n = -1;
    const row = x => {
      if (x.head) return `<li class="jh">${x.head}</li>`;
      n++;
      const cls = n === this._jSel ? "sel" : "";
      if (x.kind === "cp") return `<li class="${cls} ${x.e.status === "done" || x.e.status === "skipped" ? "dim" : "hook"}" data-n="${n}">${MARK[x.e.status]} Day ${x.e.day}: ${U.esc(x.e.head)}</li>`;
      if (x.kind === "th") return `<li class="${cls} ${x.th.done ? "dim" : "side"}" data-n="${n}">${x.th.done ? "✓" : x.th.id === this.s.track ? "◆" : "◇"} ${U.esc(x.th.title)}</li>`;
      if (x.kind === "lead") return `<li class="${cls}" data-n="${n}">◦ ${U.esc(x.l.name)}</li>`;
      if (x.kind === "none") return `<li class="${cls} dim" data-n="${n}">${x.text}</li>`;
      return `<li class="${cls}" data-n="${n}">${{ people: "People you have met", news: "News, as it reached you", log: "What has happened" }[x.kind]}</li>`;
    };
    body.innerHTML = `<ul class="jlist">${items.map(row).join("")}</ul><div class="jdetail" id="jdetail"></div>`;
    body.querySelectorAll(".jlist [data-n]").forEach(li => (li.onclick = () => { if (this._jSel === +li.dataset.n) this.journalEnter(); else { this._jSel = +li.dataset.n; this.renderJournal(body); } }));
    $("jdetail").innerHTML = this.journalDetail(sel[this._jSel]);
    const cur = body.querySelector(".jlist .sel"); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
  };
  G.journalDetail = function (x) {
    const s = this.s, w = this.w, P = w.P;
    if (!x) return "";
    const dd = t => (t ? this.know.dirDist(s.c, s.r, t).txt : "");
    if (x.kind === "cp") {
      const e = x.e, cp = e.cp;
      return `<h3>${U.esc(e.head)}</h3><p class="dim">The plan: day ${e.planDay}${e.arrived ? `; you arrived day ${e.day}` : ""}. ${cp.tile ? dd(cp.tile) : ""} ${T("mixed")}</p>` +
        (e.acts.length ? `<ul>${e.acts.map(a => `<li class="${a.done ? "dim" : "hook"}">${a.done ? "✓" : "★"} ${U.esc(a.a.label)}</li>`).join("")}</ul>` : "") +
        `<h4>Why this way</h4>${this.legReasons(cp).map(t => `<p>${t}</p>`).join("")}${e.status !== "done" ? `<p class="hook">Enter: set out for ${U.esc(cp.place.name)}.</p>` : ""}`;
    }
    if (x.kind === "th") {
      const th = x.th, tg = this.threadTarget(th);
      return `<h3>${U.esc(th.title)}</h3>${th.why ? `<p>${th.why}</p>` : ""}<ul>${th.steps.map((st, i) => `<li class="${i < th.phase || th.done ? "dim" : i === th.phase ? "side" : ""}">${i < th.phase || th.done ? "✓" : i === th.phase ? "◆" : "·"} ${U.esc(st.text)}</li>`).join("")}</ul>` +
        `${th.giver != null ? `<p class="dim">From ${U.esc(P.burgs[th.giver]?.name || "")}${th.deadline ? `; by ${AZ.Clock.fmt(th.deadline)}` : ""}.</p>` : ""}${th.done ? `<p class="dim">${U.esc(th.outcome)}</p>` : tg.tile ? `<p>${U.esc(tg.name)}: ${dd(tg.tile)}.</p><p class="side">Enter: track this quest (marked on the map and in the corner).</p>` : ""}`;
    }
    if (x.kind === "lead") return `<h3>${U.esc(x.l.name)}</h3><p>${U.esc(x.l.type || "")}, ${x.l.from} ${x.l.t ? `· ${dd(x.l.t)}` : ""}</p><p class="side">Enter: mark it on the map.</p>`;
    if (x.kind === "people") return `<h3>People you have met</h3>${s.met.length ? `<ul>${s.met.slice(-40).reverse().map(m => `<li>${U.esc(m.name)}, ${U.esc(m.role.toLowerCase())} in ${U.esc(P.burgs[m.town]?.name || "")} <span class="dim">(${AZ.Clock.fmt(m.t)})</span></li>`).join("")}</ul>` : "<p class=\"dim\">No one yet. Talk to people in towns.</p>"}${s.party.length ? `<h4>The company</h4><p>${s.party.map(p => `${U.esc(p.name)} (${p.role})`).join(", ")}</p>` : ""}`;
    if (x.kind === "news") return this.newsHtml ? this.newsHtml() : "";
    if (x.kind === "log") return `<h3>What has happened</h3>${s.log.slice(-60).reverse().map(l => `<p class="${l.cls}"><span class="dim">${AZ.Clock.fmt(l.t)}</span> ${l.html}</p>`).join("")}`;
    return "";
  };
  G.journalKey = function (e) {
    const k = e.key, n = (this._jItems || []).length;
    if (k === "ArrowUp" || k === "w" || k === "W") { this._jSel = (this._jSel - 1 + n) % n; this.renderJournal($("mbody")); return true; }
    if (k === "ArrowDown" || k === "s" || k === "S") { this._jSel = (this._jSel + 1) % n; this.renderJournal($("mbody")); return true; }
    if (k === "Enter" || k === " " || k === "z" || k === "Z") { this.journalEnter(); return true; }
    return false;
  };
  G.journalEnter = function () {
    const s = this.s, x = (this._jItems || [])[this._jSel];
    if (!x) return;
    if (x.kind === "cp" && x.e.status !== "done") { const cp = x.e.cp; this.closeMenu(); return this.setOut({ tile: cp.tile, name: cp.place.name, bi: cp.place.at && cp.place.burg ? cp.place.burg.i : null, plan: !!(s.aboard && s.vessel) }); }
    if (x.kind === "th" && !x.th.done) { s.track = x.th.id; const tg = this.threadTarget(x.th); if (tg.tile) s.waypoint = tg.tile; this.ui.toast(`Tracking <b class="side">${U.esc(x.th.title)}</b>.`, "teal"); this.dirty = true; return this.renderJournal($("mbody")); }
    if (x.kind === "lead" && x.l.t) { s.waypoint = x.l.t.slice(); this.ui.toast(`Marked on the map: ${U.esc(x.l.name)}.`, "teal"); this.dirty = true; }
  };

  // ------------------------------------------------------------------ Map
  G.renderMap = function (body) {
    const s = this.s, w = this.w;
    body.innerHTML = `<div class="mapbox"><canvas id="wmap"></canvas></div><div class="mapinfo" id="minfo"></div>`;
    const box = body.querySelector(".mapbox"), cv = $("wmap");
    cv.width = Math.max(200, box.clientWidth); cv.height = Math.max(150, box.clientHeight);
    this._mapZ = this._mapZ ?? 0; this._lens = this._lens ?? 0;
    if (!this._mapCur) this._mapCur = [s.c, s.r];
    // ground you have seen is clear; the rest lies under a veil
    const fog = this.ren.mk(w.cols, w.rows), fx = fog.getContext("2d"), img = fx.createImageData(w.cols, w.rows);
    for (let i = 0, N = w.cols * w.rows; i < N; i++) if (!this.isExplored(i)) img.data[i * 4 + 3] = 120;
    fx.putImageData(img, 0, 0);
    this._fog = fog;
    cv.onclick = e => { const r = cv.getBoundingClientRect(), v = this._mapView; this._mapCur = [Math.floor(v.x0 + (e.clientX - r.left) / v.sc), Math.floor(v.y0 + (e.clientY - r.top) / v.sc)]; this.drawMap(); };
    cv.ondblclick = () => this.mapKey({ key: "Enter" });
    this.drawMap();
  };
  G.drawMap = function () {
    const s = this.s, w = this.w, cv = $("wmap");
    if (!cv) return;
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, fit = Math.min(W / w.cols, H / w.rows), sc = fit * ZOOMS[this._mapZ];
    const vw = W / sc, vh = H / sc, cur = this._mapCur;
    const x0 = vw >= w.cols ? (w.cols - vw) / 2 : U.clamp(cur[0] - vw / 2, 0, w.cols - vw), y0 = vh >= w.rows ? (w.rows - vh) / 2 : U.clamp(cur[1] - vh / 2, 0, w.rows - vh);
    this._mapView = { x0, y0, sc };
    const X = c => (c + 0.5 - x0) * sc, Y = r => (r + 0.5 - y0) * sc;
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#070914"; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.ren.worldImage(), x0, y0, vw, vh, 0, 0, W, H);
    const lens = AZ.LENSES[this._lens];
    if (lens.id !== "none") { ctx.globalAlpha = 0.5; ctx.drawImage(this.ren.lensWorld(lens), x0, y0, vw, vh, 0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.drawImage(this._fog, x0, y0, vw, vh, 0, 0, W, H);
    const line = (pts, col, lw) => { if (!pts || pts.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([c, r], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(c), Y(r))); ctx.stroke(); };
    if (this.sim) for (const [id, seen] of Object.entries(s.lineSeen || {})) {
      const L = this.sim.lines[+id]; if (!L) continue;
      const A = w.P.burgs[L.from], B = w.P.burgs[L.to];
      ctx.setLineDash(seen.ok ? [] : [3, 3]); line([A.t, B.t], !seen.ok ? "rgba(255,110,90,0.8)" : L.mode === "sea" ? "rgba(140,220,255,0.7)" : "rgba(230,190,120,0.8)", 1.5); ctx.setLineDash([]);
    }
    if (this.jr) for (const sg of this.jr.segs) if (sg.moving) line(sg.chain, this.cpNext()?.legIn === sg ? "rgba(245,197,66,1)" : "rgba(245,197,66,0.45)", this.cpNext()?.legIn === sg ? 2.5 : 1.2);
    if (s.auto && s.autoPath) line(s.autoPath, "rgba(79,209,197,0.95)", 2);
    if (s.voyage && s.voyage.course) line(s.voyage.course, "rgba(255,255,255,0.85)", 2);
    const z = Math.max(2, Math.min(5, sc * 1.5));
    for (const b of w.P.burgs) if (b) { const seen = s.seen.b.includes(b.i); ctx.fillStyle = seen ? "#fff" : "rgba(255,255,255,0.45)"; const q = b.capital ? z + 1 : z * 0.7; ctx.fillRect(X(b.t[0]) - q / 2, Y(b.t[1]) - q / 2, q, q); }
    if (ZOOMS[this._mapZ] > 1) { ctx.font = "12px DotGothic16, monospace"; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(7,9,20,0.85)"; ctx.lineWidth = 3; for (const i of s.seen.b) { const b = w.P.burgs[i]; if (!b || X(b.t[0]) < 0 || X(b.t[0]) > W || Y(b.t[1]) < 0 || Y(b.t[1]) > H) continue; ctx.strokeText(b.name, X(b.t[0]) + 5, Y(b.t[1]) - 4); ctx.fillText(b.name, X(b.t[0]) + 5, Y(b.t[1]) - 4); } }
    if (this.jr) this.jr.cps.forEach((cp, i) => { ctx.fillStyle = i < s.cp ? "rgba(245,197,66,0.45)" : "#f5c542"; ctx.fillRect(X(cp.tile[0]) - 3.5, Y(cp.tile[1]) - 3.5, 7, 7); });
    for (const l of s.leads) if (l && l.t) { ctx.fillStyle = "#4fd1c5"; ctx.fillRect(X(l.t[0]) - 2, Y(l.t[1]) - 2, 4, 4); }
    if (s.waypoint) { ctx.strokeStyle = "#4fd1c5"; ctx.lineWidth = 2; ctx.strokeRect(X(s.waypoint[0]) - 6, Y(s.waypoint[1]) - 6, 12, 12); }
    if (s.vessel && !s.aboard) { ctx.fillStyle = "#fff"; ctx.fillRect(X(s.vessel.c) - 3, Y(s.vessel.r) - 3, 6, 6); }
    ctx.fillStyle = "#ff4646"; ctx.beginPath(); ctx.arc(X(s.c), Y(s.r), 5, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; const cx = X(cur[0]), cy = Y(cur[1]);
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 3); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 10); ctx.stroke();
    const [c, r] = cur, cell = w.inb(c, r) ? w.cell(c, r) : 0, b = w.inb(c, r) && w.near(c, r, 2).find(n => n.kind === "burg");
    const what = !w.inb(c, r) ? "beyond the map" : w.isLand(c, r) ? `${U.esc(w.P.biomes[w.C.biome[cell]].name)}, ${U.esc(this.know.regionName(cell))}` : U.esc(w.waterName(c, r));
    $("minfo").innerHTML = `${b ? `<b>${U.esc(b.o.name)}</b> · ` : ""}${what} · ${this.know.dirDist(s.c, s.r, cur).txt} of you${lens.id !== "none" ? ` · ${U.esc(lens.name)}: ${U.esc(String(lens.label(w, cell, c, r) ?? ""))}` : ""} · zoom ×${ZOOMS[this._mapZ]}`;
  };
  G.mapKey = function (e) {
    const k = e.key, w = this.w, step = Math.max(1, Math.round(10 / ZOOMS[this._mapZ] / (Math.min(1, 1 / ((this._mapView && this._mapView.sc) || 1))))), cur = this._mapCur;
    const mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
    if (mv) { cur[0] = U.clamp(cur[0] + mv[0] * step, 0, w.cols - 1); cur[1] = U.clamp(cur[1] + mv[1] * step, 0, w.rows - 1); this.drawMap(); return true; }
    if (k === "+" || k === "=") { this._mapZ = Math.min(ZOOMS.length - 1, this._mapZ + 1); this.drawMap(); return true; }
    if (k === "-" || k === "_") { this._mapZ = Math.max(0, this._mapZ - 1); this.drawMap(); return true; }
    if (k === "l" || k === "L") { this._lens = (this._lens + 1) % AZ.LENSES.length; this.drawMap(); return true; }
    if (k === "c" || k === "C") { this._mapCur = [this.s.c, this.s.r]; this.drawMap(); return true; }
    if (k === "w" || k === "W") { this.s.waypoint = cur.slice(); this.ui.toast("Marked on the map."); this.drawMap(); this.dirty = true; return true; }
    if (k === "Enter" || k === " ") {
      const b = w.near(cur[0], cur[1], 2).find(n => n.kind === "burg"), tile = b ? b.o.t : cur.slice();
      this.closeMenu();
      this.setOut({ tile, name: b ? b.o.name : w.isLand(...cur) ? `the ${w.P.biomes[w.C.biome[w.cell(...cur)]].name.toLowerCase()} you marked` : "the water you marked", bi: b ? b.o.i : null });
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------------ help
  G.help = function () {
    return this.ui.say([`<b>How to play</b><table class="keys"><tr><td>Arrows · WASD</td><td>walk one tile; each step costs its hours, standing still costs nothing</td></tr><tr><td>Space · Enter</td><td>whatever is here: a town, a marked place, your vessel; on a journey, its options</td></tr>` +
      `<tr><td>F</td><td>plan a journey: walk or sail on your own to a place you choose</td></tr><tr><td>R</td><td>camp, wait, fish or forage</td></tr><tr><td>L</td><td>look around: the land, and the hours a step takes each way</td></tr><tr><td>V</td><td>the viewing window</td></tr>` +
      `<tr><td>Esc · M · J · I</td><td>the menu: Status, Items, Journal, Map, Atlas</td></tr><tr><td>+ −</td><td>zoom</td></tr></table>`,
      `Towns open when you step into them. People there know things: ask them about your journey and they will help as they can. Book passages at harbours and coach offices; the captain steers, you watch, and Space under way gives you the options. Text is tagged: <span class="tag t-data">data</span> read from the map, <span class="tag t-mixed">mixed</span> a stated rule applied to it, <span class="tag t-new">new</span> made up for the game.`]);
  };

  // ------------------------------------------------------------------ the title screen
  G.title = async function () {
    const w = this.w, P = w.P, ui = this.ui, cal = w.W.calendar || {};
    document.body.classList.add("titling");
    this._jrs = this._jrs || {};
    const jrOf = i => (i < 0 || !P.journeys[i] ? null : (this._jrs[i] = this._jrs[i] || new AZ.Journey(w, P.journeys[i])));
    let last = null; try { last = JSON.parse(this.store.getItem(`azrpg7:last:${P.world.seed}`)); } catch (e) { last = null; }
    let ji = 0;
    for (;;) {
      const jr = jrOf(ji);
      this.jr = last != null ? jrOf(last) : null;
      const can = last != null && this.hasSave(), savedName = this.jr ? this.jr.J.name : "exploring freely";
      const opts = [];
      if (jr) opts.push({ label: "New journey", detail: U.esc(jr.J.name), act: "new", desc: `${U.esc(jr.J.type || AZ.archOf(jr))}: ${U.esc(jr.origin.name)} to ${U.esc(jr.dest.name)}, ${U.num(Math.round(jr.totalMiles))} miles.` });
      if (P.journeys.length > 1) opts.push({ label: "Choose another journey", detail: `${P.journeys.length} in this world`, act: "pick" });
      opts.push({ label: "Explore freely", act: "free", desc: "No journey: start in a town and go where you please." });
      if (can) opts.push({ label: "Continue", detail: U.esc(savedName), act: "cont" });
      opts.push({ label: "How to play", act: "help" });
      const k = await ui.choose(`<span class="dim">${U.esc(P.world.name)} · year ${cal.year ?? "?"} ${U.esc(cal.era || "")} · ${U.num(w.cols)} × ${U.num(w.rows)} tiles of ${U.num(w.miles, 2)} miles</span>`, opts, { title: `<span class="logo">${U.esc(jr ? jr.J.name : P.world.name)}</span>`, sub: AZ.VERSION });
      const a = opts[k].act;
      if (a === "help") { await this.help(); continue; }
      if (a === "pick") { const k2 = await ui.choose("", [...P.journeys.map((J, i) => ({ label: U.esc(J.name), detail: U.esc(J.type || ""), i })), { label: "Back" }], { title: "Journeys in this world", cancel: P.journeys.length }); if (k2 < P.journeys.length) ji = k2; continue; }
      if (a === "cont") { if (this.loadGame()) { this.begin(); ui.toast(`Welcome back, ${U.esc(this.tv.name)}.`); return; } continue; }
      this.jr = a === "free" ? null : jr;
      if (await this.newGame()) return;
    }
  };
  G.newGame = async function () {
    const w = this.w, P = w.P, ui = this.ui, jr = this.jr;
    const start = jr ? jr.origin.burg : P.burgs.filter(b => b && b.capital).sort((a, c) => c.population - a.population)[0];
    const kinds = jr ? AZ.travellerKinds(w, jr) : AZ.sandboxKinds(w, start);
    const k = await ui.choose("Each kind of traveller is found in this map's data.", [{ label: "Let chance decide", id: null }, ...kinds.map(x => ({ label: U.esc(x.label), desc: U.esc(x.blurb), id: x.id })), { label: "Back", back: true }], { title: "Who travels?", cancel: kinds.length + 1 });
    const pick = [{ id: null }, ...kinds, { back: true }][k];
    if (pick.back) return false;
    let seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0, di = 0;
    const doys = [80, 172, 266, 355], lat0 = w.latlon(...(jr ? jr.origin.tile : start.t))[0];
    for (;;) {
      const tv = AZ.makeTraveller(w, jr, seed, pick.id, start.i);
      AZ.Clock.doy0 = doys[di];
      const card = `<b>${U.esc(tv.name)}</b>, ${tv.age}, ${U.esc(tv.trade)} · ${U.esc(P.cultures[tv.culture].name)} · ${U.esc(P.religions[tv.faith]?.name || "no faith")} ${T("new")}<br>${U.cap(U.esc(tv.why))}.<br><span class="dim">Purse 🟡 ${tv.purse} · ${U.esc(AZ.TRAITS[tv.trait]?.label || "")}</span>`;
      const opts = [{ label: "Begin", act: "go" }, { label: "Another traveller like this", act: "roll" },
        { label: "Departure", detail: `${AZ.Clock.season(lat0, 6)} (${Math.round(AZ.Clock.dayLength(lat0, doys[di]))} h of daylight)`, act: "season", desc: "Choose to change the season you set out in." }, { label: "Back", act: "back" }];
      const r = opts[await ui.choose(card, opts, { title: U.esc(tv.kindLabel), cancel: 3 })].act;
      if (r === "back") return false;
      if (r === "roll") { seed = (seed * 1664525 + 1013904223) >>> 0; continue; }
      if (r === "season") { di = (di + 1) % 4; continue; }
      this.fresh(seed, tv.kind, doys[di], start.i);
      this.begin();
      this.saveGame();
      const s = this.s, P2 = this.w.P;
      if (jr) {
        const days = Math.round((jr.planEnd - jr.t0) / 24);
        await ui.say([`<b class="hook">${U.esc(jr.J.name)}</b> ${T("data")}<br>You are ${U.esc(this.tv.name)}, ${U.esc(this.tv.trade)}. ${U.cap(U.esc(this.tv.why))} ${T("mixed")}.`,
          `The ${AZ.noun(jr)} ends at ${U.esc(jr.dest.name)}, ${U.num(Math.round(jr.totalMiles))} miles away; the plan gives it ${days} days ${T("mixed")}. ${AZ.whyDest(w, jr)}<br>${s.party.length ? `With you: ${s.party.map(p => `${U.esc(p.name)} (${p.role})`).join(", ")}.` : ""}`,
          `<b class="hook">${U.esc(this.objective()?.text || "")}</b>. You stand in ${U.esc(jr.origin.name)}: press Space to see the town. Esc opens the menu; the Journal holds the whole plan.`]);
      } else await ui.say([`You are ${U.esc(this.tv.name)}, ${U.esc(this.tv.trade)}. ${U.cap(U.esc(this.tv.why))}.`, `You stand in ${U.esc(P2.burgs[s.start].name)}. Space shows the town; F plans a journey; Esc opens the menu.`]);
      if (this.tv.thread) ui.toast(`Side quest: <b class="side">${U.esc(this.tv.thread.title)}</b>. ${U.esc(this.tv.thread.steps[0].text)}`, "teal");
      return true;
    }
  };
  G.begin = function () {
    document.body.classList.remove("titling");
    try { this.viewOn = this.store.getItem("azrpg7:view") === "1"; } catch (e) { this.viewOn = false; }
    $("vpanel").classList.toggle("on", !!this.viewOn);
    this._mapCur = null; this._jSel = null;
    this.started();
  };
})();
