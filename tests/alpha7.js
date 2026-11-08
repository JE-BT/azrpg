// Alpha 7 headless test: start the map's journey, use the town menu, book a passage, ride it,
// plan a journey of your own and walk or sail it, open the atlas pages. Uses a scripted UI.
//   node tests/alpha7.js out/Pyeongak_rpg.html
const { loadWorld } = require("./harness.js");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok  ", msg); };
function scriptedUI() {
  const said = [];
  return {
    said, script: [], sceneOn: false, active: null, modalKey: null, busy() { return false; },
    say: async p => { said.push(...(Array.isArray(p) ? p : [p]).map(String)); },
    choose: async function (prompt, options, opts = {}) {
      said.push(`CHOOSE ${(opts.title || "").replace(/<[^>]+>/g, "")} ${String(prompt).replace(/<[^>]+>/g, "")} :: ${options.map(o => o.label.replace(/<[^>]+>/g, "")).join(" | ")}`);
      if (this.script.length) { const re = this.script[0], k = options.findIndex(o => !o.disabled && re.test(o.label.replace(/<[^>]+>/g, ""))); if (k >= 0) { this.script.shift(); return k; } }
      return opts.cancel != null ? opts.cancel : options.findIndex(o => !o.disabled);
    },
    toast: h => said.push("TOAST " + h), banner: () => {},
  };
}
(async () => {
  const { AZ, P, w } = await loadWorld(process.argv[2] || "out/Pyeongak_rpg.html");
  const store = new Map(), mem = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const ui = scriptedUI(), ren = { cache: new Map(), lensCache: new Map(), piers: null, art: {}, mk: () => null };
  const g = new AZ.Game(w, ren, ui, P.journeys.length ? new AZ.Journey(w, P.journeys[0]) : null, mem);
  AZ.game = g;
  g.fresh(12345, AZ.travellerKinds(w, g.jr)[0].id, 80);
  g.started();
  const drain = async (n = 40) => { for (let i = 0; i < n && g._later.length; i++) await g._later.shift()(); g._speech.length = 0; };
  const s = g.s, jr = g.jr;
  assert(!!jr && jr.cps.length > 1, `journey "${jr && jr.J.name}" read into ${jr && jr.cps.length} checkpoints`);
  assert(!!g.tv && g.tv.name, `traveller: ${g.tv.name}, ${g.tv.kindLabel}, purse ${s.purse}, trait ${g.tv.trait}`);
  const obj = g.objective();
  assert(!!obj && !!obj.text, `objective: ${obj.text}`);
  const b = g.burgHere();
  assert(!!b, `standing in a town: ${b && b.name}`);
  const people = g.know.townPeople(b, g), opts = g.townOptions(b, people);
  assert(opts.some(o => /Inn|Hearth/.test(o.label)) && opts.some(o => o.label === "Market") && opts[opts.length - 1].leave, `town menu: ${opts.map(o => o.label.replace(/<[^>]+>/g, "")).join(" / ")}`);
  assert(people.every(p => p.talk().length), `everyone has something to say (${people.map(p => p.role).join(", ")})`);
  const help = g.questHelp(people.find(p => /Harbourmaster|Innkeeper|Host/.test(p.role)), b, g.objective().here ? { tile: g.cpNext().tile, name: g.cpNext().place.name, burg: g.cpNext().place.burg } : g.objective());
  assert(help.length > 0, `quest help: ${help.join(" ").replace(/<[^>]+>/g, "").slice(0, 160)}…`);
  assert(g.journeyEntries().length === jr.cps.length, `quest log has ${g.journeyEntries().length} entries; first: ${g.journeyEntries()[0].head}`);
  // the harbour: book the plan's ship (★) and ride it; or take the journey's own vessel and sail the plan's course
  s.sup.food = 60;
  ui.script = [/★ ⛵/];
  await g.harbour(b);
  const sail = async () => { let n = 0; for (let i = 0; i < 20000 && s.auto; i++) { g.anim = null; g.tick(); await drain(); if (!s.auto) break; const d = g.autoDir(); if (d) { g.tryMove(d); n++; } else g.autoDone(); await drain(); } return n; };
  if (s.voyage) {
    assert(true, `booked: ${s.voyage.ship} to ${s.voyage.stops.map(x => x.name).join(", ")}, leaves ${AZ.Clock.fmt(s.voyage.departAt)}`);
    const goes = g.boardOptions(b);
    if (goes.length) await goes[goes.length > 1 ? 1 : 0].act.go();
    let steps = 0; const t0 = s.clock;
    for (let i = 0; i < 20000 && (s.voyage || s.aboard); i++) {
      g.tick(); await drain();
      if (g.riding() && s.voyage && s.voyage.state === "sea") { g.anim = null; g.voyageStep(); steps++; await drain(); }
      else if (s.voyage && s.voyage.state === "port" && g.riding()) s.clock = s.voyage.departAt;
      else if (s.voyage && !g.riding()) break;
    }
    assert(!s.voyage && !s.aboard, `rode ${steps} tiles in ${AZ.Clock.span(s.clock - t0)}; ashore at ${g.burgHere() && g.burgHere().name}; checkpoint ${s.cp - 1} of ${jr.cps.length - 1}`);
    assert(ui.said.some(x => /Welcome aboard|Up you get/.test(x)), "the captain spoke as she cast off");
  } else {
    const jv = g.journeyVesselOptions(b);
    if (jv.length) {
      await jv[0].run(); await drain();
      assert(s.aboard && s.vessel, `aboard the company's ${s.vessel && s.vessel.kind} with ${s.vessel && s.vessel.crew} hands`);
      const cp = g.cpNext(); ui.script = [/^Set out$/];
      await g.setOut({ tile: cp.tile, name: cp.place.name, bi: cp.place.burg && cp.place.at ? cp.place.burg.i : null, plan: true });
      const n = await sail();
      assert(n > 50, `sailed ${n} tiles on the plan's course to ${cp.place.name} (${AZ.Clock.fmt(s.clock)}); checkpoint ${s.cp - 1}`);
      if (process.env.DEBUG) console.log(ui.said.filter(x => /TOAST|CHOOSE The crew|stops|strike|ultimat/i.test(x)).slice(-14).join("\n").replace(/<[^>]+>/g, "").slice(0, 2500));
      if (s.aboard && s.vessel) { const t = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([a, c]) => [s.c + a, s.r + c]).find(x => w.isLand(...x) && !w.navigable(...x, s.vessel.cls)); ui.script = [/Take|Go ashore/]; if (t) await g.goAshore(t); }
    } else assert(true, "no sailing and no journey vessel here; skipping the voyage");
  }
  // a journey of your own: to the nearest other town on the same land, or a coast you can walk to
  const here = [s.c, s.r], land = w.C.feature[w.cell(...here)];
  const dest = P.burgs.filter(x => x && x.t && w.C.feature[x.cell] === land && Math.hypot(x.t[0] - s.c, x.t[1] - s.r) > 4).sort((a, c) => Math.hypot(a.t[0] - s.c, a.t[1] - s.r) - Math.hypot(c.t[0] - s.c, c.t[1] - s.r))[0];
  if (dest) {
    ui.script = [/^Set out$/];
    await g.setOut({ tile: dest.t, name: dest.name, bi: dest.i });
    assert(s.auto && s.trip, `set out on foot for ${dest.name}`);
    let n = 0;
    for (let i = 0; i < 5000 && s.auto; i++) { g.anim = null; g.tick(); await drain(); if (!s.auto) break; const d = g.autoDir(); if (d) { g.tryMove(d); n++; } else g.autoDone(); await drain(); }
    assert(!s.auto && Math.hypot(s.c - dest.t[0], s.r - dest.t[1]) <= 2, `walked ${n} tiles to ${dest.name} (${AZ.Clock.fmt(s.clock)}); awake ${Math.round(s.awake)} h`);
  }
  for (const pg of g.atlasPages()) assert(pg.of >= pg.got, `atlas page ${pg.name}: ${pg.got} of ${pg.of}`);
  assert(g.saveGame() && g.loadGame(), "saved and loaded");
  const bad = ui.said.filter(x => /undefined|NaN|\[object/.test(x));
  assert(!bad.length, `no undefined or NaN in ${ui.said.length} lines of text${bad.length ? ": " + bad.slice(0, 3).join(" || ") : ""}`);
})().catch(e => { console.error(e); process.exitCode = 1; });
