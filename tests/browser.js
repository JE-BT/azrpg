// DOM smoke test (Alpha 6): runs the built HTML in jsdom with a real canvas backend, drives the title,
// the intro, walking on a heading under the timeline's clock, the town on the Story screen, a booked
// voyage with its day cards and check-ins, the five screens, the menu and a marked place; fails on any
// script error.
const fs = require("fs");
const NM = process.env.NODE_MODULES ? process.env.NODE_MODULES + "/" : "";
const { JSDOM } = require(NM + "jsdom");
const { createCanvas } = require(NM + "@napi-rs/canvas");
const html = fs.readFileSync(process.argv[2], "utf8");
const errors = [];
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://example.org/" });
const { window } = dom;
const realCreate = window.document.createElement.bind(window.document);
const canvases = new WeakMap();
function napiFor(el) { if (!canvases.has(el)) canvases.set(el, createCanvas(el.width || 300, el.height || 150)); const c = canvases.get(el); if (c.width !== el.width) c.width = el.width; if (c.height !== el.height) c.height = el.height; return c; }
window.HTMLCanvasElement.prototype.getContext = function () { return napiFor(this).getContext("2d"); };
window.document.createElement = function (tag, ...a) {
  if (String(tag).toLowerCase() === "canvas") { const c = createCanvas(300, 150); return c; }
  return realCreate(tag, ...a);
};
window.HTMLCanvasElement.prototype.toDataURL = function () { return napiFor(this).toDataURL(); };
window.HTMLCanvasElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: this.width, height: this.height }; };
for (const k of ["DecompressionStream", "Blob", "Response", "TextDecoder"]) window[k] = globalThis[k];
window.performance = performance;
window.innerWidth = 1280; window.innerHeight = 800;
let rafQ = [];
window.requestAnimationFrame = f => { rafQ.push(f); return rafQ.length; };
window.addEventListener("error", e => errors.push(e.message));
window.addEventListener("unhandledrejection", e => errors.push("rejection: " + (e.reason && e.reason.stack || e.reason)));
process.on("unhandledRejection", e => errors.push("rejection: " + (e && e.stack || e)));
window.console.error = (...a) => errors.push(a.join(" "));
const scripts = [...window.document.querySelectorAll("script")].filter(s => !s.type || s.type === "text/javascript");
const tick = (n = 1) => { for (let i = 0; i < n; i++) { const q = rafQ; rafQ = []; q.forEach(f => { try { f(performance.now()); } catch (e) { errors.push("frame: " + e.stack); } }); } };
const key = (k, extra = {}) => window.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, ...extra }));
const keyup = k => window.dispatchEvent(new window.KeyboardEvent("keyup", { key: k }));
const wait = ms => new Promise(r => setTimeout(r, ms));
const until = async (pred, what, n = 200) => { for (let i = 0; i < n; i++) { if (pred()) return true; await wait(10); tick(1); } throw new Error("timed out waiting for " + what); };
const txt = el => el.textContent.replace(/\s+/g, " ");
// close every open window without opening new ones: Enter pages a message, Escape cancels a menu
const closeAll = async g => { for (let i = 0; i < 40 && g.ui.active; i++) { key(g.ui.active.type === "say" ? "Enter" : "Escape"); await wait(3); } };
(async () => {
  try { window.eval(scripts[scripts.length - 1].textContent); } catch (e) { errors.push("eval: " + e.stack); }
  for (let i = 0; i < 100 && !window.AZ.game; i++) await wait(50);
  const g = window.AZ.game, $ = id => window.document.getElementById(id), AZ = window.AZ;
  if (!g) { console.log("NO GAME", errors, $("status")?.textContent); process.exit(1); }
  let T = 1000; // the frames' own clock, in ms: the timeline runs on it
  const frames = (n, ms = 100) => { for (let i = 0; i < n; i++) { T += ms; try { g.frame(T); } catch (e) { errors.push("frame: " + e.stack); } } };
  const check = (ok, what) => { if (!ok) throw new Error("check failed: " + what); };
  try {
    await until(() => /Sandbox/.test(txt($("modal"))), "title");
    console.log("TITLE:", [...$("modal").querySelectorAll("li")].map(li => li.textContent.replace("▶ ", "").slice(0, 40)).join(" | "));
    key("Enter");
    await until(() => /Who travels/.test(txt($("modal"))), "kinds");
    key("Enter");
    await until(() => /Departure:|Start:/.test(txt($("modal"))), "card");
    key("ArrowDown"); key("ArrowDown"); key("ArrowRight");
    await wait(20);
    key("ArrowUp"); key("ArrowUp"); key("Enter");
    await until(() => g.s && g.ui.active, "intro");
    console.log("INTRO:", txt($("msg")).slice(0, 120));
    while (g.ui.active) { key("Enter"); await wait(3); frames(1); }
    frames(3); await wait(3);
    while (g.ui.active) { key("Enter"); await wait(3); frames(1); }
    console.log("FRAME:", txt($("hud-trip")).slice(0, 120), "|", txt($("clockwin")), "|", txt($("chips")));
    check(g.a6 && g.screen === "world", "Alpha 6 shell on the World screen");
    check($("tabs").querySelectorAll("button").length === 5, "five screen buttons");
    // one tile per arrow: the clock runs for that step, then stops
    g.set.checkin = "needed"; g.set.stopSleep = false; g.set.stopHunger = false;
    const start = [g.s.c, g.s.r];
    const dirs = { right: "ArrowRight", left: "ArrowLeft", down: "ArrowDown", up: "ArrowUp" };
    const go = Object.keys(dirs).find(d => { const [dc, dr] = AZ.DIRS[d]; return g.passable(g.s.c + dc, g.s.r + dr).ok; }) || "right";
    if (g.s.aboard && g.s.vessel) g.takeHelm(true);
    g.tl.paused = true; key(dirs[go]); check(g.tl.stepOnce === go && !g.tl.paused, "an arrow starts the clock for one step");
    for (let i = 0; i < 60 && (g.tl.stepOnce || !g.tl.paused); i++) { frames(1, 100); await wait(0); if (g.ui.active) { key("Enter"); await wait(2); } }
    console.log("STEP:", start, "->", [g.s.c, g.s.r], "paused", g.tl.paused, AZ.Clock.fmt(g.shownClock()));
    check(g.s.c !== start[0] || g.s.r !== start[1], "stepped one tile");
    check(g.tl.paused, "the clock stops after the step");
    // playing while standing: time passes in place, at the pace
    while (g.ui.active) { key("Enter"); await wait(3); frames(1); }
    g.setPace(2); const p0 = g.shownClock(); for (let i = 0; i < 20; i++) { frames(1, 100); await wait(0); if (g.ui.active) break; }
    const played = g.shownClock() - p0, rate = g.tlRate();
    console.log("IN PLACE:", AZ.U.rn(played, 2), "h in 2 s at", rate, "h/s");
    check(played > 0 && played <= rate * 2.1 + 0.01, "the clock runs in place at the pace, never faster");
    // Memory stops the clock; World stays paused on return; Story runs at one second a second
    key("1"); const m0 = g.shownClock(); frames(20); check(g.shownClock() === m0, "Memory stops the clock");
    key("4"); check(g.tl.paused, "back on World the clock is paused");
    // the town, on the Story screen
    g.s.c = start[0]; g.s.r = start[1]; g.anim = null; g.tl.shown = null; frames(2);
    key(" "); await until(() => g.screen === "story" && g.hosting === "town" && g.ui.active && g.ui.active.deck, "the town on the Story screen");
    const st0 = g.shownClock(); frames(30, 100); await wait(0);
    console.log("STORY CLOCK:", AZ.U.rn((g.shownClock() - st0) * 3600, 2), "game seconds in 3 real seconds");
    check(Math.abs((g.shownClock() - st0) * 3600 - 3) < 0.6, "Story runs at one second a second");
    check($("story-left").querySelectorAll(".opt").length > 4, "town options as cards");
    console.log("DECK:", [...$("story-left").querySelectorAll(".lbl")].map(x => x.textContent).join(" | "));
    console.log("PLANNER:", txt($("story-right")).slice(0, 120));
    const hb = [...$("story-left").querySelectorAll(".opt")].find(b => /^(Harbour|Coach office)/.test(b.textContent));
    check(!!hb, "a harbour or coach office in the starting town");
    hb.click(); await until(() => $("info-choose") && $("info-choose").querySelectorAll(".opt").length, "the harbour answers in the Information panel");
    console.log("HARBOUR:", txt($("info-choose")).slice(0, 140));
    const star = [...$("info-choose").querySelectorAll(".opt")].find(li => /★/.test(li.textContent) && !li.disabled) || [...$("info-choose").querySelectorAll(".opt")].find(li => /⛵/.test(li.textContent) && !li.disabled);
    star.click(); await wait(5); frames(2);
    for (let i = 0; i < 6 && g.ui.active && g.ui.active.info; i++) { const back = [...$("info-choose").querySelectorAll(".opt")].find(x => /Back/.test(x.textContent)); if (!back) break; back.click(); await wait(5); }
    console.log("BOOKED:", g.s.voyage && g.s.voyage.ship, "sails", g.s.voyage && AZ.Clock.fmt(g.s.voyage.departAt), "purse", g.s.purse);
    check(!!g.s.voyage, "a booking");
    check(!!g.kn().boards[g.burgHere().i], "the sailings board is in memory");
    // the end of the day at the inn: heading to bed, then sleeping, with one option
    g.s.purse += 5; await wait(5); frames(2);
    const inn = [...$("story-left").querySelectorAll(".opt")].find(b => /^Inn/.test(b.textContent) && !b.disabled);
    if (inn) {
      inn.click(); frames(2); check(!!g.s.eod, "the inn is the end of the day");
      const bed = [...$("story-left").querySelectorAll(".opt")].find(b => /Go to bed now/.test(b.textContent)); bed.click();
      for (let i = 0; i < 20 && !g.s.sleep; i++) { frames(1); await wait(2); }
      g.renderDeck(); const opts = [...$("story-left").querySelectorAll(".opt")].map(b => b.textContent);
      console.log("ASLEEP:", g.s.sleep && g.s.sleep.where, "| deck:", opts.join(" || ").slice(0, 80));
      check(g.s.sleep && opts.length === 1 && /Wake up/.test(opts[0]), "asleep, the Decision panel holds one option: wake up");
      [...$("story-left").querySelectorAll(".opt")][0].click(); frames(2);
      check(!g.s.sleep, "waking early");
    }
    // leave the town and sail: day cards at dusk, the day card
    key("5"); g.ui.active = null; frames(2);
    g.set.checkin = "dusk";
    g.s.sup.food = 40; g.s.voyage.boarded = true; g.s.aboard = true; g.s.c = g.s.voyage.at[0]; g.s.r = g.s.voyage.at[1]; g.s.clock = g.s.voyage.departAt; g.tl.shown = null;
    g.set.paceSecs = [24, 12, 2]; g.setPace(3);
    let checkins = 0, onJourney = false; const seenCards = [];
    for (let i = 0; i < 1500 && checkins < 2; i++) {
      frames(1, 120); await wait(0); // let the narrator's windows open (they wait for the clock on screen)
      if (g.riding() && g.screen === "journey") onJourney = true;
      if (g.ui.active && !g.ui.active.deck) { const t = txt($("msg")); if (/day card/i.test(t)) checkins++; if (seenCards.length < 6) seenCards.push(t.slice(0, 60)); key("Enter"); await wait(2); }
    }
    console.log("CARDS:", seenCards.join(" || "));
    const cards = (g.s.feed || []).filter(e => e.k === "day");
    console.log("VOYAGE:", AZ.Clock.fmt(g.s.clock), g.s.voyage && g.s.voyage.state, "screen", g.screen, "day cards", cards.length, "check-ins", checkins);
    console.log("DAY CARD:", AZ.plain(cards[cards.length - 1]?.html || "").slice(0, 160));
    check(onJourney, "boarding brings up the Journey screen");
    check(cards.length >= 1 && checkins >= 1, "day cards and check-ins at dusk");
    // the five screens
    console.log("SLEPT ABOARD:", (g.s.feed || []).some(e => /You sleep aboard|asleep aboard/.test(AZ.plain(e.html))));
    key("1"); console.log("MEMORY:", /Memory/.test(txt($("mem-body"))), /Sailings and coaches/.test(txt($("mem-body"))));
    key("2"); console.log("INVENTORY:", /Inventory/.test(txt($("inv-body"))), /notebook/.test(txt($("inv-body"))));
    key("5"); frames(3); console.log("JOURNEY:", /The race/.test(txt($("j-body"))), "window", $("vwin").width + "x" + $("vwin").height);
    key("3"); await wait(5); frames(2); console.log("STORY:", /planning window/i.test(txt($("story-right"))), "options", $("story-left").querySelectorAll(".opt").length);
    check(/Memory/.test(txt($("mem-body"))) && /The race/.test(txt($("j-body"))), "screens render");
    key("4"); key("m"); frames(2); console.log("MENTAL MAP:", g._cam && g._cam.mode); key("m"); frames(2);
    key("Escape"); await wait(5); console.log("MENU:", /Settings/.test(txt($("modal")))); g.ui.closeModal();
    // a marked place
    const m = g.w.P.markers.find(x => x.type === "ruins");
    g.s.voyage = null; g.s.aboard = false; g.s.c = m.t[0]; g.s.r = m.t[1]; g.anim = null; g.tl.shown = null; frames(2);
    while (g.ui.active) { key(g.ui.active.type === "say" ? "Enter" : "Escape"); await wait(3); frames(1); }
    key(" "); await until(() => g.screen === "story" && g.ui.active && g.ui.active.deck, "Story at a marked place");
    const visit = [...$("story-left").querySelectorAll(".opt")].find(b => /^Visit/.test(b.textContent)); check(!!visit, "a marked place is an option");
    visit.click(); await until(() => $("info-choose") && $("info-choose").querySelectorAll(".opt").length, "the place answers in the Information panel");
    console.log("MARKER:", txt($("story-right")).slice(0, 160));
    key("Enter"); await wait(5); frames(2);
    console.log("AFTER MARKER:", AZ.Clock.fmt(g.s.clock), "purse", g.s.purse, "feed", (g.s.feed || []).length);
    g.saveGame();
  } catch (e) { errors.push(e.stack || String(e)); }
  console.log("saved:", !!window.localStorage.getItem(g.key), "seen days:", !!window.localStorage.getItem(g.key + ":sd"));
  console.log("ERRORS:", errors.length ? errors.join("\n") : "none");
  process.exit(errors.length ? 1 : 0);
})();
