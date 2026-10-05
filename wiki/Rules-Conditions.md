# Rules: Conditions

The Core Rulebook defines its conditions wherever they first come up rather than in one place:
most of them live in the "Conditions and Special Damage" section of the Combat chapter
(p.230, p.241–243), Fear and Insanity are a chapter away in Narrative Tools (p.284–287), and a
couple of others are buried inside the actions that cause them. This page gathers what causes
each one, what it does, and how it ends.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## Stunned

- **Caused by:** a number of Critical Effects, the Stun attack action (p.223–224), and some
  psychic phenomena.
- **Effect:** cannot take actions or Reactions — including Evasion — but isn't treated as
  Helpless or Unaware. Attackers get **+20** Weapon Skill or Ballistic Skill against a Stunned
  target (p.230, p.242).
- **Ends:** after the number of rounds specified by whatever caused it.

## Prone

- **Caused by:** being knocked down (Knock Down action, some Critical Effects, failing certain
  tests), or choosing to lie down.
- **Effect:** melee attackers get **+10** Weapon Skill against you; ranged attackers get **−10**
  Ballistic Skill, unless they're at Point-Blank range. Your own Weapon Skill tests take **−10**,
  and your Evasion tests take **−20** (p.229).
- **Ends:** spend the Stand (Half Action) to regain your feet.

## Blinded

- **Caused by:** Critical Effects to the head, some psychic phenomena, losing both eyes.
- **Effect:** automatically fails every Ballistic Skill test and every other test that relies on
  sight; **−30** to Weapon Skill and most other vision-dependent tests (p.242).
- **Ends:** whatever duration the source specifies, medical attention, or a bionic eye for the
  permanent version.

## Deafened

- **Caused by:** Critical Effects to the head, certain loud or psychic effects.
- **Effect:** automatically fails any skill or characteristic test that relies on hearing, plus
  the obvious difficulty communicating (p.242).
- **Ends:** whatever duration the source specifies, or medical attention for the permanent
  version.

## Fatigued

- **Caused by:** accumulating Fatigue levels past a characteristic's bonus. Full mechanics,
  including the Fatigue Threshold and what happens beyond it, are on
  [[Damage and Injury|Rules-Damage-and-Injury]].
- **Effect:** any characteristic whose bonus is below your current Fatigue level is treated as
  half its value (rounded up) for tests in structured time, or takes twice as long to use in
  narrative time (p.232–233).
- **Ends:** Fatigue clears at 1 level per hour of rest, or completely after six consecutive
  hours.

## Pinned

- **Caused by:** failing a Pinning test, which several ranged actions (Suppressing Fire,
  Overwatch) force on their targets (p.230).
- **Effect:** only a single Half Action per turn (Free Actions and Reactions are unaffected);
  **−20** to all Ballistic Skill tests; must stay in cover if already there, or spend the turn
  reaching cover if not.
- **Ends:** a Challenging (+0) Willpower test at the end of your turn (+30 if you haven't been
  shot at since your last turn, or you're in cover); entering melee combat ends it automatically.

## Fear and Terror

- **Caused by:** confronting something with the Fear trait, or a sufficiently horrifying
  situation at the GM's discretion. Fear has four degrees, each its own test modifier (p.285):

  | Degree | Description | Test modifier |
  |---|---|---|
  | Fear (1) | Disturbing | +0 |
  | Fear (2) | Frightening | −10 |
  | Fear (3) | Horrifying | −20 |
  | Fear (4) | Terrifying | −30 |

- **Effect:** failing the Fear test (a modified Willpower test) in combat forces a roll on the
  Shock table, with results ranging from losing part of your next turn to fleeing in a blind
  panic or passing out — worse the more degrees of failure. Failing one *outside* combat instead
  gives a flat **−10** to any test needing concentration for as long as you're near the source,
  and three or more degrees of failure adds 1d5 Insanity points either way (p.285–286).
- **Ends:** Shock effects specify their own duration, or clear once you successfully "snap out of
  it" with a Willpower test on your next turn (p.286).

## Bleeding (Blood Loss)

- **Caused by:** certain Critical Effects, most often amputation.
- **Effect:** 1 level of Fatigue at the start of each of your turns. Full mechanics are on
  [[Damage and Injury|Rules-Damage-and-Injury]].
- **Ends:** a Difficult (−10) Medicae test, attempted once per round as a Free Action by the
  bleeding character or anyone who can reach them (p.242).

## Burning

- **Caused by:** weapons with the Flame quality, certain Energy Critical Effects, or standing in
  an environmental fire.
- **Effect:** 1d10 Energy damage (ignoring Armour) and 1 level of Fatigue, every round, until
  extinguished (p.243).
- **Ends:** drop Prone and pass a Hard (−20) Agility test as a Full Action (easier with help or
  favourable conditions, at the GM's discretion).

## Suffocating

- **Caused by:** being deprived of breathable air — drowning, smoke, vacuum, toxic gas.
- **Effect:** you can hold your breath for a number of minutes equal to your Toughness Bonus if
  conserving air, or rounds if exerting yourself. Each interval after that, a failed Challenging
  (+0) Toughness test costs 1 level of Fatigue. Once the time is up with no fresh air, you fall
  Unconscious regardless of Fatigue; if already Unconscious and still without air, you die after
  a number of rounds equal to your Toughness Bonus (p.243).
- **Ends:** reaching a fresh source of oxygen.

## Unconscious

- **Caused by:** exceeding your Fatigue Threshold, sufficient Critical damage, or specific
  effects that say so directly.
- **Effect:** unaware of your surroundings, can take no actions, and treated as a Helpless
  target (p.243).
- **Ends:** whatever duration caused it — 10 minutes by default if none is given.

## Helpless

- **Caused by:** being Unconscious, or otherwise completely unable to resist (restrained,
  paralysed, and similar). Being merely Prone or Stunned does **not** qualify on its own (p.229).
- **Effect:** Weapon Skill tests to hit a Helpless target automatically succeed, with degrees of
  success equal to the attacker's Weapon Skill Bonus; damage against a Helpless target is rolled
  twice and added together.
- **Ends:** whatever removed the underlying cause.

## Grappled

- **Caused by:** a successful Grapple attack (Charge or Standard Attack, p.227–228).
- **Effect:** the Grappled target can only take the Grapple action on their turn, cannot use
  Reactions, and counts as engaged in melee; other attackers get **+20** Weapon Skill against
  anyone in the Grapple.
- **Ends:** either side can attempt to Break Free (Opposed Strength) or Slip Free (Challenging
  Acrobatics); the controller can also release it voluntarily as a Free Action.

## In Foundry

Stunned and Prone are enforced where they matter most: the system refuses to let a Stunned actor
attempt an Evasion Reaction at all, and automatically applies the Prone character's own −20
Evasion penalty when they try anyway (`src/module/documents/acolyte.mjs`).

A Critical Effect's Prone, Stunned (as a timed status), Blinded, Deafened, Blood Loss (Bleeding),
On Fire (Burning), and Dead outcomes can each be applied to the target actor with one click from
the damage chat card, rather than the GM reading the result and toggling everything by hand
(`src/module/actions/basic-action-manager.mjs`).

## Related

- [[Combat Turn|Rules-Combat-Turn]] — how losing actions to a condition actually plays out
- [[Attacking|Rules-Attacking]] — several conditions change the to-hit modifier list directly
- [[Damage and Injury|Rules-Damage-and-Injury]] — Fatigue and Blood Loss in full
- [[Corruption and Insanity|Rules-Corruption-and-Insanity]] — what Fear leaves behind after the
  encounter ends
