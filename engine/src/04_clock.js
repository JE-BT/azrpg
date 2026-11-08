// =============================================================================================
// 04_clock.js · the clock, the tags and the journey (extracted from Alpha 6's 04_story.js).
//   Time is a number of hours since Day 1, 00:00. Nothing advances it but the player's steps and
//   the choices that take time. Dawn and dusk follow the latitude and the day of the year.
//   The map's journey is read into legs (moving segments) and stays; 08_nav turns them into
//   checkpoints, and 32_quests shows the checkpoints as the quest log.
// =============================================================================================
AZ.T = k => `<span class="tag t-${k}">${k}</span>`;

AZ.Clock = {
  doy0: 80, // spring equinox by default
  dayLength(lat, doy) {
    const decl = (23.44 * Math.sin((2 * Math.PI * (284 + doy)) / 365) * Math.PI) / 180;
    const x = -Math.tan((lat * Math.PI) / 180) * Math.tan(decl);
    if (x >= 1) return 0;
    if (x <= -1) return 24;
    return (2 * Math.acos(x) * 180) / Math.PI / 15;
  },
  sun(t, lat) {
    const day = Math.floor(t / 24), hour = t - day * 24, dl = this.dayLength(lat, (this.doy0 + day) % 365);
    return { day, hour, dl, rise: 12 - dl / 2, set: 12 + dl / 2 };
  },
  light(t, lat) {
    const s = this.sun(t, lat);
    if (s.dl >= 24) return { a: 0, phase: "day" };
    if (s.dl <= 0) return { a: 0.55, rgb: [70, 84, 150], phase: "night" };
    const h = s.hour;
    const dist = h < s.rise ? s.rise - h : h > s.set ? h - s.set : -Math.min(h - s.rise, s.set - h);
    if (dist <= -1) return { a: 0, phase: "day" };
    if (dist <= 0) return { a: 0.25 * (1 + dist), rgb: [255, 190, 140], phase: h < 12 ? "dawn" : "dusk" };
    if (dist <= 1) return { a: 0.25 + 0.3 * dist, rgb: AZ.U.mix([255, 190, 140], [70, 84, 150], dist).map(Math.round), phase: h < 12 ? "dawn" : "dusk" };
    return { a: 0.55, rgb: [70, 84, 150], phase: "night" };
  },
  nextDawn(t, lat) {
    const s = this.sun(t, lat);
    let dawn = s.day * 24 + Math.max(0, s.rise);
    if (dawn <= t) dawn = (s.day + 1) * 24 + Math.max(0, this.sun((s.day + 1) * 24, lat).rise);
    return dawn;
  },
  nextDusk(t, lat) {
    const s = this.sun(t, lat);
    let dusk = s.day * 24 + Math.min(24, s.set);
    if (dusk <= t) dusk = (s.day + 1) * 24 + Math.min(24, this.sun((s.day + 1) * 24, lat).set);
    return dusk;
  },
  fmt(t) {
    const day = Math.floor(t / 24), h = t - day * 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return `Day ${day + 1}, ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  },
  span(h) {
    const neg = h < 0; h = Math.abs(h);
    const d = Math.floor(h / 24), r = Math.round(h - d * 24);
    const s = d ? `${d} d ${r} h` : `${r} h`;
    return neg ? "-" + s : s;
  },
};

// transports that fly, from the map's own list; teleports cross a leg at once
AZ.airNames = new Set();
AZ.isTeleport = kind => /teleport/i.test(kind || "");

AZ.Journey = class {
  constructor(w, J) {
    this.w = w; this.J = J;
    for (const t of w.W.transports || []) if (t.domain === "air") AZ.airNames.add(t.name);
    let t = 6;
    this.course = new Set();
    this.segs = J.segments.map((s, k) => {
      const seg = { ...s, k, moving: s.transport !== "Stay" && s.domain !== "stay" && s.speed > 0 };
      const pts = s.points.length ? s.points : [[0, 0, s.from]];
      seg.startTile = w.tileAt(pts[0][0], pts[0][1]);
      seg.endTile = w.tileAt(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      seg.planStart = t;
      if (!seg.moving) t += s.duration || 0;
      else {
        seg.travelHours = s.miles / s.speed;
        seg.chain = this.chain(pts);
        seg.chainPos = new Map(seg.chain.map(([c, r], i) => [w.idx(c, r), i]));
        seg.chain.forEach(([c, r]) => this.course.add(w.idx(c, r)));
      }
      seg.planEnd = t;
      seg.place = this.placeFor(seg);
      return seg;
    });
    this.replan();
    this.totalMiles = this.segs.reduce((a, s) => a + (s.moving ? s.miles : 0), 0);
    // the start is where the first segment begins; a journey that starts in the wilds takes the
    // nearest town as home, however far
    const s0 = this.segs[0], b0 = w.P.burgs[w.C.burg[s0.from]];
    if (b0) this.origin = { burg: b0, name: b0.name, tile: b0.t, at: true };
    else {
      const nb = this.nearestBurg(s0.startTile);
      this.origin = { burg: nb, name: nb ? `the wilds ${AZ.U.compass(s0.startTile[0] - nb.t[0], s0.startTile[1] - nb.t[1])} of ${nb.name}` : w.waterName(...s0.startTile), tile: s0.startTile, at: false };
    }
    const end = this.segs[this.segs.length - 1].place;
    this.dest = end.burg ? end : { ...end, burg: this.nearestBurg(end.tile) };
  }
  nearestBurg(t) {
    let best = null, bd = 1e9;
    for (const b of this.w.P.burgs) if (b) { const d = Math.hypot(b.t[0] - t[0], b.t[1] - t[1]); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  // the plan's times: Day 1 starts at dawn at the origin; modes with fewer than 24 hours a day
  // travel from dawn for their hours each day
  replan() {
    const w = this.w, lat0 = w.latlon(...this.segs[0].startTile)[0];
    let t = AZ.Clock.sun(0, lat0).rise;
    if (!isFinite(t) || t < 0 || t > 12) t = 6;
    this.t0 = t;
    for (const seg of this.segs) {
      seg.planStart = t;
      if (!seg.moving) t += seg.duration || 0;
      else if (seg.hoursPerDay >= 24) t += seg.travelHours;
      else {
        const lat = w.latlon(...seg.startTile)[0];
        let rem = seg.travelHours, guard = 0;
        while (rem > 1e-6 && guard++ < 5000) {
          const sun = AZ.Clock.sun(t, lat), dawn = sun.day * 24 + Math.max(0, sun.rise);
          if (t < dawn) t = dawn;
          const avail = dawn + seg.hoursPerDay - t;
          if (avail <= 1e-6) { t = (sun.day + 1) * 24 + Math.max(0, AZ.Clock.sun((sun.day + 1) * 24, lat).rise); continue; }
          const use = Math.min(avail, rem);
          t += use; rem -= use;
        }
      }
      seg.planEnd = t;
    }
    this.planEnd = t;
  }
  chain(pts) {
    const w = this.w, out = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
      const steps = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / (w.size * 0.25)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, tile = w.tileAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        const last = out[out.length - 1];
        if (!last) out.push(tile);
        else if (tile[0] !== last[0] || tile[1] !== last[1]) {
          if (tile[0] !== last[0] && tile[1] !== last[1]) { const a = [tile[0], last[1]], b = [last[0], tile[1]]; out.push(!w.isLand(...a) ? a : b); }
          out.push(tile);
        }
      }
    }
    const clean = [];
    for (const t of out) {
      if (clean.length >= 2 && clean[clean.length - 2][0] === t[0] && clean[clean.length - 2][1] === t[1]) { clean.pop(); continue; }
      const l = clean[clean.length - 1];
      if (!l || l[0] !== t[0] || l[1] !== t[1]) clean.push(t);
    }
    return clean;
  }
  placeFor(seg) {
    const w = this.w, cell = seg.to, bid = w.C.burg[cell];
    if (bid) return { burg: w.P.burgs[bid], name: w.P.burgs[bid].name, tile: w.P.burgs[bid].t, at: true };
    const tile = seg.endTile;
    // a town named in this stage or in the stay that follows ("A night at anchor near Slof")
    const next = this.J.segments[seg.k + 1];
    for (const text of [next && next.from === seg.to ? next.name : "", seg.name]) {
      const words = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}'-]+/gu, " ")} `;
      const named = w.P.burgs.filter(b => b && b.name && words.includes(` ${b.name.toLowerCase()} `));
      if (named.length) {
        const b = named.sort((a, c) => Math.hypot(a.t[0] - tile[0], a.t[1] - tile[1]) - Math.hypot(c.t[0] - tile[0], c.t[1] - tile[1]))[0];
        if (Math.hypot(b.t[0] - tile[0], b.t[1] - tile[1]) < 60) return { burg: b, name: `near ${b.name}`, tile, at: false };
      }
    }
    const near = w.near(tile[0], tile[1], 30).find(n => n.kind === "burg");
    if (near) return { burg: near.o, name: `near ${near.o.name}`, tile, at: false };
    return { burg: null, name: w.isLand(...tile) ? "the wilds" : w.waterName(...tile), tile, at: false };
  }
  // where is (c, r) along a moving stage? {pos, frac, off}
  progress(seg, c, r) {
    if (!seg.moving) return null;
    const k = seg.chainPos.get(this.w.idx(c, r));
    if (k !== undefined) return { pos: k, frac: k / Math.max(1, seg.chain.length - 1), off: 0 };
    let best = 0, bd = 1e9;
    seg.chain.forEach(([a, b], i) => { const d = Math.hypot(a - c, b - r); if (d < bd) { bd = d; best = i; } });
    return { pos: best, frac: best / Math.max(1, seg.chain.length - 1), off: bd };
  }
};
