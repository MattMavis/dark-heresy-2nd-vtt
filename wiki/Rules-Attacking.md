# Rules: Attacking

The attack sequence itself is on Core Rulebook p.225–227; the individual attack actions (Standard
Attack, Semi-Auto Burst, Charge, and so on) are scattered across p.218–224; the modifier list is
on p.228–231. This page walks the sequence once and gathers the modifiers next to it.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## The attack sequence

Every attack, melee or ranged, follows the same five steps (p.225–226):

1. **Apply modifiers** to the attacker's Weapon Skill or Ballistic Skill.
2. **Attacker makes the test.** Roll under the modified characteristic to hit.
3. **Determine hit location.** Reverse the digits of the roll (32 becomes 23, 20 becomes 02) and
   look the result up on Table 7–3.
4. **Determine damage,** including Righteous Fury if it applies — see
   [[Damage and Injury|Rules-Damage-and-Injury]] for that whole step.
5. **Target applies damage,** subtracting Armour and Toughness Bonus — also covered there.

Modifiers from every source simply add together before the roll, and the total is capped at
**+60** or **−60** no matter how many sources contribute (p.226).

Table 7–3: Hit Locations (p.226):

| D100 roll | Location |
|---|---|
| 01–10 | Head |
| 11–20 | Right Arm |
| 21–30 | Left Arm |
| 31–70 | Body |
| 71–85 | Right Leg |
| 86–100 | Left Leg |

> Vash (Ballistic Skill 42) fires at a cultist from Short range (+10) after Aiming as a Half
> Action (+10). Target is 62. Vash rolls **23** → hits. Reversed, that's **32**, which is Body.

## Attack actions

Several Half or Full Actions exist purely to make an attack, each with its own modifier and its
own way of generating extra hits.

| Action | Type | To-hit modifier | Notes |
|---|---|---|---|
| Standard Attack | Half | +10 WS or BS | One hit. The default attack. |
| All Out Attack | Full | Easy (+30) WS | One hit. Lose your Evasion Reaction until your next turn. Melee only (p.219). |
| Charge | Full | Routine (+20) WS | One hit. Must close at least 4m, last 4m straight (p.219). |
| Called Shot | Full | Hard (−20) WS or BS | Skips hit-location — you pick the location instead. No Standard Attack bonus (p.219). |
| Semi-Auto Burst | Half | +0 BS | 1 hit at the first degree of success, +1 per 2 further DoS, capped at the weapon's semi-auto rate of fire. Jams on 94+ (p.223). |
| Full Auto Burst | Half | −10 BS | 1 hit per DoS, capped at the weapon's full-auto rate of fire. Jams on 94+ (p.220). |
| Swift Attack | Half (needs talent) | Challenging (+0) WS | Same hit math as Semi-Auto, capped at WS Bonus. Melee (p.224). |
| Lightning Attack | Half (needs talent) | Difficult (−10) WS | Same hit math as Full Auto, capped at WS Bonus. Melee (p.221). |
| Suppressing Fire | Full | Hard (−20) flat BS test | Not a to-hit roll against a target — hits land randomly in a kill zone. Forces Pinning tests (p.223). |
| Stun | Full | Hard (−20) WS | Melee only; see below instead of normal damage (p.223–224). |

**Degrees of success multiply hits.** For Semi-Auto Burst and Swift Attack, the first hit comes
free with a pass, and every **2 additional** degrees of success adds one more. For Full Auto
Burst and Lightning Attack, **every** additional degree of success adds a hit. Either way, the
total can never exceed the weapon's rate of fire (ranged) or the attacker's Weapon Skill Bonus
(melee talent attacks).

> Vash fires a Full Auto Burst (BS 42, so target 32 after the −10) and rolls **05** → success,
> tens 3 vs 0, so **4 DoS**. That's 4 hits — unless the weapon's full-auto rate of fire is lower,
> in which case the rate of fire wins.

**Stun** replaces the normal damage step: on a successful Hard (−20) Weapon Skill test, roll
1d10 + Strength Bonus and compare it to the target's Toughness Bonus + 1 per Armour point on
their head. If the attacker's result is equal or higher, the target is Stunned for a number of
rounds equal to the difference, and gains 1 level of Fatigue (p.223–224).

## To-hit modifiers

