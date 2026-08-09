/**
 * WARNING: `role_talents` below is a flat 2-element array (e.g. ['Jaded', 'Leap Up']) that looks
 * like a fixed grant of both talents, but every single role page prints "ROLE TALENT: X or Y" - a
 * mandatory CHOICE of exactly one, on all 12 roles with zero exceptions (Phase 3 extraction,
 * verified against page images). Use the new `role_talent_choice` field instead, which correctly
 * encodes it as { choose: 1, options: [...] } (and handles the two roles - Chirurgeon, Hierophant -
 * whose chosen talent itself needs a further sub-pick, plus Mystic's pinned Resistance parameter).
 * `role_talents` is left unchanged here because something else may already read it; do not delete it.
 */
export function roles() {
    return [
        {
            name: 'Assassin',
            flavor_text:
                'Talented murderers dedicated to the art of taking life; death merchants of the highest calibre, they are trained to kill and adept at slaying their targets in a variety of gruesome and grisly ways.',
            role_aptitudes: ['Agility', 'Ballistic Skill or Weapon Skill', 'Fieldcraft', 'Finesse', 'Perception'],
            role_aptitudes_structured: {
                fixed: ['Agility', 'Fieldcraft', 'Finesse', 'Perception'],
                choice_groups: [
                    {
                        options: ['Ballistic Skill', 'Weapon Skill'],
                        choose: 1,
                    },
                ],
            },
            role_talents: ['Jaded', 'Leap Up'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Jaded',
                    },
                    {
                        talent: 'Leap Up',
                    },
                ],
            },
            role_bonus: {
                name: 'Sure Kill',
                benefit:
                    'In addition to the normal uses of Fate points(pg 293), when an Assassin successfully hits with an attack, he may spend a Fate point to inflict additional damage equal to his degrees of success on the attack roll on the first hit the attack inflicts.',
                automatable: true,
                implementation_complexity: 'medium',
                implementation_note: "Requires bookkeeping of 'first hit' when an attack resolves multiple hits (e.g. multi-hit ranged attacks).",
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'reactive_after_success',
                        trigger: 'successfully hits with an attack',
                        effect_type: 'bonus_damage_on_hit',
                        effect_details: {
                            damage_bonus_source: 'degrees_of_success_on_attack_roll',
                            applies_to: 'first_hit_only',
                        },
                    },
                ],
            },
            source: 'PG 62 CB',
            source_detail: {
                book: 'CB',
                page: 62,
            },
        },
        {
            name: 'Chirurgeon',
            flavor_text:
                'Masters of the flesh, with a knowledge of sacred anatomy that lends itself to both the arts of healing as well as torture; they are devoted to the study of biological forms and the limits of mortal bodies.',
            role_aptitudes: ['Fieldcraft', 'Intelligence', 'Knowledge', 'Strength', 'Toughness'],
            role_aptitudes_structured: {
                fixed: ['Fieldcraft', 'Intelligence', 'Knowledge', 'Strength', 'Toughness'],
                choice_groups: [],
            },
            role_talents: ['Resistance (Pick One)', 'Takedown'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Resistance',
                        subchoice: {
                            ref: 'config.mjs:resistance',
                            note: "Book says 'Pick One' with no restriction; references the existing 8-option Resistance choice list (Cold, Disease, Fear, Heat, Poisons, Psychic Powers, Radiation, Vacuum) already defined in src/module/rules/config.mjs.",
                        },
                    },
                    {
                        talent: 'Takedown',
                    },
                ],
            },
            role_bonus: {
                name: 'Dedicated Healer',
                benefit:
                    'In addition to the normal uses of Fate points (pg 293), when a Chirurgeon character fails a test to provide First Aid, he can spend a Fate point to automatically succeed instead with the degrees of success equal to his Intelligence bonus.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: null,
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'reactive_after_failure',
                        trigger: 'fails a test to provide First Aid',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: 'First Aid test',
                            degrees_of_success_source: 'Intelligence bonus',
                        },
                    },
                ],
            },
            source: 'PG 64 CB',
            source_detail: {
                book: 'CB',
                page: 64,
            },
        },
        {
            name: 'Desperado',
            flavor_text:
                'Rogues and mercenaries that live by their wits and the gun on their hip; talented thieves, outlaws, and criminals, they sell their services to the highest bidder to line their pockets with coin.',
            role_aptitudes: ['Agility', 'Ballistic Skill', 'Defence', 'Fellowship', 'Finesse'],
            role_aptitudes_structured: {
                fixed: ['Agility', 'Ballistic Skill', 'Defence', 'Fellowship', 'Finesse'],
                choice_groups: [],
            },
            role_talents: ['Catfall', 'Quick Draw'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Catfall',
                    },
                    {
                        talent: 'Quick Draw',
                    },
                ],
            },
            role_bonus: {
                name: 'Move and Shoot',
                benefit:
                    'Once per round, after performing a Move action, a Desperado character may perform a single Standard Attack with a Pistol weapon he is currently wielding as a Free Action.',
                automatable: true,
                implementation_complexity: 'medium',
                implementation_note:
                    "Requires enforcing 'once per round' and 'after a Move action this round' sequencing in the combat/turn tracker; not fate-point-gated.",
                clauses: [
                    {
                        cost: {
                            type: 'free',
                        },
                        timing: 'passive_always_on',
                        trigger: 'once per round, after performing a Move action',
                        effect_type: 'free_extra_action',
                        effect_details: {
                            action_granted: 'a single Standard Attack with a Pistol weapon currently wielded',
                            action_cost: 'Free Action',
                            frequency: 'once_per_round',
                        },
                    },
                ],
            },
            source: 'PG 66 CB',
            source_detail: {
                book: 'CB',
                page: 66,
            },
        },
        {
            name: 'Hierophant',
            flavor_text:
                'Zealous followers of the Emperor with an unwavering devotion to the faith; they are missionaries and priests whose sole purpose is to spread the word of the Emperor and bring righteous death to His foes.',
            role_aptitudes: ['Fellowship', 'Offence', 'Social', 'Toughness', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Fellowship', 'Offence', 'Social', 'Toughness', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Double Team', 'Hatred (Pick One)'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Double Team',
                    },
                    {
                        talent: 'Hatred',
                        subchoice: {
                            ref: 'config.mjs:faction',
                            note: "Book says 'Pick One' with no restriction; references the existing 24-option faction choice list already defined in src/module/rules/config.mjs (the same list the Hatred talent item itself uses).",
                        },
                    },
                ],
            },
            role_bonus: {
                name: 'Sway the Masses',
                benefit:
                    'In addition to the normal uses of Fate points (pg 293), a Hierophant character may spend a Fate point to automatically succeed at a Charm, Command, or Intimidate skill test with a number of degrees of success equal to his Willpower bonus.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: null,
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared instead of rolling a Charm, Command, or Intimidate skill test',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: "Charm, Command, or Intimidate skill test (player's choice)",
                            degrees_of_success_source: 'Willpower bonus',
                        },
                    },
                ],
            },
            source: 'PG 68 CB',
            source_detail: {
                book: 'CB',
                page: 68,
            },
        },
        {
            name: 'Mystic',
            flavor_text:
                'Souls touched by the Warp and filled with its eldritch power; psykers, Warp-seers, and shamans both cursed and blessed with the power to manipulate the arcane energies of the Immaterium and turn them against their enemies.',
            role_aptitudes: ['Defence', 'Intelligence', 'Knowledge', 'Perception', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Defence', 'Intelligence', 'Knowledge', 'Perception', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Resistance (Psychic Powers)', 'Warp Sense'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Resistance',
                        fixed_subchoice: 'Psychic Powers',
                    },
                    {
                        talent: 'Warp Sense',
                    },
                ],
            },
            role_bonus: {
                name: 'Stare into the Warp',
                benefit:
                    'A Mystic character starts the game with the Psyker elite advance (pg 90). It is recommended that a character who wishes to be a Mystic have a Willpower of at least 35.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: 'The Willpower-35 line is a non-binding recommendation, not a hard prerequisite; do not gate role selection on it.',
                clauses: [
                    {
                        cost: {
                            type: 'chargen_grant',
                        },
                        timing: 'one_time_chargen',
                        trigger: 'character creation',
                        effect_type: 'grant_elite_advance',
                        effect_details: {
                            elite_advance: 'Psyker',
                            page: 90,
                            recommendation_note: 'Recommended (not required) that the character have Willpower 35+.',
                        },
                    },
                ],
            },
            source: 'PG 70 CB',
            source_detail: {
                book: 'CB',
                page: 70,
            },
        },
        {
            name: 'Sage',
            flavor_text:
                'Brilliant minds with a talent for numbers, logic, and cyphers; dedicated scholars and savants brimming with knowledge and lore, they are keepers of truths, and possess an unrivalled understanding of the galaxy.',
            role_aptitudes: ['Intelligence', 'Knowledge', 'Perception', 'Tech', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Intelligence', 'Knowledge', 'Perception', 'Tech', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Ambidextrous', 'Clues from the Crowds'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Ambidextrous',
                    },
                    {
                        talent: 'Clues from the Crowds',
                    },
                ],
            },
            role_bonus: {
                name: 'Quest for Knowledge',
                benefit:
                    'In addition to the normal uses of Fate points (pg 293), a Sage character may spend a Fate point to automatically succeed at a Logic or any Lore skill test with a number of degrees of success equal to his Intelligence bonus.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: null,
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared instead of rolling a Logic or any Lore skill test',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: "Logic or any Lore skill test (player's choice)",
                            degrees_of_success_source: 'Intelligence bonus',
                        },
                    },
                ],
            },
            source: 'PG 72 CB',
            source_detail: {
                book: 'CB',
                page: 72,
            },
        },
        {
            name: 'Seeker',
            flavor_text:
                'Skilled hunters and investigators obsessed with the pursuit of their prey; they sift through the secrets of the Imperium, seeing what others do not and using it to flush out their quarry before closing in for the kill.',
            role_aptitudes: ['Fellowship', 'Intelligence', 'Perception', 'Social', 'Tech'],
            role_aptitudes_structured: {
                fixed: ['Fellowship', 'Intelligence', 'Perception', 'Social', 'Tech'],
                choice_groups: [],
            },
            role_talents: ['Keen Intuition', 'Disarm'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Keen Intuition',
                    },
                    {
                        talent: 'Disarm',
                    },
                ],
            },
            role_bonus: {
                name: 'Nothing Escapes My Sight',
                benefit:
                    'In addition to the normal uses of Fate points (pg 293), a Seeker character may spend a Fate point to automatically succeed at an Awareness or Inquiry skill test with a number of degrees of success equal to his Perception bonus.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: null,
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared instead of rolling an Awareness or Inquiry skill test',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: "Awareness or Inquiry skill test (player's choice)",
                            degrees_of_success_source: 'Perception bonus',
                        },
                    },
                ],
            },
            source: 'PG 74 CB',
            source_detail: {
                book: 'CB',
                page: 74,
            },
        },
        {
            name: 'Warrior',
            flavor_text:
                'Hardened fighters and veterans skilled in all forms of combat; they are adept at both starting and ending conflicts, as well as the brutal application of violence to get the job done, no matter the cost.',
            role_aptitudes: ['Ballistic Skill', 'Defence', 'Offence', 'Strength', 'Weapon Skill'],
            role_aptitudes_structured: {
                fixed: ['Ballistic Skill', 'Defence', 'Offence', 'Strength', 'Weapon Skill'],
                choice_groups: [],
            },
            role_talents: ['Iron Jaw', 'Rapid Reload'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Iron Jaw',
                    },
                    {
                        talent: 'Rapid Reload',
                    },
                ],
            },
            role_bonus: {
                name: 'Expert at Violence',
                benefit:
                    'In addition to the normal uses of Fate points (pg 293), after making a successful attack test, but before determining hits, a Warrior character may spend a Fate point to substitute his Weapon Skill (for melee) or Ballistic Skill (for ranged) bonus for the degrees of success scored on the attack test.',
                automatable: true,
                implementation_complexity: 'medium',
                implementation_note: "Requires a hook point between 'attack test succeeded' and 'hits determined' in the attack pipeline.",
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'reactive_after_success',
                        trigger: 'after making a successful attack test, but before determining hits',
                        effect_type: 'substitute_value',
                        effect_details: {
                            substitutes: 'degrees of success scored on the attack test',
                            with: 'Weapon Skill bonus (melee attacks) or Ballistic Skill bonus (ranged attacks)',
                        },
                    },
                ],
            },
            source: 'PG 76 CB',
            source_detail: {
                book: 'CB',
                page: 76,
            },
        },
        {
            name: 'Fanatic',
            flavor_text:
                'Single-minded in the pursuit of their vital goals or the destruction of their hated enemies; there are no limits to what extremes they will go as a result of their obsessive beliefs.',
            role_aptitudes: ['Leadership', 'Offence', 'Toughness', 'Weapon Skill', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Leadership', 'Offence', 'Toughness', 'Weapon Skill', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Deny the Witch', 'Jaded'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Deny the Witch',
                    },
                    {
                        talent: 'Jaded',
                    },
                ],
            },
            role_bonus: {
                name: 'Death to All Who Oppose Me!',
                benefit:
                    'In addition to the normal uses of Fate points, a Fanatic character may spend a Fate point to count as having the Hatred talent against his current foe for the duration of the encounter. Should he choose to leave combat against a Hated foe in that encounter, however, he gains 1 Insanity point.',
                automatable: true,
                implementation_complexity: 'high',
                implementation_note:
                    "Needs a temporary-effect grant scoped to a specific enemy and to 'this encounter' (expires at encounter end), plus a 'left combat while a Hated foe was present' detector to apply the Insanity-point side effect. Both concepts (temporary/scoped talent grant, leave-combat detection) do not currently exist as generic system primitives per the CB roles' review; this is the most engineering-heavy role bonus in the set.",
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared at any time',
                        effect_type: 'grant_temporary_talent',
                        effect_details: {
                            talent: 'Hatred',
                            scope: 'against his current foe only',
                            duration: 'for the duration of the encounter',
                            side_effect_condition: {
                                trigger: 'chooses to leave combat against that Hated foe within that same encounter',
                                effect: 'gains 1 Insanity point',
                            },
                        },
                    },
                ],
            },
            source: 'PG 34 EI',
            source_detail: {
                book: 'EI',
                page: 34,
            },
        },
        {
            name: 'Penitent',
            flavor_text:
                'Driven by atonement and contrition; having learned their sins through self-discovery or external excruciation, they are eager to suffer and prove their dedication to the Emperor.',
            role_aptitudes: ['Agility', 'Fieldcraft', 'Intelligence', 'Offence', 'Toughness'],
            role_aptitudes_structured: {
                fixed: ['Agility', 'Fieldcraft', 'Intelligence', 'Offence', 'Toughness'],
                choice_groups: [],
            },
            role_talents: ['Die Hard', 'Flagellant'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Die Hard',
                    },
                    {
                        talent: 'Flagellant',
                    },
                ],
            },
            role_bonus: {
                name: 'Cleansing Pain',
                benefit:
                    'Whenever a Penitent character suffers 1 or more points of damage (after reductions for Toughness bonus and Armour), he gains a +10 bonus to the first test he makes before the end of his next turn.',
                automatable: true,
                implementation_complexity: 'medium',
                implementation_note:
                    "Needs a hook on post-mitigation damage application, and a 'next test before end of next turn' expiring bonus, similar to a one-shot buff.",
                clauses: [
                    {
                        cost: {
                            type: 'free',
                        },
                        timing: 'passive_always_on',
                        trigger: 'suffers 1 or more points of damage (after reductions for Toughness bonus and Armour)',
                        effect_type: 'passive_conditional_bonus',
                        effect_details: {
                            bonus: '+10 to the first test he makes before the end of his next turn',
                        },
                    },
                ],
            },
            source: 'PG 36 EI',
            source_detail: {
                book: 'EI',
                page: 36,
            },
        },
        {
            name: 'Ace',
            flavor_text:
                'Expert drivers, pilots, and operators, skilled at communing with the machine spirits of vehicles of all kinds; utilising their craft like an extension of their own bodies, they push the machine beyond normal limits to ensure no heretic or alien escapes proper retribution.',
            role_aptitudes: ['Agility', 'Finesse', 'Perception', 'Tech', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Agility', 'Finesse', 'Perception', 'Tech', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Hard Target', 'Hotshot Pilot'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Hard Target',
                    },
                    {
                        talent: 'Hotshot Pilot',
                    },
                ],
            },
            role_bonus: {
                name: 'Right Stuff',
                benefit:
                    'In addition to the normal uses of Fate points, an Ace character may spend a Fate point to automatically succeed at an Operate or Survival skill test involving vehicles or living steeds with a number of degrees of success equal to his Agility bonus.',
                automatable: true,
                implementation_complexity: 'low',
                implementation_note: null,
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared instead of rolling an Operate or Survival skill test involving vehicles or living steeds',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: "Operate or Survival skill test involving vehicles or living steeds (player's choice)",
                            degrees_of_success_source: 'Agility bonus',
                        },
                    },
                ],
            },
            source: 'PG 38 EO',
            source_detail: {
                book: 'EO',
                page: 38,
            },
        },
        {
            name: 'Crusader',
            flavor_text:
                'Righteous warriors who battle the Daemon and heretic in single combat with blessed blade and power sword; they guard their allies with faith and shield, standing firm against the unholy tide.',
            role_aptitudes: ['Knowledge', 'Offence', 'Strength', 'Toughness', 'Willpower'],
            role_aptitudes_structured: {
                fixed: ['Knowledge', 'Offence', 'Strength', 'Toughness', 'Willpower'],
                choice_groups: [],
            },
            role_talents: ['Bodyguard', 'Deny the Witch'],
            role_talent_choice: {
                choose: 1,
                options: [
                    {
                        talent: 'Bodyguard',
                    },
                    {
                        talent: 'Deny the Witch',
                    },
                ],
            },
            role_bonus: {
                name: 'Smite the Unholy',
                benefit:
                    "In addition to the normal uses of Fate Points (see pg 293CB), a Crusader character can also spend a Fate Point to automatically pass a Fear test with a number of degrees of success equal to his Willpower bonus. In addition, whenever he inflicts a hit with a melee attack against a target with the Fear (X) trait, he inflicts X additional damage and counts his weapon's penetration as being X higher.",
                automatable: true,
                implementation_complexity: 'medium',
                implementation_note:
                    "Two independent clauses bundled under one bonus name: a Fate-point auto-pass on Fear tests, and an always-on passive damage/penetration bonus keyed to the target's Fear (X) trait value. Only the second clause needs to read an opposing actor's trait value during damage calc.",
                clauses: [
                    {
                        cost: {
                            type: 'fate_point',
                            amount: 1,
                        },
                        timing: 'proactive_declared',
                        trigger: 'declared instead of rolling a Fear test',
                        effect_type: 'auto_succeed_test',
                        effect_details: {
                            test: 'Fear test',
                            degrees_of_success_source: 'Willpower bonus',
                        },
                    },
                    {
                        cost: {
                            type: 'free',
                        },
                        timing: 'passive_always_on',
                        trigger: 'inflicts a hit with a melee attack against a target with the Fear (X) trait',
                        effect_type: 'damage_and_penetration_bonus_vs_trait',
                        effect_details: {
                            trait: 'Fear (X)',
                            extra_damage: 'X',
                            extra_penetration: 'X',
                        },
                    },
                ],
            },
            source: 'PG 34 EB',
            source_detail: {
                book: 'EB',
                page: 34,
            },
        },
    ];
}

export function roleNames() {
    return roles().map((r) => r.name);
}
