# Changelog

## Alpha 4: markets

**The field.** Every town's price for every good blends the markets around it. Each market pulls
with a weight that falls with distance from its centre, counted in effective miles (two ports are
close by sea; a road shortens the way; open country lengthens it), and with the number of towns it
serves. The town has a voice of its own: cheaper for what it makes or its land holds as a bonus
good, dearer for what comes from far away. Towns near a centre follow it closely; towns between two
markets hear both. A market's reach follows how far apart the world's markets lie.

**Season and events.** Food is cheaper after the harvest and dearer in spring. Famine, plague, war,
sieges, occupation, disasters and closed lines move the prices of the goods they touch, in the
places they touch.

**Your own trading.** Each unit you buy or sell moves the town's price at once, a little in a city
and a lot in a village; over the following week the effect passes into the markets around it.

**A day's food and a day's work.** Every town has both, from the field, set once per world so that
the median town keeps Alpha 3's ration and wage.

**The money table.** Every cost and payment in the game is written in those two measures: food,
rooms, meals, alms, healing, fares, coaches, wages, hire, vessels, repairs, animals, carts, portal
fees, tolls, fines, diversions, mine shifts, working a passage, errands, story rewards and bounties.
Dear towns cost more and cheap towns less. A mine shift pays a day and a half's wage and a share of
the mine's own good, and vessels are priced from their timber, rope, sails and labour.

**The market screen.** Every good the town makes or the markets around it bring, with its buying
and selling price; choose one to see where its price comes from ("Sharnarthi 72%, Oim 12%, the town
itself 15%") and to buy or sell one or five.

**Starting money** follows the plan's cost, who the traveller is, and how prosperous their home
town is, with a quarter either way left to chance.

**The journal** shows a day's food, a day's work, a room, a passage and alms in the nearest town.

**Fixes.**
- F on foot, or aboard a vessel with no hands, asks you to camp (or anchor) at nightfall and when
  you grow tired; camping, F goes on in the morning.
- Delivery errands buy their goods when you take them: the cost leaves your purse at once and the
  goods go into your packs. Delivering them pays; selling them on loses the errand. An errand whose
  goods you cannot carry cannot be taken.
- A meal at a famous inn is an hour at the table, and a rest: it can never end in sleep.

**Tests.** `tests/alpha4.js` checks the field at every market centre, the design's worked example,
the median town, the money table, the mine against a crewed boat, the market screen, famine,
your own trading, starting money and the three fixes.

## Alpha 3: vessels and control

**Classes.** Every vessel has a class: skiff, boat, galley, small ship, ship, great ship, light craft
or airship. The class sets the hands she needs, what she holds (a skiff 20 rations, a boat 220, a
ship 1,500), the rivers she can use, whether she can beach, the water she prefers and how she meets
a storm. The map's transports take classes: the Rowboat is a skiff, the Sailing boat a boat, the
Sailing Ship and Steamship ships, the Modern Ship a great ship, the Dirigible an airship, and
Aircraft, Helicopters and Modern Airplanes light craft.

**Names and looks by culture.** A vessel takes the name her port's people give her class: a knarr
or a cog in Norse and Germanic ports, a felucca or a sambuk in Arabic and Persian ones, a sampan or
a junk in the east, an outrigger or a proa in the islands. Peoples with invented namebases name
their own hulls. Sails take the port's culture colour. What a yard builds follows its people:
Naval ports build everything, River and Lake ports skiffs, boats and galleys, Highland, Hunting and
Nomadic towns skiffs only.

**Who decides aboard.** One control table answers the same eleven questions for six arrangements:
passenger, signed crew, hirer, owner, company and (for Alpha 7) under command. The game reads it for
who eats from your stores, how long hands left aboard will wait, whether a crew keeps watches or
calls for stops, what hands do when they give up waiting, and who decides in a storm. The journal
shows your row.

**The shipwright.** Harbours, and landings in river towns, have a yard: hire a vessel with hands,
buy one, hire and dismiss hands for your own, repair her, or sell her. Prices follow the town's
market and tax; repairs take a class's own time (four hours for a skiff, two days for a ship).

**Courses and storms by class.** F and waypoints keep boats, skiffs and galleys near the coast and
ships and great ships off it. Storms are worse offshore for small hulls and near land for large
ones; a ship caught near land can claw off into open water.

**Rowing and portage.** A skiff is rowed: hours at the oars tire you half as much again as hours
walking. She can be carried over land at twice the walking time.

**Watches.** A crew sails round the clock only with hands enough for two watches: fifteen for a
ship, forty for a great ship. With fewer, they call for a stop at dusk. Light craft set down for the
night over land.

**Porters.** An owner or a company can bring hands ashore as porters. Each carries 10 rations and 2
units more, eats from your pack, and loses heart on land.

**Pack animals, carts and wagons.** Stables in every town sell a pack animal (a mule, a camel, a
reindeer or a packhorse, by the land and its people), a cart or a wagon. They carry 40, 120 or 300
rations more. Carts slow off the roads and wagons crawl; animals graze on open ground and eat your
food elsewhere. None of them can go aboard: board in a town and they wait in its stables.

**The warehouse.** Every town keeps a warehouse. Leave goods or food there for a deposit of a
twentieth of their value and a hundredth a week, due when you collect; anything left a year is sold
to cover the fees. When you have more than you can carry in a town, you choose: store it or sell
it.

**Saves.** Alpha 2 saves load: vessels take the class of their kind.

**Tests.** `tests/alpha3.js` checks the tables, the shipwright, capacity, watches, courses, storms,
rowing and portage, porters, the warehouse, the stables, light craft and old saves.

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