| Source | Modifier |
|---|---|
| Point-Blank range (≤2m, or 1m inside a weapon's Short range) | +30 |
| Short range | +10 |
| Long range (more than double a weapon's range) | −10 |
| Extreme range (more than triple a weapon's range) | −30 |
| Aim, Half Action | +10 |
| Aim, Full Action | +20 |
| Attacking a Surprised or Unaware target | +30 |
| Attacking a Stunned target | +20 |
| Attacking a Prone target, melee | +10 |
| Attacking a Prone target, ranged (unless Point-Blank) | −10 |
| Attacking from higher ground, melee | +10 |
| Outnumbering a melee foe 2-to-1 | +10 |
| Outnumbering a melee foe 3-to-1 or more | +20 |
| Shooting into melee (waived if the target is Stunned, Helpless, or Unaware) | −20 |
| Darkness, melee / ranged | −20 / −30 |
| Fog, mist, shadow, or smoke, ranged | −20 |
| Difficult terrain (mud, etc.), Weapon Skill or Evasion | −10 |
| Arduous terrain (deep snow, ice) | −30 |
| Harsh weather or unnatural conditions | −20 |

Cover works differently: it doesn't modify the roll at all. Instead, a shot that would hit a
concealed location is absorbed by the cover's own Armour points first, with any excess carrying
through to the target (p.228). Table 7–4:

| Cover | Armour Points |
|---|---|
| Armour-glass, thin metal, wooden planks | 4 |
| Flakboard, storage crates, sandbags, thick ice, trees | 8 |
| Cogitator banks, stasis pods, standard barricades | 12 |
| Rockcrete, hatchways, thick iron, stone | 16 |
| Armaplas, voidship bulkheads, plasteel | 32 |

Size works as its own table, keyed to the Size trait (Core Rulebook Table 4–6, p.138) rather than
to range or cover:

| Size | Example | To-hit modifier |
|---|---|---|
| 1 Miniscule | Autoquill, knife | −30 |
| 2 Puny | Bolt pistol, servo-skull | −20 |
| 3 Scrawny | Gretchin, human child | −10 |
| 4 Average | Human, Eldar | +0 |
| 5 Hulking | Ork Nob, armoured Space Marine | +10 |
| 6 Enormous | Sentinel walker, autocarriage | +20 |
| 7 Massive | Chimera, Greater Daemon | +30 |
| 8 Immense | Land Raider, Valkyrie gunship | +40 |

Sizes 9 (Monumental) and 10 (Titanic) exist on the same table but the extracted text doesn't
carry a legible to-hit figure for them — check the Core Rulebook directly before using a target
that large.

## Evading an attack

A hit isn't damage yet. The target may spend their one Reaction per round on an Evasion test
(Dodge for ranged or melee, Parry for melee only) before damage is rolled; success negates the
hit entirely, as if the attack had missed (p.219–220). Default difficulty is Challenging (+0).

Attacks that land more than one hit are harder to fully evade: dodging a Blast or Spray weapon
just moves you to the edge of the area (if that's within your Agility Bonus in metres — otherwise
the test auto-fails), while evading Swift Attack, Lightning Attack, a burst, Twin-Linked fire, or
anything else with multiple hits cancels **one additional hit per degree of success** (two per
degree against a Storm weapon). Cancel every hit and the attack counts as a miss (p.228).

## Jamming and overheating

A **Standard Attack** jams on an unmodified **96–100**: the attack automatically misses and the
weapon won't fire again until a Full Action Ballistic Skill test clears the jam (losing whatever
ammunition was in it). Semi-Auto Burst, Full Auto Burst, and Suppressing Fire raise that chance,
jamming on **94+** instead (p.224).

A weapon with the **Overheats** quality doesn't jam at all — instead, on an attack roll of **91
or higher**, the wielder takes the weapon's own damage (Pen 0) to an arm, unless they drop the
weapon as a Free Action to avoid it. An overheated weapon can't be fired again until the second
round after (p.224).

> **The system is currently one result short on both.** The code jams on 97–100 rather than
> 96–100, and overheats on 92+ rather than 91+, because both comparisons are `>` where the book
> is inclusive. So jams happen 4 times in 100 instead of 5, and overheats 9 instead of 10. Noted
> here rather than quietly corrected, because it changes combat odds.

## In Foundry

`src/module/rolls/action-data.mjs` resolves most of this automatically once a weapon roll
completes: it fails a Ballistic Skill test outright if the attacker is Blinded, jams the weapon
unless it has a quality that suppresses jamming, triggers an overheat on a weapon with the
Overheats quality, and computes
additional hits for Semi-Auto/Full Auto/Swift/Lightning Attack from degrees of success — capped
at the weapon's fire rate, doubled for Storm, +1 for Twin-Linked.

`src/module/rules/hit-locations.mjs` implements the digit-reversal hit location roll directly
against the same ranges as Table 7–3 above, and `src/module/rules/combat-actions.mjs` pre-fills
the Called Shot location field when that action is selected.

## Related

- [[Combat Turn|Rules-Combat-Turn]] — the action economy an attack fits inside
- [[Damage and Injury|Rules-Damage-and-Injury]] — what happens once a hit lands
- [[Conditions|Rules-Conditions]] — Stunned, Prone, and Pinned all change the modifiers above
