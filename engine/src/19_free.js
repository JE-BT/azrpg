// ---------------------------------------------------------------------------------------------
// Free roam: a sandbox option on the title screen. The world is fixed (as "Fixed"), and there is
// no night, no need to sleep and no hunger, so you can simply walk the map. Stored in the save as
// s.carefree. Time still passes and the clock still shows it; resting and inns still work.
// ---------------------------------------------------------------------------------------------
(() => {
  const G = AZ.Game.prototype;
  const free = g => !!(g && g.s && g.s.carefree);

  // always daylight: drawing, the HUD and the night walking penalty all read AZ.Clock.light
  const light0 = AZ.Clock.light;
  AZ.Clock.light = function (t, lat) { return free(AZ.game) ? { a: 0, phase: "day" } : light0.call(this, t, lat); };

  // never tired: this wraps 18_carry's exhaustion announcements too
  const awake0 = G.awakeTick;
  G.awakeTick = function (h) { if (free(this)) { this.slept(); return; } return awake0.call(this, h); };

  // never hungry: the day's rations are put back, so the store neither runs low nor runs out
  const newDay0 = G.newDay;
  G.newDay = function () {
    if (!free(this)) return newDay0.call(this);
    const s = this.s, eat = this.eaters(), keep = Math.max(s.sup.food, 3 * eat);
    s.sup.food = keep + eat; s.hunger = 0;
    const r = newDay0.call(this);
    s.sup.food = keep; s.hunger = 0; delete s.cond.hungry; delete s.cond.starving;
    return r;
  };
})();