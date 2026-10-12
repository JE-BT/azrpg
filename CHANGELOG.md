# Changelog

## Alpha 2.1

The bridge between Alpha 2 and Alpha 3: fixes from the first public tests of Alpha 2.

**Vessels.**
- Damage belongs to the vessel. It goes with the boat when she is lost or handed back, and the next
  boat starts sound. Repairs need the boat in that town's harbour.
- Collapsing from hunger or fever aboard your own vessel: the crew, or a passing fishing boat,
  brings her into the nearest harbour, where she waits with her damage. A hired boat goes back to her
  owner.
- F aboard your own vessel follows the plan's course to the next checkpoint (the gold line) from
  wherever she is: a harbour, a detour, or a stretch you steered yourself. She joins the course at the
  nearest point ahead of where she left it.
- Crews that sail round the clock (ships the map gives 24 hours a day) keep watches: after a long
  day aboard you turn in below for eight hours while the watch sails on.

**The hold, and the crew while you are ashore.**
- What you can carry follows how you travel: your vessel's hold (220 rations, 30 units of goods)
  while you are aboard or in the town where she lies; 60 rations and 10 units with a booked passage;
  20 and 6 on foot.
- When you leave your vessel, what you cannot carry stays in her hold, and it is yours again when
  you return.
- Going ashore where hands stay aboard, you choose how much food to take. The hands eat from what
  you leave. They keep enough for the run to the nearest harbour and wait as long as food and morale
  allow: about three weeks at high morale, ten days at middling, four at low, and half as long again
  for the company's own hands. Then they sail. A hired crew takes the boat back to her owner; an
  owned boat's crew brings her into port and quits; the company's hands take her into port and wait
  there. Leave them too little for the run and the mate blocks the way.
- In harbour the hands eat from the hold, then ashore at your cost.
- The journal and the status line show where your vessel lies, what is in her hold, and how long
  the hands will wait.

**Time and sleep.** Hours spent on things count as hours awake: repairs, alms, healing, reading,
paid work, detours and scenes. Nights at inns and taverns, and two days' rest, are sleep. A stretch of
twenty hours or more includes a night's sleep.

**Sandbox.** Harbours and markets open in a fixed world and in free roam.

**Journeys.** The reasons for each leg describe land, air and teleport legs as what they are; they
all read as hired boats before. The design notes for Alpha 3 to Alpha 7, with a control table and a
worked example for each version, are in `docs/DESIGN.md`; `docs/JOURNEYS.md` shows map makers how
Alpha 5 will read their journeys.

**Tests.** `tests/vessels.js` checks all of the above on any world. The scripted journey mends its
hull in harbour; its bar is three checkpoints, since F now keeps to the plan's longer coastal course.

## Alpha 2

**A changing world.** Markets, passenger lines, hazards and wars run day by day from the world's
seed. Harbours and coach offices post fixed timetables; lines stop for war, bad relations,
occupation, quarantine and disaster. Disease spreads along trade routes; famine follows empty
granaries and halves the food a town can sell. The wars under way in the map are fought out:
regiments march, towns are besieged and fall, peace returns them. News travels about 60 miles a
day.

**Modes.** Journey or Sandbox on the title screen; Sandbox in a changing or a fixed world.

**Journeys by type.** The journey's type (Quest, Caravan, Pilgrimage, Raid and fourteen more)
shapes the travellers, the company and the reasons given for each leg. Every stop wording does
something: gathering the company, rumours, booking, loading the company's own vessel, resupply,
alms, rest, camp, anchor, bounties. A leader named in the journey's title leads it. Journeys may
start away from any town. Air journeys fly in the company's craft; teleport legs cross at once.

**Travel.** Passenger lines by sea and road, including long sailings along each named sea lane;
refusal or higher fares from states hostile to yours; harbours within a short walk of town; boats
on rivers; fords by river size; storms that grow worse away from land and can sink a boat; crews
on rivers; three strikes before a mutiny; portals with fees and misfires.

**The traveller.** Purses vary; each traveller has a trait (long-legged, haggler, sea legs, hardy,
well-connected). Moving targets are found by their last known position, tracks and news. Camping
depends on the place. Exhaustion and falling asleep are announced. The journal lists what you
carry, and leaving a vessel you keep only what you can carry.

**The map.** Clearer mountains and hills, an Effort lens for travel on foot, lens readings on the
world map, known passenger lines on the world map.

**Building.** Maps saved with Unix line endings; maps with damaged characters in notes; older maps
that list biome icons by name; grid overlays outside 1–20 miles replaced by 5-mile squares.

## Alpha 1

The first playable version: a tile world built from an Azgaar map, procedural pixel art, an
inspector and lenses for every map layer, the map's journey as checkpoints with par times, booked
ships and hired boats with crews, seasons and daylight by latitude, weather, prices from market
data, food, trading between markets, fishing and foraging, events at marked places and zones,
travellers drawn from the map, errands from notice boards, rumours and leads, and saves in the
browser.
