// Alpha 6 rules, without a browser: what you know (seen ground by day, places heard of and seen,
// prices and sailings that blur, the notebook and handbills), the narrator's feed and day cards, and
// the timeline's tasks. Exits non-zero on a failure.
const { loadWorld, stubUI } = require("./harness.js");
(async () => {
  const { AZ, P, w, mk } = await loadWorld(process.argv[2] || require("path").join(__dirname, "../out/Pyeongak_rpg.html"));
  const ren = new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), jr = new AZ.Journey(w, P.journeys[0]);
  const ui = stubUI(), mem = {}, store = { getItem: k => mem[k] || null, setItem: (k, v) => (mem[k] = v) };
  const g = new AZ.Game(w, ren, ui, jr, store); AZ.game = g;
  g.fresh(11, null, 80); g.started();
  const s = g.s; let fails = 0;
  const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) fails++; };
  // places: the plan's stops are heard of from the start; the start is seen
  const K = g.kn(), stops = jr.cps.filter(cp => cp.place.burg && cp.place.at);
  ok(K.places[`b${jr.origin.burg.i}`] && K.places[`b${jr.origin.burg.i}`].lvl === "seen", "the start is seen");
  ok(stops.slice(1).every(cp => K.places[`b${cp.place.burg.i}`] && K.places[`b${cp.place.burg.i}`].lvl === "heard"), "the journey's stops are heard of");
  // ground seen, by day
  const i0 = w.idx(s.c, s.r);
  ok(g.seenDay[i0] === Math.floor(s.clock / 24) + 1, "the ground underfoot is seen today");
  const far = [s.c + 40, s.r]; ok(g.tileKnow(...far).lvl === "unknown", "ground forty tiles off is unknown");
  // prices: exact for three weeks, then words; the notebook keeps them
  const b = jr.origin.burg;
  g.notePricesSeen(b);
  ok(g.priceView(b.i).exact, "prices are exact on the day you see them");
  s.c += 3; s.clock += 22 * 24;
  let v = g.priceView(b.i); ok(v && !v.exact && /blurred/.test(v.src), `after 22 days the prices blur (${v && v.src})`);
  ok(/cheap|dear|usual/.test(g.priceLine(v)), "blurred prices read as cheap, usual or dear");
  s.clock -= 22 * 24; s.c -= 3;
  ok(g.notebookPending().includes(b.i), "fresh prices can be written into the notebook");
  g.writeNotebook();
  s.c += 3; s.clock += 40 * 24;
  v = g.priceView(b.i); ok(v && v.exact && /notebook/.test(v.src), "written prices stay exact in the notebook");
  s.clock -= 40 * 24; s.c -= 3;
  // sailings: exact for two weeks, then "about weekly"; a handbill keeps them
  g.noteBoard(b);
  const bd = K.boards[b.i];
  ok(bd && bd.lines.length > 0, `the sailings board is remembered (${bd ? bd.lines.length : 0} departures)`);
  ok(!!g.boardHere(), "the board is present while you stand in the town");
  g.copyBoard(); ok(K.docs.some(d => d.kind === "handbill" && d.bi === b.i), "a copied handbill is carried");
  s.c += 3; s.clock += 20 * 24;
  v = g.boardView(b.i); ok(v && v.exact && /handbill/.test(v.src), "the handbill keeps the board exact");
  K.docs = []; v = g.boardView(b.i); ok(v && !v.exact, "without it, a board seen 20 days ago has blurred");
  ok(/weekly|fortnight|month|day or two|twice|now and then/.test(g.blurBoard(v.rec)), `blurred sailings in words: ${g.blurBoard(v.rec).slice(0, 60)}`);
  s.clock -= 20 * 24; s.c -= 3;
  // the narrator: one feed, no sentence twice in a day, a day card at dusk
  s.feed = [];
  g.feedNote("Sighted <b>the Old Tower</b>, 20 mi north", "teal");
  g.feedNote("Sighted <b>the Old Tower</b>, 20 mi north", "teal");
  ok(s.feed.length === 1, "the same note is filed once a day");
  g.feedNote("On the move: the 1st Regiment of Somewhere, 25 mi north", "teal");
  g.feedNote("Tents: the 1st Regiment of Somewhere, 25 mi north", "teal");
  ok(s.feed.length === 2, "one sighting told by two systems is filed once");
  g.dayLog().miles = 31; g.fileDayCard(s.clock + 10);
  const card = s.feed.find(e => e.k === "day");
  ok(card && /31 mi/.test(card.html) && /<div>[^<]{20,}/.test(card.html), `the day card: ${card ? AZ.plain(card.html).slice(0, 90) : "none"}`);
  // tasks: without the timeline (as here), a task takes its hours at once
  const t0 = s.clock; let done = false; g.startActivity("Copying the sailings board", 1, () => (done = true));
  ok(done && Math.abs(s.clock - t0 - 1) < 1e-9, "a task takes its hours");
  // saving and loading keeps the seen ground
  g.saveGame();
  const sdBefore = Array.from(g.seenDay.slice(i0 - 5, i0 + 5));
  g.seenDay.fill(0); g.loadGame();
  ok(JSON.stringify(Array.from(g.seenDay.slice(i0 - 5, i0 + 5))) === JSON.stringify(sdBefore), "seen ground survives a save and load");
  // the viewing window has a scene for every way of travelling
  const cv = mk(210, 118);
  for (const scene of AZ.ViewWin.SCENES) for (const phase of ["day", "dusk", "night"]) AZ.ViewWin.draw(cv, { ...g.windowParams(), scene, phase, wx: phase === "night" ? "rain" : "clear" });
  ok(true, `the viewing window draws ${AZ.ViewWin.SCENES.join(", ")}`);
  console.log(fails ? `alpha6: ${fails} failed` : "alpha6: all ok");
  process.exit(fails ? 1 : 0);
})();
