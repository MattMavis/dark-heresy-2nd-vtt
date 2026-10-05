# Requisition and Influence

The Requisition Menu browses gear the party can ask for, rolls the Influence test, and grants
what succeeds. It is player-facing — a player can open it and requisition without the GM
driving it.

## The test

One Influence test covers everything selected, not one test per item. The target is the
character's Influence, modified by the Availability and Craftsmanship of **every** item in the
basket.

### Availability modifiers

Core Rulebook p.140, Table 5-1.

| Availability | Modifier |
|---|---|
| Ubiquitous | +0 |
| Abundant | +30 |
| Plentiful | +20 |
| Common | +10 |
| Average | +0 |
| Scarce | −10 |
| Rare | −20 |
| Very Rare | −30 |
| Extremely Rare | −40 |
| Near Unique | −50 |
| Unique | −60 |

Two things worth knowing about this table.

**Ubiquitous is "Automatic" in RAW**, not a modifier. The system treats it as a flat +0 instead
of auto-granting it, so a Ubiquitous item selected alongside others neither helps nor hurts the
roll and still rides on the group's combined test. Requisition a Ubiquitous item on its own and
you are rolling against unmodified Influence.

**Scarce is a book contradiction.** Table 5-1 lists it as −10; the worked example in the prose
on p.141 says "the Scarce (−20) availability modifier." The system uses the table value, on the
general principle that tables are the authoritative reference. If your table prefers the prose,
it is one line — `Scarce` in `AVAILABILITY_MODIFIERS`, in `src/module/rules/requisition.mjs`.

### Craftsmanship modifiers

Core Rulebook p.141, Table 5-2.

| Craftsmanship | Modifier |
|---|---|
| Poor | +10 |
| Common | +0 |
| Good | −20 |
| Best | −30 |

## Warband Subtlety

The party shares a Warband Tracker holding their Subtlety. Requisitioning something hard to come
by draws attention, and that is paid out of Subtlety.

**Subtlety is spent whether the test succeeds or fails.** That is RAW — the asking is what gets
noticed, not the getting.

The cost is summed across every selected item that carries a negative modifier of its own. RAW
describes this for a single item; applying it across a combined basket is this system's
extrapolation, so if your table reads it differently, this is a house-rule decision rather than
a bug.

Subtlety floors at 0 rather than going negative. If the tracker cannot be updated — usually a
permissions problem on the shared actor — the roll still resolves and you get a warning saying
the Subtlety was not deducted, rather than the requisition silently failing.

## What you get

On a success, every selected item is granted at the chosen quantity. Requisitioning something the
character already carries **adds to the existing stack** rather than creating a second row.

On a failure, nothing is granted — but see above, the Subtlety is gone either way.

The chat card records the roll, the degrees of success or failure, what was granted, and what the
Subtlety cost was.

## Only physical items

Requisition covers the item types that carry an `availability` field — ammunition, armour,
weapons, gear, tools, cybernetics, weapon modifications and the rest of the `physicalItem`
family. Talents, traits and psychic powers are not requisitioned; those are bought with
experience, see [[Experience and Advancement]].
