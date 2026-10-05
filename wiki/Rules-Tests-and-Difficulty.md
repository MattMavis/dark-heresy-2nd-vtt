# Rules: Tests and Difficulty

Everything in Dark Heresy resolves the same way. This page gathers the pieces, which the Core
Rulebook spreads across pp.22–27.

> Summaries in my own words, with my own examples. Page references point at the Core Rulebook —
> go there for the full text and the GM guidance around each rule.

## The basic test

Roll d100. **Equal to or under** the target number succeeds.

The target is a characteristic, or a characteristic plus a skill's training bonus, plus every
modifier that applies.

```
target = characteristic (+ skill training) + difficulty + situational modifiers
roll d100 ≤ target  →  success
```

**No test at all** is the right answer surprisingly often. The book's own guideline: if failing
would have no consequence, do not call for a test. The reverse holds too — if success is
impossible, it fails without a roll, which stops players fishing for a natural 01.

## Degrees of success and failure

Often you only need to know whether the test passed. When you need to know *how well*, count
degrees — and this is the rule most tables get wrong.

**Compare the tens digit of the roll against the tens digit of the target.**

- **Success:** 1 DoS, plus one more for every point the target's tens digit exceeds the roll's
- **Failure:** 1 DoF, plus one more for every point the roll's tens digit exceeds the target's

The comparison is tens digits, *not* the numeric difference. A target of 51 against a roll of 13
is 5 − 1 = 4 extra degrees, so 5 DoS total — not 38 of anything.

### Worked example

> Interrogator Vash has Ballistic Skill 42 and fires at a cultist. No modifiers apply, so the
> target is 42.
>
> - Rolls **09** → success. Tens digits 4 and 0, so 4 extra. **5 DoS.**
> - Rolls **41** → success. Tens digits 4 and 4, so none extra. **1 DoS.**
> - Rolls **58** → failure. Tens digits 5 and 4, so 1 extra. **2 DoF.**
> - Rolls **97** → failure. Tens digits 9 and 4, so 5 extra. **6 DoF.**

Degrees matter most for social skills, where they set how much you got out of someone, and in
combat, where they add hits on automatic fire.

## Difficulty

Difficulty is a modifier to the target, applied **before** the roll. Core Rulebook p.25,
Table 1–2.

| Difficulty | Modifier |
|---|---|
| Trivial | +60 |
| Elementary | +50 |
| Simple | +40 |
| Easy | +30 |
| Routine | +20 |
| Ordinary | +10 |
| **Challenging** | **+0** |
| Difficult | −10 |
| Hard | −20 |
| Very Hard | −30 |
| Arduous | −40 |
| Punishing | −50 |
| Hellish | −60 |

Three things to remember:

**Challenging (+0) is the default.** A test described with no difficulty is Challenging.

**Modifiers stack, then cap.** Add every applicable modifier together. The final total can never
exceed **+60** or **−60**, however many sources pile on.

**Difficulty is usually the GM's call.** The rules state it sometimes; the rest of the time you
are picking a row off that table.

## Opposed tests

Both sides test. Resolving ties, in order:

1. Whoever succeeds wins
2. Both succeed → most degrees of success wins
3. Still tied → highest characteristic bonus wins
4. Still tied → **lowest roll** wins

**Both fail** has no single answer: either nothing happens, or both re-roll until someone wins.
The book explicitly leaves that to the GM, so agree which one your table uses before it comes up
mid-chase.

### Worked example

> Vash (Strength 34) and a cultist (Strength 28) both grab for the same autogun.
>
> Vash rolls 22 → success, tens 3 vs 2, **2 DoS**.
> The cultist also rolls 22 → success, but against 28, tens 2 vs 2, **1 DoS**.
>
> Same roll, different targets, so Vash wins on degrees and keeps the gun.

## Assistance

Another character can help, improving the difficulty by one step — but the conditions are
specific and easy to forget:

- The helper **must have training** in that skill. Untrained enthusiasm is no help.
- They must normally be **adjacent**, though the GM may allow help over a vox.
- **No assistance on Reactions or Free Actions.**
- **No assistance** on tests to resist disease, poison or Fear.
- **At most two** helpers on one test, unless the GM says otherwise.

Only the character actually making the test rolls.

### Worked example

> Vash needs an **Arduous (−40)** Tech-Use test on an unfamiliar device. They have Tech-Use
> training, but this is beyond them.
>
> A tech-priest in the warband also has Tech-Use training and talks them through it over the vox.
> The GM allows it, improving the test one step to **Very Hard (−30)**.
>
> With Intelligence 42 they now need 12 or under instead of 02.

## In Foundry

Rolls made from the character sheet apply the characteristic, the skill training bonus and the
modifiers the system knows about, and report degrees of success on the chat card. Difficulty is
chosen in the roll dialog.

Modifiers the system cannot know — the GM's situational call, cover your table rules
differently — go in the dialog's modifier field.

## Related

- [[Combat Turn|Rules-Combat-Turn]] — the action economy these tests sit inside
- [[Experience and Advancement]] — how characteristics and skills improve
