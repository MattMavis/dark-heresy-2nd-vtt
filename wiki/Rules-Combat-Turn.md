# Rules: Combat Turn

The Core Rulebook never gathers the action economy into one place — Initiative is on p.216,
action types are on p.217–218, the individual actions are scattered across p.218–225, and
movement rates are all the way out on p.244–245. This page puts the pieces next to each other.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## Structured time

Combat runs in **structured time**: rounds, turns, and actions, instead of the looser
*narrative time* used for travel and investigation (Core Rulebook p.215). A **round** is
everyone at the table taking one turn each, and represents roughly five seconds of game world
time no matter how many combatants are involved. A **turn** is one character's slice of that
round, taken in Initiative order.

### Starting a combat encounter

When a fight breaks out, the book lays out six steps (p.216):

1. **Surprise** — the GM decides who, if anyone, is Surprised.
2. **Set the Scene** — the GM describes what's visible: combatants, positions, environment.
3. **Determine Initiative** — everyone rolls.
4. **Combatants Take Turns** — in Initiative order.
5. **Round Ends** — anything lasting "until the end of the round" expires.
6. **Encounter Ends** — repeat 4–5 until the fight is over.

## Initiative

Each character rolls 1d10 and adds their Agility bonus; the GM rolls once per group of similar
NPCs rather than individually (p.217). Highest total goes first. Ties break first by Agility
characteristic, then by a fresh 1d10 roll-off. The order, once set, holds for the rest of the
encounter — new arrivals are simply slotted in at whatever Initiative they roll.

> Vash (Agility Bonus 4) and a pair of cultists (Agility Bonus 3, same group roll) open a fight.
> Vash rolls 6, total **10**. The cultists roll 5, total **8**. Vash acts first.

## Surprise

If anyone is caught unaware, the first round is a **Surprised round** (p.216–217). Surprised
characters still roll Initiative and occupy a slot in the order, but lose their turn entirely
and cannot take Reactions. Everyone else acts normally. A non-Surprised attacker gets **+30** to
Weapon Skill or Ballistic Skill against a Surprised target. Once the Surprised round fully
resolves, the formerly-Surprised characters act normally from then on, still in the Initiative
slot they originally rolled.

## Action types

Every action has a **type**, which governs how many of it you can take, and one or more
**subtypes**, which govern what it can be combined with.

| Type | How many per turn | Example |
|---|---|---|
| Full Action | One, and no Half Actions that turn | Charge, Run, All Out Attack |
| Half Action | Two *different* Half Actions | Standard Attack, Aim, Move |
| Reaction | One per round, only when it isn't your turn | Evasion |
| Free Action | As many as the GM finds plausible | A shouted warning, dropping an item |
| Extended Action | Started on your turn, finished over later rounds | Reloading a bulky weapon |

A character's turn is therefore either **one Full Action**, or **two different Half Actions** —
never two Full Actions, and (per the book's wording) not the same Half Action twice, though a
few actions (Ready is the explicit example) say otherwise in their own description. Free Actions
ride along with anything, on your turn or not, within reason (p.217–218).

### What can't be combined

Two further limits apply on your own turn, though not to Reactions taken off it (p.218):

- **Only one Attack-subtype action per turn.**
- **Only one Concentration-subtype action per turn.**

Sustaining a psychic power (almost always a Concentration action) doesn't count as "taking an
action" for this limit, so a psyker sustaining one power can still Aim or attack normally.

> Vash spends a Half Action to Aim (Concentration subtype), then a second Half Action to make a
> Standard Attack (Attack subtype). Legal: two different Half Actions, one Attack, one
> Concentration. Vash could not follow that with a Called Shot the same turn — that would be a
> second Attack-subtype action.

## Leaving melee

Moving away from an engaged opponent is only safe if you use the **Disengage** action (Full
Action, Movement subtype): a Half Move with no retaliation. Leave melee by any other means — for
example, just moving away as part of a different action — and each opponent still engaged with
you may make a Standard Attack against you as a Free Action (p.219–220).

## Movement

Movement is governed by the Movement subtype and keyed off Agility Bonus (AgB). Table 7–23 (p.245):

| AgB | Half Move | Full Move | Charge | Run |
|---|---|---|---|---|
| 0 | 0.5 | 1 | 2 | 3 |
| 1 | 1 | 2 | 3 | 6 |
| 2 | 2 | 4 | 6 | 12 |
| 3 | 3 | 6 | 9 | 18 |
| 4 | 4 | 8 | 12 | 24 |
| 5 | 5 | 10 | 15 | 30 |
| 6 | 6 | 12 | 18 | 36 |
| 7 | 7 | 14 | 21 | 42 |
| 8 | 8 | 16 | 24 | 48 |
| 9 | 9 | 18 | 27 | 54 |
| 10 | 10 | 20 | 30 | 60 |

(Figures are metres per round.)

- **Move** (Half or Full Action) just moves you: Half Move as a Half Action, Full Move as a Full
  Action.
- **Charge** (Full Action, Attack + Melee + Movement) folds movement and an attack together: the
  target must be at least 4m away and within your Charge distance, the last 4m must be a straight
  line, and you finish with a Routine (+20) Weapon Skill test for one hit (p.219).
- **Run** (Full Action, Movement only) covers your Run distance. Until your next turn, ranged
  attacks against you suffer −20 Ballistic Skill, but melee attacks against you gain +20 Weapon
  Skill — you're a harder target at range and an easier one up close (p.222).

> Vash (AgB 4) Charges a cultist 10m away: the move is within the 12m Charge distance, and the
> final 4m runs in a straight line at the target, so the Charge is legal.

## In Foundry

The system's action list (`src/module/rules/combat-actions.mjs`) encodes every entry from Table
7–1 with its type, subtypes, and to-hit modifier, and applies that modifier automatically when
the action is picked in the attack roll dialog — Standard Attack's +10, All Out Attack's +30,
Charge's +20, Called Shot's −20, Full Auto Burst's −10, and so on.

Not automated: the one-Full-or-two-Half-Actions limit, the one-Attack/one-Concentration-subtype
rule, and Initiative order itself (Foundry's combat tracker sequences turns, but nothing in this
system enforces the action economy on top of it) — those stay a table bookkeeping job.

## Related

- [[Tests and Difficulty|Rules-Tests-and-Difficulty]] — how the rolls these actions trigger work
- [[Attacking|Rules-Attacking]] — what happens when the action you take is an attack
- [[Conditions|Rules-Conditions]] — Stunned, Pinned, and Prone all change what you can do on your turn
