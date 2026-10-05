# Rules: Corruption and Insanity

Chapter VIII: Narrative Tools covers the long-term cost of a dangerous life — Insanity on
p.286–288, Corruption and Malignancies on p.288–290 — right next to Fate points, which pay a lot
of that cost back, on p.292–293. This page follows the same order and puts Fate at the end,
since it's the tool players reach for when the rest of this page is about to bite.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## Fear, in brief

Corruption and Insanity are the long-term scars left by failing **Fear tests** in the moment —
the full mechanics of Fear itself (degrees, the Shock table, test penalties) live on
[[Conditions|Rules-Conditions]]. The short version this page needs: failing a Fear test by three
or more degrees adds 1d5 Insanity points on top of whatever else happens (p.285–286).

## Insanity points

Insanity points (ISP) track accumulated psychological damage. They start at 0 and only ever
accumulate — there's no mechanical limit on sources, only on what happens once the total gets
high enough (p.286). Degrees of Trauma, a flat modifier applied to Trauma tests, and when new
Mental Disorders appear, are all keyed to the running total — Table 8–12 (p.288):

| ISP total | Degree of Trauma | Modifier | Disorder gained |
|---|---|---|---|
| 01–09 | Stable | — | None |
| 10–39 | Unsettled | +10 | — |
| 40–59 | Disturbed | +0 | 1st (Minor) at 40 |
| 60–79 | Unhinged | −10 | 2nd (Severe) at 60 |
| 80–99 | Deranged | −20 | 3rd (Acute) at 80 |
| 100+ | Terminally Insane | — | Retired from play |

**Mental Trauma:** every time ISP crosses another multiple of 10, make a Willpower test modified
by the current degree of Trauma above. Pass, and there's no lasting effect from that particular
spike. Fail, and roll on the Mental Traumas table (Table 8–13, p.288) — short-lived effects such
as a Fellowship penalty, a bout of compulsive behaviour, or a temporary phobia, with higher rolls
for worse degrees of failure (p.287).

**Mental Disorders** are permanent. Reaching 40/60/80 ISP automatically grants a new Minor,
Severe, or Acute disorder (or upgrades an existing one — a disorder must already be Minor before
it can become Severe). The GM picks the disorder, or lets the player choose. Severity changes
how hard it is to shrug off in the moment: a Minor disorder's resistance test gets +10, a Severe
disorder gets no modifier, and an Acute one gets −10 (p.287).

Spending 100 XP removes a single Insanity point with the GM's permission, representing in-game
time spent on rest and recovery — but this can never undo a degree of Madness already reached,
so a disorder already gained is never lost this way (p.289).

Deep enough Insanity blunts Fear itself: if the **tens digit** of a character's Insanity point
total is double (or more) a creature's Fear rating, that character is immune to that source of
Fear and simply doesn't test against it (p.289).

> Vash has accumulated 38 Insanity points from a brutal campaign. A sudden daemonic manifestation
> adds 4 more, crossing the 40-point line. Vash must make a Trauma test (currently at +10, the
> Unsettled modifier that applied *before* this gain) and, regardless of that result, immediately
> gains a Minor Mental Disorder, GM's or player's choice.

## Corruption points

Corruption points (CP) work the same way structurally, but measure spiritual taint rather than
mental strain: exposure to the Warp, dark rituals, forbidden lore, daemonic influence (p.288).
The GM assigns CP for specific events — the book's own guidelines include things like gaining CP
equal to a Warp entity's Fear rating when a Fear test against it fails, or 1d5–1d10 for
witnessing or performing sorcery (p.289).

**The Malignancy Test:** every time a character's CP total passes another multiple of 10, make a
Willpower test, modified by the current band on Table 8–14 (p.290):

| CP total | Degree | Malignancy test modifier |
|---|---|---|
| 01–30 | Tainted | +0 |
| 31–60 | Soiled | −10 |
| 61–90 | Debased | −20 |
| 91–99 | Profane | −30 |
| 100+ | Damned | Removed from play |

Fail the test, and roll on Table 8–15: Malignancies (p.290) — permanent physical or
psychosomatic marks such as a characteristic reduction, a new compulsion, or a minor mutation. A
result already suffered is re-rolled rather than doubled up.

> Vash is Soiled at 45 Corruption points (−10 to Malignancy tests) and picks up another 20 points
> helping contain a Warp breach, crossing from the 31–60 band into 61–90 — now Debased, and
> −20 on the next Malignancy test instead of −10.

## Fate points

Fate represents the margin between an ordinary mortal and an Acolyte the Emperor hasn't finished
with yet. It's the one resource on this page that works *for* the player rather than against
them (p.292–293).

**Fate Threshold** is the ceiling: the most Fate points a character can hold at once, and how
many they're refilled to at the start of each session. It rarely changes — the GM might raise it
for a genuinely significant accomplishment, but never casually.

**Spending** a Fate point costs one point (restored at the next session, or sooner at the GM's
discretion) for one of a fixed menu of effects:

- Re-roll a test.
- +10 to a test, chosen before rolling.
- +1 degree of success on a test that already succeeded, chosen after rolling.
- Count as having rolled a 10 for Initiative.
- Instantly remove 1d5 damage (not Critical damage).
- Instantly recover from being Stunned.
- Remove all levels of Fatigue.

**Burning** Fate is a different, much heavier move: it's what saves a character from death that
would otherwise be unavoidable — a lethal Critical result, a fall, poison, a void-ship breach.
Burning Fate permanently reduces Fate Threshold by 1 (losing any Fate points now above the new
threshold), and can be done even with zero current Fate points — the reduction simply applies at
the start of the next session instead. In exchange, the character survives, though usually left
incapacitated and out of the fight (p.292).

> Vash takes a Critical hit that the GM rules would be fatal. Vash has no Fate points left this
> session, but burns Fate Threshold anyway: next session, Vash's threshold (and refill) drops
> from 3 to 2. This session, Vash survives — badly hurt, and out of the fight, but alive.

## In Foundry

The character sheet computes **Insanity Bonus** and **Corruption Bonus** automatically as the
running total divided by 10, rounded down (`src/module/documents/acolyte.mjs`) — but this is
display-only. The Malignancy test modifier, the Fear-immunity rule for a sufficiently insane
character, the Trauma roll, and which disorder gets applied all stay manual GM calls; nothing in
the codebase reads the bonus back into those decisions.

Spending a Fate point (`actor.spendFate()`) decrements the Fate point total by one. Burning Fate
Threshold, and every individual spend effect on the list above (the re-roll, the +10, undoing
Stunned, and so on), are not automated and stay something the table applies by hand.

## Related

- [[Conditions|Rules-Conditions]] — Fear tests and what failing one does in the moment
- [[Psychic Powers|Rules-Psychic-Powers]] — Psychic Phenomena and Perils of the Warp are two of
  the biggest sources of Corruption and Insanity
- [[Damage and Injury|Rules-Damage-and-Injury]] — the Critical damage a Fate point can undo
