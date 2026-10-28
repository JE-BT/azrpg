# Options: where every choice comes from, and where it shows

Alpha 6, after the first playtest round. The Story screen's Decision panel gathers options from every
system; each option answers in the Information panel. Pop-ups (decisions, scenes, warnings) belong to
the planned world: if one arises while Story is open, World (on foot) or Journey (carried) comes up.

## The Decision panel on Story (3)

Options are grouped in this order. Arrow keys move through them from top to bottom; Enter chooses.

| Group | Option | Source system | When it shows |
|---|---|---|---|
| (state) | Wake up | sleep routine | asleep: the only option |
| (state) | Stop: *task* | tasks | writing, copying, planning, gossip: while it runs |
| (state) | Go to bed now · Not yet: keep the day going | end of the day | after End the day, before bedtime |
| The journey and your stories | ★ the plan's task at this stop (book passage, give alms, rest at the inn, …) | the journey (`pendingActs`) | in a stop's town |
| | ◆ the side-story step here | side stories (`threadSteps`) | in the town the step names |
| Lodging and faith | Inn: a room until morning (now the end of the day at the inn) | town | every town |
| | Give alms at the temple or shrine | town | every town |
| | Innkeeper, Priest, shrine-keeper | town people | by town |
| | Ask the priest to treat your fever | town | fevered or gravely ill |
| Trade | Market: food and goods (sub-menu in the Information panel) | markets | every town |
| | Merchant, Warehouse | town people, warehouses | by town |
| Passage | Harbour and coach office: sailings, coaches, boats for hire (sub-menu) | living world, vessels | ports and towns on a coach line |
| | Board the *ship* | voyages | booked, in port |
| | Harbourmaster, Shipwright, Stables and wainwright | town people, vessels, animals | by town |
| | Have the vessel repaired | vessels | damaged and in port |
| | Night orders for the vessel | narrator (crew) | own vessel in port |
| Work, news and people | Notice board: work and errands | side stories | every town |
| | Visit the *marked place* (in or beside the town) | markers | by town |
| | Elder, the Watch and other town people | town people | by town |
| The vehicle | Plan with the captain (or coachman) · 1 h | voyages | carried |
| | Gossip with the passengers · 1 h | voyages, rumours | carried |
| | Dice on deck · an evening | voyages | carried at sea |
| | Wait aboard until she sails | voyages | carried, in port |
| | Take the helm · Hand the helm to the crew | own vessel | aboard, with crew |
| | Give the crew a new course: the next stop, the nearest port, the side story, a known town | own vessel | aboard, crew at the helm |
| | Talk to the crew · 1 h | own vessel, rumours | aboard, with crew |
| The company | Ask *name* and the others what next | the company | travelling with one |
| | Look around together | the company | travelling with one, outside towns |
| Here | Visit the *marked place* · Board your *vessel* · Go ashore | the old Space key | at or facing one |
| Food from the land and water | Wait, fish or forage… · Heave to, anchor or put lines over… | provisions | on land outside towns; own vessel |
| Documents | Write up the notebook · ½ h | knowledge | prices seen in the last three weeks, not yet written |
| | Copy the sailings board · 1 h | knowledge | in a port, the board read today |
| The day | End the day: a room at the inn · camp here · sleep aboard · the crew's night · sleep under the eaves | sleep routine | always |
| | Sleep until dawn, now | sleep routine | always |
| | Go to the nearest town (or port) | knowledge (places you know) | not carried |
| | Set the default sleep routine: bedtime, waking, the crew at night, the company at night | sleep routine | always |

At night most of a town is asleep: market, merchants, harbour, shipwright, stables, notice board and
most people show "asleep: come back in the morning". The inn, the temple and the priest stay open.

## The Information panel on Story (3)

Every option answers here, and sub-menus (the market, the harbour, a marked place, the company's
advice, the crew's course, the sleep routine) are chosen here. Make a note (N) copies the answer into
the notebook (Memory, Inventory). Below it: the busy or sleeping state, the arrival result, the
planning window and the story so far.

## Pop-ups in the planned world (World 4, Journey 5)

| Class | Stops the clock | Pop-up | Options |
|---|---|---|---|
| Decision | yes | The day card, at dusk (or the check-in you chose) | carried: Carry on (sleep while she sails on) · own vessel: End the day · walking: Camp; then Options (Story), Pause here |
| Decision | yes | The crew calls for a stop at dusk | anchor, heave to, sail on; make it a standing order |
| Decision | yes | Storms, tolls, fords, border and road checks, ambushes on the way, events at marked places met on the road | each event's own |
| Decision | yes | A task finished on foot while you were travelling | Continue walking · Options (Story) · Pause here |
| Warning | yes | Food: two days left on land, five at sea (not while in a market town) | Continue · Head for the nearest town or port · Options (Story) · Pause here |
| Warning | yes | Health: hurt, fevered, gravely ill (close to collapse) | Continue · Head for the nearest town (a healer) · Options · Pause |
| Warning | yes | Exhaustion: 48 hours awake (collapse at 52) | Continue · End the day now · Options · Pause |
| Warning | yes | The crew's patience nearly gone | Continue · Head for the nearest port · Options · Pause |
| Scene | setting, on | Story beats, the company speaks, arrival at a stop, "you stop at the side of the road to …" | read and go on |
| Note | setting, off | Sightings, catches, weather, 20 hours awake, a task done | into the feed and the ticker |
| Routine | never | Eating, camping, steady wind | folded into the day card |

## Options outside Story

| Where | Option |
|---|---|
| World (4): a tile's card | Walk there · Sail there (the crew) · Set as target |
| World (4): tools | Lens · Info · Reach · Hours · zoom · Map |
| Journey (5): the vehicle | Take the helm · Hand the helm to the crew · Sail on to the next stop |
| Inventory (2) | Write up the notebook · Copy the sailings board (they start when the clock runs) |
| Memory (1) | A place or lead: make it your target · a side story: put it in focus |
| The bottom bar | ❚❚ ▶ ▶▶ ▶▶▶ · Play a day · Check in (rule) — World and Journey only |

The same choice can come from two places: the day card's End the day and Camp start the same routine
as Story's End the day; a warning's Head for the nearest town is Story's Go to the nearest town; the
helm is on Journey and Story; the notebook and the sailings board are in Inventory and Story.
