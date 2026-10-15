// The text the player receives, logged and measured. Plays scripted runs (journeys of several types
// and a sandbox) through an instrumented UI that records every page, prompt, option, toast, banner,
// journal page, status-line change and log entry, with the game time and the system (engine module
// and function) that produced it. Then measures the log for the review in docs/TEXT_REVIEW.md.
// Run: node tests/textlog.js out [--out docs/textlog]   (out = the folder with built worlds)
const fs = require("fs"), path = require("path");
const { loadWorld, ROOT } = require("./harness.js");
const OUT = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : path.join(ROOT, "docs/textlog");
const DIR = process.argv[2] || path.join(ROOT, "out");
const RUNS = [
  { id: "pilgrimage", world: "Pyeongak", journey: "Pilgrimage to Chelhazpo", seed: 21 },
  { id: "raid", world: "Bernoy", journey: "The Leg Keels", seed: 22 },
  { id: "treasure", world: "Bernoy", journey: "Digging for the Bitter Sigil", seed: 23 },
  { id: "caravan", world: "Bernoy", journey: "Lapis out of Leg", seed: 24 },
  { id: "courier", world: "Bernoy", journey: "Dhez carries word to Leg", seed: 25 },
  { id: "quest", world: "Nouileland", journey: null, seed: 26 },
  { id: "airship", world: "Presia", journey: null, seed: 27 },
  { id: "sandbox", world: "Pyeongak", sandbox: true, seed: 28 },
];
// engine line -> module file, to say which system produced each text
const files = fs.readdirSync(path.join(ROOT, "engine/src")).filter(f => f.endsWith(".js")).sort();
const starts = []; { let line = 1; for (const f of files) { starts.push([line, f]); line += fs.readFileSync(path.join(ROOT, "engine/src", f), "utf8").split("\n").length; } }
const modOf = ln => { let m = files[0]; for (const [l, f] of starts) if (ln >= l) m = f; return m.replace(/\.js$/, ""); };
const origin = () => {
  const frames = (new Error().stack || "").split("\n").map(l => l.match(/at (?:async )?([^\s(]*)\s*\(?engine\.js:(\d+)/)).filter(Boolean).map(m => ({ fn: m[1] || "?", mod: modOf(+m[2]) }));
  const f = frames.find(x => !/05_ui/.test(x.mod)) || frames[0] || { fn: "?", mod: "?" };
  return { mod: f.mod, fn: f.fn, chain: frames.slice(0, 6).map(x => `${x.mod}:${x.fn}`).join(" < ") };
};
const plain = h => String(h ?? "").replace(/<span class="tag[^"]*">[^<]*<\/span>/g, "").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const tagsIn = h => (String(h ?? "").match(/class="tag t-(data|mixed|new)"/g) || []).length;

function makeUI(log) {
  const ui = {
    said: [], el: { loc: { innerHTML: "" }, trip: { innerHTML: "" }, modal: { querySelectorAll: () => [], querySelector: () => null } }, script: [], busy: () => false,
    rec(ch, html, extra = {}) { const o = origin(); log.push({ ch, html: String(html ?? ""), text: plain(html), tags: tagsIn(html), ...o, ...extra, t: log.g && log.g.s ? log.g.s.clock : 0 }); },
    say: async function (pages, who) { const arr = Array.isArray(pages) ? pages : [pages]; arr.filter(p => p != null && p !== "").forEach((p, k) => this.rec("SAY", p, { who: who || "", page: k + 1, pages: arr.length })); this.said.push(...arr); },
    choose: async function (prompt, options) {
      this.rec("CHOOSE", prompt, { options: options.map(o => ({ label: plain(o.label), disabled: !!o.disabled })) });
      this.said.push("CHOOSE " + prompt + " :: " + options.map(o => o.label).join(" | "));
      while (this.script.length) { const want = this.script[0], k0 = options.findIndex(o => !o.disabled && want.test(plain(o.label))); if (k0 >= 0) { this.script.shift(); return k0; } this.script.shift(); }
      let k = options.findIndex(o => o.act === "stage"); if (k < 0) k = options.findIndex(o => o.act === "thread");
      if (k < 0 && /Leave|Never mind|Stay aboard|Back|Thank|Go on|Walk on|Press on|Pass by/.test(plain(options[options.length - 1].label))) k = options.length - 1;
      if (k < 0) k = options.findIndex(o => !o.disabled);
      return Math.max(0, k);
    },
    toast(h) { this.rec("TOAST", h); this.said.push("TOAST " + h); },
    banner(t, s) { this.rec("BANNER", `${t} / ${s}`); },
    modal(h) { this.rec("MODAL", h); }, closeModal() {},
  };
  return ui;
}
const flush = () => new Promise(r => setImmediate(r));
async function drain(g) { for (let n = 0; n < 40; n++) { await flush(); const q = g.s.storyQ; if (q && q.length) { const k = q.shift(); try { await g.playStory(k); } catch (e) { g.ui.rec("ERROR", `${e.message}`); } } else break; } }

async function runOne(R) {
  const { AZ, P, w, mk } = await loadWorld(path.join(DIR, `${R.world}_rpg.html`));
  const log = [], ui = makeUI(log);
  const J = R.sandbox ? null : (R.journey ? P.journeys.find(j => j.name === R.journey) : P.journeys[0]);
  const jr = J ? new AZ.Journey(w, J) : null;
  const g = new AZ.Game(w, new AZ.Renderer(w, new AZ.Art(w, mk), mk(10, 10), mk), ui, jr, { getItem: () => null, setItem: () => {} });
  AZ.game = g; g.jr0 = jr; log.g = g;
  const lg0 = g.log.bind(g); g.log = (html, cls) => { ui.rec("LOG", html, { cls: cls || "" }); return lg0(html, cls); };
  let lastTrip = "";
  const hud = () => { try { g.hud(); const t = plain(ui.el.trip.innerHTML); if (t && t !== lastTrip) { ui.rec("HUD", ui.el.trip.innerHTML); lastTrip = t; } } catch (e) { /* the status line needs a canvas in places */ } };
  const step = async (c, r, pc, pr) => {
    const s = g.s; let h = 1;
    try { h = g.stepHours(c, r, Math.sign(c - pc), Math.sign(r - pr)); } catch (e) { h = 1; }
    if (!isFinite(h) || h <= 0 || h > 48) h = 1;
    s.c = c; s.r = r; if (s.vessel && s.aboard) { s.vessel.c = c; s.vessel.r = r; }
    s.clock += h; try { g.awakeTick(h); } catch (e) {}
    const night = AZ.Clock.light(s.clock, g.lat()).phase === "night";
    if (((s.awake || 0) >= 16 && night) || (s.awake || 0) >= 20) { ui.script = [/until dawn|Camp|camp|Anchor/]; try { await g.rest(); } catch (e) {} ui.script = []; }
    try { g.afterStep(); g.tick(); } catch (e) { ui.rec("ERROR", e.message); }
    await drain(g); hud();
  };
  const visit = async b => {
    ui.script = [/^Market/, /Food for 20 days/, /Food for 20 days/, /Food for 10 days/, /^Back/, /^Innkeeper|^Host/, /^Priest|^Shrine/, /^Captain|^Elder/, /^Townsfolk/, /^Harbourmaster: directions/, /^Thank/, /^Wainwright/, /^Thank/, /^Market/, /goods/i, /^Ask the merchant/, /^Thank/, /^Back/, /^Back/];
    try { await g.town(b); } catch (e) { ui.rec("ERROR", `town: ${e.message}`); }
    await drain(g);
  };
  if (R.sandbox) {
    const start = P.burgs.filter(b => b && b.port && b.population > 5).sort((a, c) => c.population - a.population)[2];
    g.fresh(R.seed, null, 80, { mode: "sandbox", start: start.i }); g.started(); await drain(g); hud();
    ui.rec("NOTE", `(sandbox start: ${start.name})`);
    await visit(start);
    const dest = P.burgs.filter(b => b && b !== start && b.population > 2).map(b => ({ b, d: Math.hypot(b.t[0] - start.t[0], b.t[1] - start.t[1]) })).filter(o => o.d > 12 && o.d < 40).sort((a, c) => a.d - c.d)[0]?.b;
    const p = dest && w.path(start.t, dest.t, (c, r) => w.isLand(c, r), { limit: 200000 });
    if (p) { for (let k = 1; k < p.length; k++) await step(p[k][0], p[k][1], p[k - 1][0], p[k - 1][1]); await visit(dest); }
    ui.script = [/Camp|camp/]; try { await g.rest(); } catch (e) {} await drain(g);
    ui.script = []; try { g.journal(); } catch (e) { ui.rec("ERROR", `journal: ${e.message}`); }
  } else {
    g.fresh(R.seed, null, 80, { mode: "journey" });
    ui.rec("NOTE", `(traveller: ${g.tv.name}, ${g.tv.kindLabel}; tie: ${g.tv.tie ? g.tv.tie.id : "-"}; ${g.tv.leads ? "leads" : "follows"})`);
    g.started(); await drain(g); hud();
    const cps = g.jr.cps;
    for (let i = 0; i < cps.length && !g.s.done; i++) {
      const cp = cps[i], b = cp.place.burg;
      if (i > 0) {
        const leg = cp.legIn, ch = leg && leg.chain;
        if (leg && leg.domain !== "land" && !g.s.vessel && !g.riding()) { // a vessel for water legs: through the yard, so its text is logged
          const from = cps[i - 1].place.burg;
          if (from && (from.port || w.harbour(from, "boat"))) { ui.script = [/^Hire a .* with/]; try { await g.shipwright(from); } catch (e) {} }
          if (!g.s.vessel) { const port = [from, ...P.burgs].find(x => x && w.harbour(x, "boat")); if (port) g.s.vessel = g.newVessel("boat", "hired", port, 3); }
          if (g.s.vessel) g.s.aboard = true;
        }
        if (ch) for (let k = 1; k < ch.length; k++) { await step(ch[k][0], ch[k][1], ch[k - 1][0], ch[k - 1][1]); if (g.s.done) break; if (k === Math.floor(ch.length / 2)) { try { g.journal(); ui.rec("MODAL", g.journeyHtml ? g.journeyHtml() : ""); } catch (e) { ui.rec("ERROR", `journal: ${e.message}`); } } }
        if (b) { g.s.aboard = false; await step(b.t[0], b.t[1], g.s.c, g.s.r); }
        try { g.checkCheckpoints(); } catch (e) { ui.rec("ERROR", `checkpoint: ${e.message}`); }
        await drain(g); hud();
      }
      if (b && !g.s.done) await visit(b);
    }
    try { g.journal(); ui.rec("MODAL", g.journeyHtml ? g.journeyHtml() : ""); } catch (e) { ui.rec("ERROR", `journal: ${e.message}`); }
  }
  return log.map(e => ({ run: R.id, world: R.world, ...e, day: +(e.t / 24).toFixed(2) }));
}

// ------------------------------------------------------------------ measures
const STAGE = [ // which system speaks for which stage of the hero's journey (Vogler) and act (Siegel)
  [/intro|opening/, "ordinary world / the call"], [/gather|formCompany/, "allies"], [/storyTalk|personLines/, "mentor"],
  [/moment/, "tests, allies, enemies"], [/arrival/, "crossing / approach"], [/climax/, "ordeal"],
  [/outOfOrder/, "a shortcut"], [/finish|disband/, "reward / return"], [/merchantAdvice|harbourmaster|wainwright/, "mentor"],
];
const SYS = m => /2[34]_|04_story/.test(m) ? "story" : /2[0-2]_|09_|12_|13_|14_|16_|18_|19_/.test(m) ? "mechanics" : /15_|10_|07_/.test(m) ? "journey and scenes" : "frame";
function measure(entries) {
  const M = { n: entries.length, ch: {}, words: 0, you: 0, youOf: 0, tags: 0, faults: [], sys: {}, stages: {}, choices: 0, withReason: 0, withCost: 0, days: 0 };
  const seen = new Map(), dups = new Map();
  for (const e of entries) {
    M.ch[e.ch] = (M.ch[e.ch] || 0) + 1;
    const words = e.text.split(/\s+/).filter(Boolean).length; M.words += words; M.tags += e.tags;
    M.sys[SYS(e.mod)] = (M.sys[SYS(e.mod)] || 0) + 1;
    if (/SAY|CHOOSE/.test(e.ch)) { M.youOf++; if (/\byou(r|rs|rself)?\b/i.test(e.text)) M.you++; }
    if (e.ch === "SAY" && e.text.length <= 1) M.faults.push(["a page of one character", e]);
    if (/<\/?[a-z][^>]*>|&lt;|class=/.test(e.text)) M.faults.push(["markup shown as text", e]);
    if (/\bundefined\b|\bNaN\b|\bnull\b|\[object/.test(e.text)) M.faults.push(["a missing value printed", e]);
    if (e.ch === "SAY" && e.text.length > 700) M.faults.push(["a page over 700 characters", e]);
    if (e.ch === "ERROR") M.faults.push(["an error", e]);
    for (const [re, st] of STAGE) if (re.test(e.chain)) { M.stages[st] = (M.stages[st] || 0) + 1; break; }
    if (e.ch === "CHOOSE") { M.choices++; if (/\b(because|so that|to |for |if |unless)\b|: /.test(e.text)) M.withReason++; if ((e.options || []).some(o => /🟡|\d+ ?h\b|ration|morale|day/.test(o.label))) M.withCost++; }
    // the same sentence twice in a day, from the same or another system
    for (const sen of e.text.split(/(?<=[.!?])\s+/).filter(x => x.length > 24)) {
      const key = sen.toLowerCase().replace(/[\d.,🟡]+/g, "#").replace(/\s+/g, " ");
      const prev = seen.get(key);
      if (prev && e.t - prev.t <= 24 && !(e.ch === "HUD" && prev.ch === "HUD")) { const d = dups.get(key) || { sen, n: 1, systems: new Set([prev.mod]), chans: new Set([prev.ch]) }; d.n++; d.systems.add(e.mod); d.chans.add(e.ch); dups.set(key, d); }
      seen.set(key, e);
    }
  }
  M.days = entries.length ? (entries[entries.length - 1].t - entries[0].t) / 24 : 0;
  M.dups = [...dups.values()].sort((a, b) => b.n - a.n).map(d => ({ sen: d.sen, n: d.n, systems: [...d.systems], chans: [...d.chans] }));
  M.crossDups = M.dups.filter(d => d.systems.length > 1 || d.chans.length > 1).length;
  M.places = new Set((entries.map(e => e.text).join(" ").match(/\b[A-Z][a-z'’-]{3,}(?: [A-Z][a-z'’-]+)?\b/g) || [])).size;
  return M;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.includes("--run") ? process.argv[process.argv.indexOf("--run") + 1] : null;
  if (only) { // one run per process: the engine loads once per process
    const R = RUNS.find(x => x.id === only);
    let entries = [];
    try { entries = await runOne(R); } catch (e) { entries = [{ run: R.id, ch: "ERROR", text: e.stack.split("\n").slice(0, 3).join(" "), html: "", mod: "?", fn: "?", chain: "", t: 0, tags: 0, day: 0 }]; }
    fs.writeFileSync(path.join(OUT, `${R.id}.json`), JSON.stringify(entries.map(e => ({ ...e, html: undefined }))));
    return;
  }
  const { execFileSync } = require("child_process");
  const all = [], summary = [];
  for (const R of RUNS) {
    try { execFileSync(process.execPath, [__filename, DIR, "--out", OUT, "--run", R.id], { stdio: "inherit", timeout: 600000 }); } catch (e) { console.error(`${R.id}: ${e.message}`); }
    const entries = fs.existsSync(path.join(OUT, `${R.id}.json`)) ? JSON.parse(fs.readFileSync(path.join(OUT, `${R.id}.json`), "utf8")) : [];
    fs.rmSync(path.join(OUT, `${R.id}.json`), { force: true });
    all.push(...entries);
    const M = measure(entries); summary.push({ run: R.id, ...M });
    const md = [`# Text log: ${R.id} (${R.world}${R.journey ? `, ${R.journey}` : R.sandbox ? ", sandbox" : ""})\n`, `${entries.length} entries over ${M.days.toFixed(1)} game days.\n`, "| Day | Channel | System | Text |", "|---|---|---|---|",
      ...entries.map(e => `| ${e.day.toFixed(1)} | ${e.ch}${e.page ? ` ${e.page}/${e.pages}` : ""} | ${e.mod}:${String(e.fn).replace(/^.*\./, "")} | ${(e.text + (e.options ? ` ⟶ ${e.options.map(o => `[${o.label}]${o.disabled ? "×" : ""}`).join(" ")}` : "")).replace(/\|/g, "/").slice(0, 400)} |`)];
    fs.writeFileSync(path.join(OUT, `${R.id}.md`), md.join("\n"));
    console.log(`${R.id}: ${entries.length} entries, ${M.days.toFixed(1)} days, ${M.words} words; faults ${M.faults.length}; repeated sentences ${M.dups.length} (${M.crossDups} across systems or channels)`);
  }
  fs.writeFileSync(path.join(OUT, "textlog.jsonl"), all.map(e => JSON.stringify({ run: e.run, day: e.day, ch: e.ch, mod: e.mod, fn: e.fn, text: e.text, options: e.options, tags: e.tags })).join("\n"));
  fs.writeFileSync(path.join(OUT, "measures.json"), JSON.stringify(summary.map(m => ({ ...m, faults: m.faults.map(([k, e]) => ({ kind: k, run: e.run, day: e.day, ch: e.ch, mod: e.mod, fn: e.fn, text: String(e.text).slice(0, 200) })), dups: m.dups.slice(0, 25) })), null, 1));
})().catch(e => { console.error(e); process.exit(1); });
