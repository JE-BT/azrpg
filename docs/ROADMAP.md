# Roadmap

azrpg is in alpha. These are the directions planned for the next versions. Each is designed on
paper before it is built. The design notes, with a control table and a worked example for each
version, are in [DESIGN.md](DESIGN.md).

The order follows what each version needs from the ones before it. Control of vessels comes first,
because the economy's carriers, the company's decisions and the army's orders all use it; war comes
last, because it uses everything else. Each version ends in a playable release and a round of
public tests.

## Alpha 2.1: the bridge

Fixes from the public tests of Alpha 2, released ahead of Alpha 3: damage that belongs to the
vessel, F following the plan's course from anywhere, the vessel's hold and the crew left aboard,
watches for round-the-clock crews, waking hours that count, harbours and markets in a fixed world.
See [CHANGELOG.md](../CHANGELOG.md).

## Alpha 3: vessels and control (released)

Every vessel, and every land vehicle, is described by its **class** (what she is), her
**realisation** (what the culture of her port calls her and how she looks) and her **control** (who
steers, who calls the stops, who feeds whom, what F does, when you sleep). The arrangements Alpha 2
grew one at a time (booked passage, hired boat, owned boat, company vessel) are rows of one control
table, with a row, *under command*, waiting for Alpha 7.

Built: one vessel record; the control table as data; eight classes, with the map's transports
mapped onto them and the Rowboat as a skiff you row and carry; courses and storms by class; names
and looks by the port's culture; shipwrights in harbours and river towns; hands ashore as porters;
pack animals, carts and wagons, with stables. Added on the way: a warehouse in every town, so that
what you cannot carry can be stored for a deposit and a weekly fee.

*Control table: who decides aboard. Worked example: a hired boat on the pilgrimage to Chelhazpo.*

## Alpha 4: markets (released)

Built on the economy the map already has: markets, which work like watersheds with a centre of
gravity, and goods, spread over the land by Azgaar's spread functions and each cell's bonus good.
The economy that comes out of them is emergent; the game balances money.

1. **The field.** Every town's price for every good blends the markets around it, each pulling
   with a weight that falls with distance from its centre (counted by sea, road, trail or open
   country), and the town's own voice: cheaper for what it makes, dearer for what comes from far
   away. Towns near a centre follow it closely; towns between two markets hear both.
2. **The day's food and the day's work.** Two local measures from the field, calibrated so the
   world's median town keeps today's prices.
3. **The money table:** every cost and payment in the game (food, inns, alms, healing, fares, hire,
   wages, vessels, animals, tolls, mines, errands, bounties, sales, starting money) written in those
   two measures and read by the game.
4. **A market screen** listing every good, made here or brought in, and where its price comes from.
5. **Season and events:** harvests, famine, plague, war, sieges and closed lines in prices.
6. **Your own trading**, felt in the town first and its neighbours later.
7. **Starting money** from the plan's cost, who the traveller is, and how prosperous their home is.
8. **Funding a long journey:** a company purse, a patron's writ, credit. Waiting for a later
   version; the money table already has their rows.

*Control tables: what moves a price; what costs and what pays. Worked examples: four towns on
Pyeongak; the mine, the boat, and a stranded start.*

## Alpha 4.1 (released)

Fixes and people: goods are sold where the map has them; skiffs stay in the water unless carried;
the merchant reads the markets for you; the harbourmaster gives directions and watches vessels; the
wainwright reads the road and sells riding horses; animals go aboard small ships and larger.

## Alpha 5: stories (released)

Built: story types, hook finders, story shapes, the builder that fits a story to any number of
stops, beat scenes played through the game's systems, out-of-order stops, and the end of a journey.
Waiting for a later version: stop wordings read through the family, stops called by the company's
rule, and beats from the changing world. See [STORIES_BERNOY.md](STORIES_BERNOY.md).


