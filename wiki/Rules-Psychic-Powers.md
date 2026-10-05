# Rules: Psychic Powers

Chapter VI covers all of this in one place, which is rarer than it should be for this book:
Psy Rating and Pushing on p.193–195, Psychic Phenomena and Perils of the Warp on p.195–197, and
Sustaining, Bolts, Barrages, Storms, and Blasts on p.197–198. This page follows that order and
adds the psyker-type differences the book spreads across one wide table.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## Psy Rating

**Psy Rating (PR)** measures raw psychic power, from 1 (a barely-trained hedge-witch) up to 10
(a Greater Daemon or master Farseer). A character needs PR 1 or higher to use psychic powers at
all, starts there, and raises it later by spending experience points equal to 200 × the PR being
bought — so going from PR 2 to PR 3 costs 600 XP (p.193).

## Using a power: the three steps

**Step 1 — choose an effective Psy Rating.** You don't have to commit your full PR to a power.
Using less than your base PR gives **+10 to the Focus Power test per point under**, but weakens
the power's actual effect — range, damage, and area are all based on the *effective* PR you
chose, not your base PR (p.193–194).

**Step 2 — make the Focus Power test.** This is the action that actually manifests the power —
usually a Half, Full, Free, or Reaction depending on the power, and usually (not always) a
Willpower test, modified by the power's own difficulty and by the effective PR chosen in Step 1
(p.194). Some powers specify an Opposed test instead, resolved exactly like any other Opposed
test (see [[Tests and Difficulty|Rules-Tests-and-Difficulty]]), where the psyker must out-degree
at least one opponent to succeed.

**Step 3 — resolve the power**, applying whatever Psychic Phenomena or Perils of the Warp the
test triggered (below) before the power's own effects, since a phenomenon can change whether or
how the power manifests at all (p.194–195, p.197).

## Pushing

A psyker may **Push**: set the power's effective PR up to 2 higher than their base PR (more for
some psyker types, see the table below). Pushing is a straight trade — power for risk:

- **−10 to the Focus Power test per point Pushed** above base PR.
- **Psychic Phenomena triggers on any roll that *isn't* doubles**, instead of the normal
  doubles-only trigger (p.194).

> Astropath Juun, a sanctioned psyker with Willpower 45 and base Psy Rating 3, Pushes to an
> effective PR of 5 for a power that uses Willpower. That's +2 PR, so Juun takes a flat −20 to
> the Focus Power test: the target is 25, not 45. Rolling anything but doubles now triggers
> Psychic Phenomena.

## Doubles and Psychic Phenomena

Outside of Pushing, **rolling doubles on the Focus Power test** (both digits the same — 11, 22,
… 99) triggers Psychic Phenomena, whether the test succeeds or fails. Roll on Table 6–2 (p.195,
summarised below). Only the psyker's own roll can trigger this — a target resisting with an
Opposed test doesn't generate Phenomena from their side of it (p.195).

Table 6–2 spans a d100 roll with dozens of entries (p.196), from harmless ("Dark Foreboding" — a
faint, unsettling breeze) through disruptive (a −5 Willpower penalty, nearby animals spooking,
being knocked Prone) up to the worst outcome on the table: rolling **75 or higher** sends the
psyker straight to Perils of the Warp instead.

## Perils of the Warp

Table 6–3 (p.197) is Phenomena's much nastier sibling — a separate d100 roll that only comes up
when Phenomena sends you there. Results range from being Stunned or knocked unconscious, through
Corruption and Insanity gains, to a Daemon tearing its way into reality or the psyker being
annihilated outright, with no Fate point able to prevent that last one. The GM rolls this one
cold — there's no mitigating it once triggered.

## Sustaining a power

A power whose description lists a sustain action (typically Half Action) stays active each turn
for that cost, with no further Focus Power test needed, as long as you're sustaining only that
one power (p.197). Sustaining **more than one at once** is harder:

- Spend the **longest** sustain action among all the powers you're maintaining.
- Each sustained power's effective PR drops by the **number of powers being sustained**.
- If sustaining causes Phenomena, add **+10 to the Table 6–2 roll per power after the first**.

Dropping the required action for even one turn ends that power at the end of the turn.

## Psychic Bolts, Barrages, Storms, and Blasts

Four families of attack power share the same shape (p.197–198):

- **Bolt:** a single-target hit, resolved like any other ranged attack — determine hit location
  from the Focus Power test the same way a weapon attack does.
- **Barrage:** one hit for the initial degree of success, plus one more per two additional
  degrees, capped at the power's effective PR. Extra hits may land on other targets within 2m.
- **Storm:** one hit **per** degree of success, same PR cap, same spread rule — the psychic
  equivalent of full-auto fire.
- **Blast:** a single area at a point in range and line of sight; everyone inside is hit if the
  test succeeds, with no degree-of-success hit math at all.

Bolts are Dodged like a normal ranged attack; Storms and Blasts are Dodged the way Auto-Fire and
Area Effect attacks are (see [[Attacking|Rules-Attacking]]).

## Psyker types

Table 6–1 (p.194) varies all of the above by what kind of psyker you're dealing with:

| Type | Doubles (not pushing) | Pushing | Sustaining multiple powers |
|---|---|---|---|
| **Bound** (Sanctioned, Astropaths, Librarians, most PCs) | Roll on Table 6–2 as normal | Up to +2 PR | +10 to Table 6–2 rolls per extra power sustained |
| **Unbound** (Wyrds, unsanctioned psykers, mortal sorcerers) | +10 to the Table 6–2 roll | Up to +4 PR, phenomena at +5 per point pushed (max +20) | Same +10 per extra power |
| **Daemonic** (Psychic Daemons, Daemonhosts, Daemon Princes) | +10 to the roll, but unaffected by the result unless it's a Perils of the Warp | Up to +3 PR, +10 per point pushed (max +30), same immunity caveat | Unaffected unless Perils of the Warp results |

The practical read: Bound (mostly Imperially-sanctioned) psykers draw less deeply but suffer the
plain consequences; Unbound psykers can push further but eat a flat +10 to every Phenomena roll
for the privilege; Daemonic entities shrug off everything short of a full Perils result.

## In Foundry

The psychic roll dialog (`src/module/rolls/roll-data.mjs`) computes the Push bonus as 10 ×
(base Psy Rating − chosen effective PR) automatically — a positive bonus if casting under your
rating, a negative one if pushing over it. A manual "Has Focus" checkbox on the actor sheet
(`system.psy.hasFocus`) adds a further +10 when toggled on, for whatever source the table grants
that bonus from. `src/module/rolls/action-data.mjs` checks the roll against doubles to decide
whether Psychic Phenomena triggers, applying the Pushing psyker's "triggers on anything but
doubles" rule rather than the normal doubles-only rule.

The Bound/Unbound/Daemonic split in Table 6–1 above is not automated: the sheet has a free-text
"Class" field (`system.psy.class`) for the GM's own reference, but nothing in the roll code
reads it, so the Phenomena-roll and Push-ceiling differences between psyker types stay a manual
GM judgement call.

## Related

- [[Tests and Difficulty|Rules-Tests-and-Difficulty]] — the Opposed test some powers call for
- [[Attacking|Rules-Attacking]] — how a Psychic Bolt/Barrage/Storm resolves as an attack
- [[Corruption and Insanity|Rules-Corruption-and-Insanity]] — where the Corruption and Insanity
  points from Phenomena and Perils end up
