# Character Creation

A wizard on the **Bio tab** of a character sheet builds an acolyte from the book's own choices,
granting what those choices entitle you to rather than leaving you to add each one by hand.

**Nothing is written to the character until you press Confirm on the last step.** You can go
back, change an earlier answer, or close the dialog and lose nothing.

## The eight steps

| # | Step | What it does |
|---|---|---|
| 1 | Home world | Sets the home world and its characteristic modifiers, bonus and aptitude |
| 2 | Background | Sets the background and the skills, talents and equipment it brings |
| 3 | Role | Sets the role, its aptitude and its bonus |
| 4 | Characteristics | Rolls or assigns the nine characteristics, with home world modifiers applied |
| 5 | Aptitudes | Resolves the aptitude list, including any choice the earlier steps left open |
| 6 | Starting experience | Spends the starting XP, priced against the aptitudes just settled |
| 7 | Divination | Rolls or picks the Emperor's divination and applies its effect |
| 8 | Summary | Shows everything about to be written, and anything that could not be found |

## What it grants

Aptitudes, skills, talents, traits and starting equipment, resolved against the compendiums.

**Anything it cannot find is listed on the summary step** rather than dropped silently. That
happens when a background or role names kit that is not in the packs under that exact name — the
wizard tells you what it could not resolve so you can add it yourself, instead of leaving you to
notice later that a character is missing a talent.

## Starting experience

Step 6 prices advances using the same tables as [[Experience and Advancement]], against the
aptitudes settled in step 5. That ordering matters: aptitudes change what everything costs, so
the wizard will not let you spend before they are fixed.

Spending at creation is recorded in the XP ledger like any other spend, so the history is
complete from the character's first moment rather than starting at their first post-creation
purchase.

## Psykers

The Psyker elite advance is not part of this wizard — it is an elite advance taken later, and
it grants its own package. See [[Playing a Psyker]].

## Existing characters

The wizard is for building a new acolyte. Running it on a character who already has a home world
and background will overwrite those choices, so it is not a repair tool. To refresh items on an
existing character against the compendium, use the GM macro
(`refresh-items-from-compendium.js`) rather than re-running creation.
