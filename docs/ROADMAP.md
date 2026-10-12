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

## Alpha 3: vessels and control

Every vessel, and in time every vehicle, is described by its **class** (what she is), her
**realisation** (what the culture of her port calls her and how she looks) and her **control** (who
steers, who calls the stops, who feeds whom, what F does, when you sleep). The arrangements Alpha 2
grew one at a time (booked passage, hired boat, owned boat, company vessel) become rows of one
control table, with a new row, *under command*, for Alpha 7.

1. One vessel record for class, realisation, control, hold, damage and crew.
2. The control table as data.
3. Classes from skiff to great ship, airships and light craft; the map's transports mapped onto
   them; the Rowboat as a skiff you row yourself.
4. Courses by class: boats keep near the coast, ships keep off shoals.
5. Storms by class and distance from land.
6. Names and looks by the culture of the port.
7. The harbour as a market for vessels: hire, buy, sell, crew, repair.
8. Hands brought ashore as porters.
9. Pack animals, carts and wagons on the same lines.

*Control table: who decides aboard. Worked example: a hired boat on the pilgrimage to Chelhazpo.*

## Alpha 4: markets

1. A market screen that lists every good in the region, made locally or carried in from the
   centre.
2. Demand from population, goods and the map's trade deals, so one sale cannot halve a price.
3. Town prices: carriage from the market centre, and a local glut from your own trading that
   spreads to the region over a week.
4. Errands that move goods in and out of market stock; shortages that post errands.
5. **Funding a long journey.** Long journeys cost more than a single traveller can carry. Ways to
   pay for them, each drawn from the map: a company purse, pooled at the Gathering and backed
   according to the journey's type; a patron's writ from a ruler, temple or guild, honoured in
   friendly states and dangerous in hostile ones, with real political stakes; paid work before
   setting out; credit from merchants and temples, repayable at the destination; and difficulty
   levels that set how much money there is.

*Control table: how goods and money change hands. Worked example: ten units of wood and one of
jewellery at Froi.*

## Alpha 5: stories

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
5. **News of the unseen:** a crew sailing off, a carrier robbed, a town falling, all heard at news
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
