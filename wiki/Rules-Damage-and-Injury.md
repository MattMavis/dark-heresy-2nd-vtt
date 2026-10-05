# Rules: Damage and Injury

Damage, Righteous Fury, and wounds are on Core Rulebook p.226–227 (Steps Four and Five of the
attack); Critical damage, Fatigue, and characteristic damage follow on p.231–233; Blood Loss and
healing round out the chapter on p.242–244.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## Rolling damage

Each weapon lists a damage formula — a die plus a flat modifier. Roll it once per hit. A melee
weapon also adds the attacker's Strength Bonus. You may replace the result on **one** damage die
per hit with the degrees of success scored on the attack roll, which matters most when the dice
rolled low and the attack roll didn't (p.226).

Damage comes in four types — Energy, Impact, Explosive, Rending — and the type decides which
Critical Effects table applies later. Anything that doesn't specify a type counts as Impact
(p.231).

## Righteous Fury

If a damage die comes up a **natural 10**, the hit is a Righteous Fury (p.226–227):

- **If the hit still dealt damage** after Armour and Toughness Bonus reduced it, roll 1d5 on the
  Critical Effects table for that damage type and location, and apply the result — but the
  target does **not** count as having taken Critical damage from it. It's a nasty side-effect
  layered on top of an ordinary hit, not a second wound track.
- **If the hit dealt zero damage** after reduction, it instead deals exactly 1 point, ignoring
  Armour and Toughness Bonus entirely, and nothing further happens.

> **A book oddity to agree on first.** The rule says a natural 10 on a d10, and then adds that
> this "also includes a result of 10 when rolling 1d5 for damage" — which cannot happen, since a
> d5 has no 10 on it. The usual readings are that a d5 triggers on its own maximum (a 5), or that
> it applies where a d5 is rolled as a halved d10 and the underlying d10 showed 10. The book
> never resolves it, so pick one at your table before a d5 weapon comes up.

Righteous Fury can be inflicted by *and against* Player Characters alike; by the book's own
house rule, low-level "Troop" NPCs who roll it are simply killed outright rather than rolling
effects, to keep mass combat moving (p.227).

> Vash's chainsword deals 1d10+5 Rending. The die comes up **10** — Righteous Fury. The hit
> already punched through the target's Armour and Toughness Bonus for 9 damage, so Vash also
> rolls 1d5 on the Rending Critical Effects table for that location and applies the result, on
> top of the 9 points of ordinary damage.

## Armour and Toughness Bonus

Once damage is rolled, the target subtracts their **Toughness Bonus**, then the **Armour
points** protecting the location hit (reduced first by the weapon's Penetration, to a minimum of
0). If that brings the total to zero or less, the hit is shrugged off entirely (p.226).

```
damage after reduction = total damage − (armour at location − penetration, min 0) − toughness bonus
```

> The hit on Vash's target rolled 14 total. The location has 4 Armour, the weapon has Pen 2 (so
> 2 Armour gets through), and the target's Toughness Bonus is 3. Damage after reduction:
> 14 − 2 − 3 = **9**.

## Wounds and Critical damage

Wounds are a threshold, not a resource that depletes on its own — damage accumulates against
them instead. As long as total damage stays at or below a character's wounds, they function
normally. The moment total damage **exceeds** wounds, the excess becomes **Critical damage**,
and the GM rolls on the table for the damage type and hit location to find the effect (p.232).

Critical damage is cumulative. A character who is already Critically damaged and takes more
damage adds it to their running Critical total and re-rolls on the table — the new result doesn't
erase the old one unless the two are mutually exclusive, in which case the more recent result
wins (p.232).

> Vash's target has 10 Wounds and has already taken 7 damage. A new hit deals 9 damage after
> reduction. 7 + 9 = 16, which is 6 over the 10-Wound threshold — the target is now Critically
> damaged at 6, and the GM rolls on the appropriate Critical Effects table at that value.

At the high end, the Critical Effects tables themselves specify death — typically a Toughness
test to avoid dying outright once Critical damage for a location reaches a severe enough value.
There's no single universal "character dies at X Critical damage" number; it's built into each
location's table.

### Healing

Characters move through three damage bands as they accumulate it, each slower to heal than the
last (p.243–244):

| State | Threshold | Natural healing |
|---|---|---|
| Lightly Damaged | Damage ≤ 2× Toughness Bonus | 1 point/day, or a full Toughness Bonus with a day of bed rest |
| Heavily Damaged | Damage > 2× Toughness Bonus | Nothing without complete rest; 1 point per 24 hours of it |
| Critically Damaged | Any Critical damage present | Nothing without complete rest; a Challenging (+0) Toughness test per 24 hours removes 1 point |

## Fatigue

Fatigue tracks non-lethal exhaustion separately from damage, measured in levels. Grappling,
certain attacks, and a number of Critical Effects all add Fatigue (p.232–233).

**Fatigue Threshold = Toughness Bonus + Willpower Bonus.** Any characteristic whose bonus is
lower than your *current* Fatigue level counts as fatigued — in structured time that means the
characteristic is halved (rounded up) for any test, including its own bonus, until the Fatigue
drops back down.

Exceed your Fatigue Threshold entirely and you fall Unconscious for 10 × Toughness Bonus minutes,
waking with Fatigue reset to your Toughness Bonus. Exceed **double** your threshold and you die.
Fatigue clears at 1 level per hour of rest, or completely after six consecutive hours (p.233).

> Vash has Toughness Bonus 4 and Willpower Bonus 3 — a Fatigue Threshold of 7. At Fatigue 5,
> Vash's Agility Bonus of 4 (lower than 5) is halved for tests; Vash's Toughness Bonus of 4 and
> Willpower Bonus of 3 are also both affected, but a characteristic bonus of say 6 would not be.

## Blood Loss

Certain Critical Effects (amputations especially) inflict **Blood Loss**. At the start of the
affected character's turn, it costs 1 level of Fatigue. Once per round, as a Free Action, the
character — or anyone who can reach them — can attempt a Difficult (−10) Medicae test to remove
it. Multiple instances of Blood Loss don't stack (p.242).

## In Foundry

`src/module/rolls/assign-damage-data.mjs` runs the armour/Toughness Bonus pipeline exactly as
above: Penetration reduces usable Armour to a floor of zero, the remainder plus Toughness Bonus
is subtracted from the hit, and anything left over that exceeds remaining Wounds is routed to
Critical damage automatically. The True Grit talent is applied as a further reduction to Critical
damage only, to a minimum of 1, matching its stated effect.

`src/module/rolls/damage-data.mjs` triggers Righteous Fury on a natural maximum roll (threshold
10 by default, lower if the weapon has the Vengeful quality) and rolls the follow-up 1d5 Critical
Effect automatically. `src/module/actions/basic-action-manager.mjs` can then apply a crit
result's unconditional effects — Fatigue, Stunned/Blinded/Deafened durations, Blood Loss,
catching fire, death — to the target actor with one click, and logs a permanent Critical Injury
item on the sheet either way.

## Related

- [[Attacking|Rules-Attacking]] — the four steps before this one: modifiers, the test, and hit location
- [[Conditions|Rules-Conditions]] — Stunned, Bleeding, and the rest of the aftermath in one place
- [[Corruption and Insanity|Rules-Corruption-and-Insanity]] — Fate points can undo a lethal hit