Each journey type gets a story shape (three acts, the hero's journey, five rooms, the long voyage,
the marches, slay the dragon, the chase, mystery, nodes, siege, the underdog), filled from the
places where the type's main layers of the map meet along the route. A pilgrimage's story comes from
faiths and cultures, a caravan's from markets and goods, a campaign's from states and armies.

1. The story shapes as data.
2. Hook finders for every layer, first as a report a map maker can read
   (`python -m azrpg hooks <World>`).
3. The story builder, and a story page in the journal.
4. Stops read through the type's main layers (see [JOURNEYS.md](JOURNEYS.md)).
5. Movement and leadership: free movement, collective decisions, a leader who decides after
   discussion, or orders; the player may lead where the type allows it.
6. Story scenes on the legs and at the checkpoints, with outcomes that later scenes remember.
7. Story beats from the changing world: wars, plagues and famines on the route.

*Control table: who decides in the company. Worked example: Culzan and the road through the
forest.*

## Alpha 5.1: the story, hidden (released)

The narrative design in [NARRATIVE.md](NARRATIVE.md), built: the premise (tie, lead or follow) as part
of the character; any journey from the title screen; the company at the start; arcs, weighted
structures and leg roles with objectives in the corner; moments on the way; people who carry the
story and help with the systems; regard and suspicion as one system, brought forward from Alpha 7;
provisions for the road; side stories you can pick.

## Alpha 6: traffic and knowledge

1. **Traffic.** The ships, coaches and wagons of every passenger line and trade flow are drawn
   where their timetables put them, carry stock between markets, and can be hailed for their
   timetables, prices and news; a density limit and a switch keep the map readable. Following the
   traffic is a way to find trade.
2. **Your own carriers:** a wagon or a boat on a run you set, reporting by letter.
3. **Charts.** Every place carries the date of the last thing you learned about it, from what you
   saw, the news you heard, or a chart. Charts are bought at libraries and harbours, are dated when
   drawn, and can be traded with captains; some are wrong. Lenses show your chart; Sandbox adds a
   view of the true world.
4. **Rumours of prices** from real gaps between markets, older and vaguer with distance.
5. **Caches.** Goods buried away from towns, marked on your own chart and nowhere else; the longer
   they lie, the likelier someone finds them.
6. **News of the unseen:** a crew sailing off, a carrier robbed, a town falling, all heard at news
   speed.

*Control table: what you know, and how old it is. Worked example: is wood worth carrying from Froi
to Bres?*

## Alpha 7: war

1. Alert levels for towns and roads near a war, as a lens and in the inspector.
2. Allegiance (papers, dress, speech, faith, flag) and checks at gates, harbours, pickets and
   camps.
3. Outcomes with consequences: detention, conscription, confiscation, arrest, escape.
4. Camps for every regiment; an enemy camp is the most dangerous place in the world.
5. Service: a soldier follows the unit's march, and leaving it is desertion.
6. Blending in: dress bought in a culture's markets, speech learned among its people, rites learned
   at its temples; spying errands that need them.
7. Campaigns and raids that join the wars of the changing world.
8. Death, if it comes to azrpg at all, as the design notes leave it to be decided.

*Control table: the check. Worked example: the gate of Bjerklaus.*

## Beta

**Land, control and contestation.** Each place will carry four layers: who claims it, who actually
controls it, whom its people identify with, and who else recognises the claim. Contestation arises
where these differ: frontiers, occupation, peoples without a polity, rival claims. Polities other
than states (leagues of towns, temple lands, nomadic confederacies, village self-rule) form and
fade where people, surplus and a defensible centre come together. Borders move through this
process, and Alpha 7's checks follow control on the ground.

**A growing network.** Passenger lines and trade runs open where trade grows and after peace, and
close when unused.

**A record of play.** Export a journey's record: route, events, the story's beats, and what changed
in the world.

## Release

Performance on large maps, balance across many worlds, saves that carry across versions, and full
documentation for map makers.
