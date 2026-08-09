/**
 * WARNING: `aptitudes` below is a flat 2-element array (e.g. ['Knowledge', 'Social']) that looks
 * like a fixed grant of both, but every single Core Rulebook background's book text actually reads
 * "X or Social" - a mandatory CHOICE of exactly one, never both. This was true for all 7 CB
 * backgrounds with zero exceptions (Phase 3 extraction, verified against page images). Nothing in
 * this codebase currently reads `aptitudes` programmatically, but any future character-creation
 * wizard MUST NOT treat this array as "grant both" - use the new `background_aptitude.choice` field
 * instead, which correctly encodes it as { count: 1, options: [a, b] }. `aptitudes` itself is left
 * unchanged here because something else may already read it; do not delete it.
 */
export function backgrounds() {
    return [
        {
            name: 'Adeptus Administratum',
            starting_skills: 'Commerce or Medicae, Common Lore (Adeptus Administratum), Linguistics (High Gothic), Logic, Scholastic Lore (Pick One)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Common Lore',
                        speciality: 'Adeptus Administratum',
                    },
                    {
                        skill: 'Linguistics',
                        speciality: 'High Gothic',
                    },
                    {
                        skill: 'Logic',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Commerce',
                                grants: [
                                    {
                                        skill: 'Commerce',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Medicae',
                                grants: [
                                    {
                                        skill: 'Medicae',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        free_choice: true,
                        note: 'Book names no candidate specialisations here; player selects any one Scholastic Lore specialisation.',
                        options: [
                            {
                                label: 'Scholastic Lore (any specialisation)',
                                grants: [
                                    {
                                        skill: 'Scholastic Lore',
                                        speciality: "player's choice",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Las or Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Las)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Las',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Solid Projectile)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Solid Projectile',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Laspistol or Stub Automatic, Imperial robes, Autoquill, Chrono, Dataslate, Medi-kit',
            starting_equipment_structured: {
                fixed_equipment: ['Imperial robes', 'Autoquill', 'Chrono', 'Dataslate', 'Medi-kit'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Laspistol', 'Stub Automatic'],
                    },
                ],
            },
            background_bonus: {
                name: 'Master of Paperwork',
                benefit:
                    'An Adeptus Administratum character counts the Availability of all items as one level more available (Very Rare items count as Rare, Average items count as Common, etc.).',
                entries: [
                    {
                        name: 'Master of Paperwork',
                        benefit:
                            'An Adeptus Administratum character counts the Availability of all items as one level more available (Very Rare items count as Rare, Average items count as Common, etc.).',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: ['Availability of all items counts as one step more available (e.g. Very Rare counts as Rare, Average counts as Common).'],
                    },
                ],
            },
            aptitudes: ['Knowledge', 'Social'],
            background_aptitude: {
                prose: 'Knowledge or Social',
                choice: {
                    count: 1,
                    options: ['Knowledge', 'Social'],
                },
            },
            source: 'PG 46 CB',
        },
        {
            name: 'Adeptus Arbites',
            starting_skills: 'Awareness, Common Lore (Adeptus Arbites, Underworld), Inquiry or Interrogation, Intimidate, Scrutiny',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Awareness',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Adeptus Arbites',
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Underworld',
                    },
                    {
                        skill: 'Intimidate',
                        speciality: null,
                    },
                    {
                        skill: 'Scrutiny',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Inquiry',
                                grants: [
                                    {
                                        skill: 'Inquiry',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Interrogation',
                                grants: [
                                    {
                                        skill: 'Interrogation',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Shock or Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Shock)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Shock',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Solid Projectile)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Solid Projectile',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Shotgun or Shock Maul, Enforcer Light Carapace Armor or Carapace Chest Plate, 3 doses of Stimm, Manacles, 12 lho sticks',
            starting_equipment_structured: {
                fixed_equipment: ['3 doses of Stimm', 'Manacles', '12 lho sticks'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Shotgun', 'Shock Maul'],
                    },
                    {
                        count: 1,
                        options: ['Enforcer Light Carapace Armour', 'Carapace Chest Plate'],
                    },
                ],
            },
            background_bonus: {
                name: 'The Face of the Law',
                benefit:
                    'An Arbitrator can re-roll any Intimidation and Interrogation test, and can substitute his Willpower bonus for his degrees of success on these tests.',
                entries: [
                    {
                        name: 'The Face of the Law',
                        benefit:
                            'An Arbitrator can re-roll any Intimidation and Interrogation test, and can substitute his Willpower bonus for his degrees of success on these tests.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'May re-roll any Intimidate or Interrogation test.',
                            'May substitute Willpower bonus for degrees of success on Intimidate/Interrogation tests.',
                        ],
                    },
                ],
            },
            aptitudes: ['Offence', 'Defence'],
            background_aptitude: {
                prose: 'Offence or Defence',
                choice: {
                    count: 1,
                    options: ['Offence', 'Defence'],
                },
            },
            source: 'PG 48 CB',
        },
        {
            name: 'Adeptus Astra Telepathica',
            starting_skills:
                'Awareness, Common Lore (Adeptus Astra Telepathica), Deceive or Interrogation, Forbidden Lore (the Warp), Psyniscience or Scrutiny',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Awareness',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Adeptus Astra Telepathica',
                    },
                    {
                        skill: 'Forbidden Lore',
                        speciality: 'the Warp',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Deceive',
                                grants: [
                                    {
                                        skill: 'Deceive',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Interrogation',
                                grants: [
                                    {
                                        skill: 'Interrogation',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Psyniscience',
                                grants: [
                                    {
                                        skill: 'Psyniscience',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Scrutiny',
                                grants: [
                                    {
                                        skill: 'Scrutiny',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Las, Low-Tech)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Las',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Low-Tech',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Laspistol, Staff or Whip, Light Flak Cloak or Flak Vest, Micro-bead or Psy Focus',
            starting_equipment_structured: {
                fixed_equipment: ['Laspistol'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Staff', 'Whip'],
                    },
                    {
                        count: 1,
                        options: ['Light Flak Cloak', 'Flak Vest'],
                    },
                    {
                        count: 1,
                        options: ['Micro-bead', 'Psy Focus'],
                    },
                ],
            },
            background_bonus: {
                name: 'The Constant Threat',
                benefit:
                    'When the character or an ally within 10 meters triggers a roll on the Psychic Phenomenon table. Adeptus Astra Telepathica character can increase or decrease the result by amount equal to his Willpower bonus.Tested on Terra: If the character takes the Psyker elite advance during character creation, he also gains the Sanctioned trait.',
                entries: [
                    {
                        name: 'The Constant Threat',
                        benefit:
                            'When the character or an ally within 10 metres triggers a roll on Table 6-2: Psychic Phenomenon, the Adeptus Astra Telepathica character can increase or decrease the result by an amount equal to his Willpower bonus.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'May adjust (up or down) any Psychic Phenomenon roll triggered by self or an ally within 10 metres, by an amount equal to Willpower bonus.',
                        ],
                    },
                    {
                        name: 'Tested on Terra',
                        benefit: 'If the character takes the Psyker elite advance during character creation, he also gains the Sanctioned trait.',
                        conditional: true,
                        condition: 'Character takes the Psyker elite advance during character creation.',
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: ['Sanctioned'],
                        trait_choices: [],
                        effects: [],
                    },
                ],
            },
            aptitudes: ['Defence', 'Psyker'],
            background_aptitude: {
                prose: 'Defence or Psyker',
                choice: {
                    count: 1,
                    options: ['Defence', 'Psyker'],
                },
            },
            source: 'PG 50 CB',
        },
        {
            name: 'Adeptus Mechanicus',
            starting_skills: 'Awareness or Operate (Pick One), Common Lore (Adeptus Mechanicus), Logic, Security, Tech-Use',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Common Lore',
                        speciality: 'Adeptus Mechanicus',
                    },
                    {
                        skill: 'Logic',
                        speciality: null,
                    },
                    {
                        skill: 'Security',
                        speciality: null,
                    },
                    {
                        skill: 'Tech-Use',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        note: 'Book gives no Operate specialisation here; if Operate is chosen its specialisation (Surface/Aeronautica/Voidship) is presumably also the player’s free choice.',
                        options: [
                            {
                                label: 'Awareness',
                                grants: [
                                    {
                                        skill: 'Awareness',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Operate (any)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: "player's choice",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Mechadendrite Use (Utility), Weapon Training (Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Mechadendrite Use',
                        speciality: 'Utility',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Solid Projectile',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: {
                prose: 'Mechanicus Implants (see page 137).',
                fixed_traits: ['Mechanicus Implants'],
                trait_choices: [],
            },
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Autogun or Hand Cannon, Monotask Servo-Skull (utility) or Optical Mechadendrite, Imperial robes, 2 vials of sacred unguents',
            starting_equipment_structured: {
                fixed_equipment: ['Imperial robes', '2 vials of sacred unguents'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Autogun', 'Hand Cannon'],
                    },
                    {
                        count: 1,
                        options: ['Monotask Servo-Skull (Utility)', 'Optical Mechadendrite'],
                    },
                ],
            },
            background_bonus: {
                name: 'Replace the Weak Flesh',
                benefit:
                    'An Adeptus Mechanicus character counts the Availability of all cybernetics as two levels more available (Rare items count as Average, Very Rare items count as Scarce, etc.). Starting Trait: Mechanicus Implants.',
                entries: [
                    {
                        name: 'Replace the Weak Flesh',
                        benefit:
                            'An Adeptus Mechanicus character counts the Availability of all cybernetics as two levels more available (Rare items count as Average, Very Rare items count as Scarce, etc.).',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'Availability of all cybernetics counts as two steps more available (e.g. Rare counts as Average, Very Rare counts as Scarce).',
                        ],
                    },
                ],
            },
            aptitudes: ['Knowledge', 'Tech'],
            background_aptitude: {
                prose: 'Knowledge or Tech',
                choice: {
                    count: 1,
                    options: ['Knowledge', 'Tech'],
                },
            },
            source: 'PG 52 CB',
        },
        {
            name: 'Adeptus Ministorum',
            starting_skills: 'Charm, Command, Common Lore (Adeptus Ministorum), Inquiry or Scrutiny, Linguistics (High Gothic)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Charm',
                        speciality: null,
                    },
                    {
                        skill: 'Command',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Adeptus Ministorum',
                    },
                    {
                        skill: 'Linguistics',
                        speciality: 'High Gothic',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Inquiry',
                                grants: [
                                    {
                                        skill: 'Inquiry',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Scrutiny',
                                grants: [
                                    {
                                        skill: 'Scrutiny',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Flame) or Weapon Training (Low-Tech, Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Flame)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Flame',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Low-Tech, Solid Projectile)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Low-Tech',
                                    },
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Solid Projectile',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment:
                'Hand Flamer (or Warhammer and Stub Revolver), Imperial Robes or Flak Vest, Backpack, Glow-Globe, Monotask Servo-Skull (Laud Hailer)',
            starting_equipment_structured: {
                fixed_equipment: ['Backpack', 'Glow-Globe', 'Monotask Servo-Skull (Laud Hailer)'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Hand Flamer', 'Warhammer and Stub Revolver'],
                    },
                    {
                        count: 1,
                        options: ['Imperial Robes', 'Flak Vest'],
                    },
                ],
            },
            background_bonus: {
                name: 'Faith is All',
                benefit: 'When spending a Fate point to gain a+10 bonus to any one test, an Adeptus Ministorum character gains a +20 bonus instead.',
                entries: [
                    {
                        name: 'Faith is All',
                        benefit: 'When spending a Fate point to gain a +10 bonus to any one test, an Adeptus Ministorum character gains a +20 bonus instead.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: ['Spending a Fate point for a +10 bonus to a test instead grants +20.'],
                    },
                ],
            },
            aptitudes: ['Leadership', 'Social'],
            background_aptitude: {
                prose: 'Leadership or Social',
                choice: {
                    count: 1,
                    options: ['Leadership', 'Social'],
                },
            },
            source: 'PG 54 CB',
        },
        {
            name: 'Imperial Guard',
            starting_skills: 'Athletics, Command, Common Lore (Imperial Guard), Medicae or Operate (Surface), Navigate (Surface)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Athletics',
                        speciality: null,
                    },
                    {
                        skill: 'Command',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Imperial Guard',
                    },
                    {
                        skill: 'Navigate',
                        speciality: 'Surface',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Medicae',
                                grants: [
                                    {
                                        skill: 'Medicae',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Operate (Surface)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: 'Surface',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Las, Low-Tech)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Las',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Low-Tech',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Lasgun (or Laspistol and Sword), Combat Vest, Imperial Guard Flak Armor, Grapnel and Line, 12 lho sticks, Magnoculars',
            starting_equipment_structured: {
                fixed_equipment: ['Combat Vest', 'Imperial Guard Flak Armour', 'Grapnel and Line', '12 lho sticks', 'Magnoculars'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Lasgun', 'Laspistol and Sword'],
                    },
                ],
            },
            background_bonus: {
                name: 'Hammer of the Emperor',
                benefit:
                    "When attacking a target that an ally attacked since the end of the Guardsman's last turn, the Guardsman can re-roll any results of 1 or 2 damage rolls.",
                entries: [
                    {
                        name: 'Hammer of the Emperor',
                        benefit:
                            "When attacking a target that an ally attacked since the end of the Guardsman's last turn, the Guardsman can re-roll any results of 1 or 2 damage rolls.",
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'May re-roll damage-roll results of 1 or 2 when attacking a target an ally attacked since the end of this character’s last turn.',
                        ],
                    },
                ],
            },
            aptitudes: ['Fieldcraft', 'Leadership'],
            background_aptitude: {
                prose: 'Fieldcraft or Leadership',
                choice: {
                    count: 1,
                    options: ['Fieldcraft', 'Leadership'],
                },
            },
            source: 'PG 56 CB',
        },
        {
            name: 'Outcast',
            starting_skills: 'Acrobatics or Sleight of Hand, Common Lore (Underworld), Deceive, Dodge, Stealth',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Common Lore',
                        speciality: 'Underworld',
                    },
                    {
                        skill: 'Deceive',
                        speciality: null,
                    },
                    {
                        skill: 'Dodge',
                        speciality: null,
                    },
                    {
                        skill: 'Stealth',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Acrobatics',
                                grants: [
                                    {
                                        skill: 'Acrobatics',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Sleight of Hand',
                                grants: [
                                    {
                                        skill: 'Sleight of Hand',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Chain, and Las or Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Chain',
                    },
                ],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Las)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Las',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Solid Projectile)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Solid Projectile',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Autopistol or Laspistol, Chainsword, Armored Body Glove or Flak Vest, Injector, 2 doses of obscura or slaught',
            starting_equipment_structured: {
                fixed_equipment: ['Chainsword', 'Injector'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Autopistol', 'Laspistol'],
                    },
                    {
                        count: 1,
                        options: ['Armoured Bodyglove', 'Flak Vest'],
                    },
                    {
                        count: 1,
                        options: ['2 doses of obscura', '2 doses of slaught'],
                    },
                ],
            },
            background_bonus: {
                name: 'Never Quit',
                benefit: 'An Outcast character counts his Toughness bonus as two higher for purposes of determining Fatigue.',
                entries: [
                    {
                        name: 'Never Quit',
                        benefit: 'An Outcast character counts his Toughness bonus as two higher for purposes of determining Fatigue.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: ['Toughness bonus counts as 2 higher solely for the purpose of determining Fatigue thresholds.'],
                    },
                ],
            },
            aptitudes: ['Fieldcraft', 'Social'],
            background_aptitude: {
                prose: 'Fieldcraft or Social',
                choice: {
                    count: 1,
                    options: ['Fieldcraft', 'Social'],
                },
            },
            source: 'PG 58 CB',
        },
        {
            name: 'Adepta Sororitas',
            starting_skills: 'Athletics, Charm or Intimidate, Common Lore (Adepta Sororitas), Linguistics (High Gothic), Medicae or Parry',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Athletics',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Adepta Sororitas',
                    },
                    {
                        skill: 'Linguistics',
                        speciality: 'High Gothic',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Charm',
                                grants: [
                                    {
                                        skill: 'Charm',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Intimidate',
                                grants: [
                                    {
                                        skill: 'Intimidate',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Medicae',
                                grants: [
                                    {
                                        skill: 'Medicae',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Parry',
                                grants: [
                                    {
                                        skill: 'Parry',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Flame or Las, Chain)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Chain',
                    },
                ],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Flame)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Flame',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Las)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Las',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Hand Flamer or Laspistol, Chainblade, Armoured Bodyglove, Chrono, Dataslate, Stab Light, Micro-bead',
            starting_equipment_structured: {
                fixed_equipment: ['Chainblade', 'Armoured Bodyglove', 'Chrono', 'Dataslate', 'Stab Light', 'Micro-bead'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Hand Flamer', 'Laspistol'],
                    },
                ],
            },
            background_bonus: {
                name: 'Incorruptible Devotion',
                benefit:
                    'Whenever an Adepta Sororitas Character would gain 1 or more Corruption Points, she gains that many Insanity Points minus 1 (to a minimum of 0) instead.',
                entries: [
                    {
                        name: 'Incorruptible Devotion',
                        benefit:
                            'Whenever an Adepta Sororitas character would gain 1 or more Corruption Points, she gains that many Insanity Points minus 1 (to a minimum of 0) instead.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: ['When gaining 1 or more Corruption Points, gains that many Insanity Points minus 1 (minimum 0) instead.'],
                    },
                ],
            },
            aptitudes: ['Offence', 'Social'],
            background_aptitude: {
                prose: 'Offence or Social',
                choice: {
                    count: 1,
                    options: ['Offence', 'Social'],
                },
            },
            source: 'PG 30 EI',
        },
        {
            name: 'Mutant',
            starting_skills: 'Acrobatics or Athletics, Awareness, Deceive or Intimidate,Forbidden Lore (Mutants), Survival',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Awareness',
                        speciality: null,
                    },
                    {
                        skill: 'Forbidden Lore',
                        speciality: 'Mutants',
                    },
                    {
                        skill: 'Survival',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Acrobatics',
                                grants: [
                                    {
                                        skill: 'Acrobatics',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Athletics',
                                grants: [
                                    {
                                        skill: 'Athletics',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Deceive',
                                grants: [
                                    {
                                        skill: 'Deceive',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Intimidate',
                                grants: [
                                    {
                                        skill: 'Intimidate',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents:
                'Weapon Training (Low-Tech, Solid Projectile) Also one of the following: Amphibious, Dark-sight, Natural Weapons, Sonar Sense, Sturdy, Toxic (1), Unnatural Agility (1), Unnatural Strength (1), or Unnatural Toughness (1)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Low-Tech',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Solid Projectile',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: {
                prose: 'One of the following: Amphibious, Dark-sight, Natural Weapons, Sonar Sense, Sturdy, Toxic (1), Unnatural Agility (1), Unnatural Strength (1), or Unnatural Toughness (1).',
                fixed_traits: [],
                trait_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Amphibious',
                                grants: [
                                    {
                                        trait: 'Amphibious',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Dark-sight',
                                grants: [
                                    {
                                        trait: 'Dark-sight',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Natural Weapons',
                                grants: [
                                    {
                                        trait: 'Natural Weapons',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Sonar Sense',
                                grants: [
                                    {
                                        trait: 'Sonar Sense',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Sturdy',
                                grants: [
                                    {
                                        trait: 'Sturdy',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Toxic (1)',
                                grants: [
                                    {
                                        trait: 'Toxic',
                                        speciality: '1',
                                    },
                                ],
                            },
                            {
                                label: 'Unnatural Agility (1)',
                                grants: [
                                    {
                                        trait: 'Unnatural Characteristic',
                                        speciality: 'Agility (1)',
                                    },
                                ],
                            },
                            {
                                label: 'Unnatural Strength (1)',
                                grants: [
                                    {
                                        trait: 'Unnatural Characteristic',
                                        speciality: 'Strength (1)',
                                    },
                                ],
                            },
                            {
                                label: 'Unnatural Toughness (1)',
                                grants: [
                                    {
                                        trait: 'Unnatural Characteristic',
                                        speciality: 'Toughness (1)',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_corruption_and_mutation: {
                prose: 'A Mutant character begins play with 10 Corruption points. Instead of rolling as normal for malignancy or mutation, roll 5d10 on Table 8-16: Mutations (see page 292 of the Dark Heresy Core Rulebook) to determine a starting mutation.',
                effects: [
                    'Begins play with 10 Corruption points.',
                    'Instead of rolling normally for malignancy or mutation, roll 5d10 on Table 8-16: Mutations to determine a starting mutation.',
                ],
            },
            starting_malignancy: null,
            starting_equipment: 'Shotgun (or Stub Revolver and Great Weapon), Grapnel and Line, Heavy Leathers, Combat Vest, 2 doses of Stimm',
            starting_equipment_structured: {
                fixed_equipment: ['Grapnel and Line', 'Heavy Leathers', 'Combat Vest', '2 doses of Stimm'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Shotgun', 'Stub Revolver and Great Weapon'],
                    },
                ],
            },
            background_bonus: {
                name: 'Twisted Flesh',
                benefit:
                    'A Mutant character can always choose to fail any test associated with resisting malignancy or mutation. Whenever he would gain a malignancy, he may roll on Table 8-16 to gain a mutation instead. A Mutant character begins play with 10 Corruption points. Instead of rolling as normal for malignancy or mutation, roll 5d10 on to determine a starting mutation.',
                entries: [
                    {
                        name: 'Twisted Flesh',
                        benefit:
                            'A Mutant character can always choose to fail any test associated with resisting malignancy or mutation. Whenever he would gain a malignancy, he may roll on Table 8-16: Mutations to gain a mutation instead.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'May always choose to fail any test associated with resisting malignancy or mutation.',
                            'Whenever he would gain a malignancy, may roll on Table 8-16: Mutations to gain a mutation instead.',
                        ],
                    },
                ],
            },
            aptitudes: ['Fieldcraft', 'Offence'],
            background_aptitude: {
                prose: 'Fieldcraft or Offence',
                choice: {
                    count: 1,
                    options: ['Fieldcraft', 'Offence'],
                },
            },
            source: 'PG 32 EI',
        },
        {
            name: 'Heretek',
            starting_skills: 'Deceive or Inquiry, Forbidden Lore (pick one), Medicae or Security, Tech-Use, Trade (pick one)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Tech-Use',
                        speciality: null,
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Deceive',
                                grants: [
                                    {
                                        skill: 'Deceive',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Inquiry',
                                grants: [
                                    {
                                        skill: 'Inquiry',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        free_choice: true,
                        note: "Book names no candidate specialisation here ('pick one'). System has enumerated Forbidden Lore specialities elsewhere (Archaeotech, Chaos Space Marines, Criminal Cartels and Smugglers, Daemonology, Heresy, The Horus Heresy and the Long War, Inquisition, Mutants, Officio Assassinorum, Pirates, Psykers, The Warp, Xenos); player selects any one.",
                        options: [
                            {
                                label: 'Forbidden Lore (any specialisation)',
                                grants: [
                                    {
                                        skill: 'Forbidden Lore',
                                        speciality: "player's choice",
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Medicae',
                                grants: [
                                    {
                                        skill: 'Medicae',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Security',
                                grants: [
                                    {
                                        skill: 'Security',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        free_choice: true,
                        note: "Book names no candidate specialisation here ('pick one'). System has enumerated Trade specialities elsewhere (Agri, Archaeologist, Armourer, Astrographer, Chymist, Cryptographer, Cook, Explorator, Linguist, Loremancer, Morticator, Performancer, Prospector, Scrimshawer, Sculptor, Shipwright, Soothsayer, Technomat, Voidfarer); player selects any one.",
                        options: [
                            {
                                label: 'Trade (any specialisation)',
                                grants: [
                                    {
                                        skill: 'Trade',
                                        speciality: "player's choice",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Solid Projectile) Mechanicus Implants Trait',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Solid Projectile',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: {
                prose: 'Mechanicus Implants (see page 137 of the Dark Heresy Core Rulebook).',
                fixed_traits: ['Mechanicus Implants'],
                trait_choices: [],
            },
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment:
                'Stub revolver with 2 extra clips of Expander bullets or Man-Stopper rounds, 1 web grenade, combi-tool, flak cloak, filtration plugs, 1 dose of de-tox, dataslate, stab light',
            starting_equipment_structured: {
                fixed_equipment: [
                    'Stub Revolver',
                    '1 web grenade',
                    'combi-tool',
                    'flak cloak',
                    'filtration plugs',
                    '1 dose of de-tox',
                    'dataslate',
                    'stablight',
                ],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['2 extra clips of Expander bullets', '2 extra clips of Man-Stopper rounds'],
                    },
                ],
            },
            background_bonus: {
                name: 'Master of Hidden Lores',
                benefit:
                    'When a Heretek makes a Tech-Use test to comprehend, use, repair, or modify an unfamiliar device, he gains a +20 bonus if he has one or more relevant Forbidden Lore skill specialisations at Rank 1 (Known) or higher.',
                entries: [
                    {
                        name: 'Master of Hidden Lores',
                        benefit:
                            'When a Heretek makes a Tech-Use test to comprehend, use, repair, or modify an unfamiliar device, he gains a +20 bonus if he has one or more relevant Forbidden Lore skill specialisations at Rank 1 (Known) or higher.',
                        conditional: true,
                        condition: 'Character has one or more relevant Forbidden Lore skill specialisations at Rank 1 (Known) or higher.',
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            '+20 bonus to Tech-Use tests to comprehend/use/repair/modify an unfamiliar device, conditional on having a relevant Forbidden Lore specialisation at Rank 1 (Known) or higher.',
                        ],
                    },
                ],
            },
            aptitudes: ['Finesse', 'Tech'],
            background_aptitude: {
                prose: 'Finesse or Tech',
                choice: {
                    count: 1,
                    options: ['Finesse', 'Tech'],
                },
            },
            source: 'PG 32 EO',
        },
        {
            name: 'Imperial Navy',
            starting_skills: 'Athletics, Command or Intimidate, Common Lore (Imperial Navy), Navigate (Stellar), Operate (Aeronautica or Voidship)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Athletics',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Imperial Navy',
                    },
                    {
                        skill: 'Navigate',
                        speciality: 'Stellar',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Command',
                                grants: [
                                    {
                                        skill: 'Command',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Intimidate',
                                grants: [
                                    {
                                        skill: 'Intimidate',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Operate (Aeronautica)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: 'Aeronautica',
                                    },
                                ],
                            },
                            {
                                label: 'Operate (Voidship)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: 'Voidship',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Chain or Shock, Solid Projectile)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Solid Projectile',
                    },
                ],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Chain)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Chain',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Shock)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Shock',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Combat shotgun or hand cannon, chainsword or shock whip, flak coat, rebreather, micro-bead',
            starting_equipment_structured: {
                fixed_equipment: ['flak coat', 'rebreather', 'micro-bead'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Combat shotgun', 'hand cannon'],
                    },
                    {
                        count: 1,
                        options: ['chainsword', 'shock whip'],
                    },
                ],
            },
            background_bonus: {
                name: 'Close Quarters Discipline',
                benefit:
                    'An Imperial Navy character scores one additional degree of success on successful Ballistic Skill tests he makes against targets at Point-Blank range, at Short range, and with whom he is engaged in melee.',
                entries: [
                    {
                        name: 'Close Quarters Discipline',
                        benefit:
                            'An Imperial Navy character scores one additional degree of success on successful Ballistic Skill tests he makes against targets at Point-Blank range, at Short range, and with whom he is engaged in melee.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'Scores one additional degree of success on successful Ballistic Skill tests against targets at Point-Blank range, Short range, or engaged with in melee.',
                        ],
                    },
                ],
            },
            aptitudes: ['Offence', 'Tech'],
            background_aptitude: {
                prose: 'Offence or Tech',
                choice: {
                    count: 1,
                    options: ['Offence', 'Tech'],
                },
            },
            source: 'PG 34 EO',
        },
        {
            name: 'Rogue Trader Fleet',
            starting_skills:
                'Charm or Scrutiny, Commerce, Common Lore (Rogue Traders), Linguistics (pick one alien language), Operate (Surface or Aeronautica)',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Commerce',
                        speciality: null,
                    },
                    {
                        skill: 'Common Lore',
                        speciality: 'Rogue Traders',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Charm',
                                grants: [
                                    {
                                        skill: 'Charm',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Scrutiny',
                                grants: [
                                    {
                                        skill: 'Scrutiny',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        free_choice: true,
                        note: "Book says 'pick one alien language' -- narrower than a totally free choice but still names no specific candidates. System's Linguistics specialities that read as alien languages: Eldar, Necrontyr, Ork, Tau, Xenos Markings.",
                        options: [
                            {
                                label: 'Linguistics (any alien language)',
                                grants: [
                                    {
                                        skill: 'Linguistics',
                                        speciality: "player's choice (alien language)",
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Operate (Surface)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: 'Surface',
                                    },
                                ],
                            },
                            {
                                label: 'Operate (Aeronautica)',
                                grants: [
                                    {
                                        skill: 'Operate',
                                        speciality: 'Aeronautica',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Weapon Training (Las or Solid Projectile, Shock)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Weapon Training',
                        speciality: 'Shock',
                    },
                ],
                talent_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Weapon Training (Las)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Las',
                                    },
                                ],
                            },
                            {
                                label: 'Weapon Training (Solid Projectile)',
                                grants: [
                                    {
                                        talent: 'Weapon Training',
                                        speciality: 'Solid Projectile',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: null,
            starting_equipment: 'Laspistol or autopistol (fitted with Compact weapon upgrade), shock maul, mesh cloak or carapace chestplate, auspex, chrono',
            starting_equipment_structured: {
                fixed_equipment: ['shock maul', 'auspex', 'chrono'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Laspistol (fitted with Compact weapon upgrade)', 'autopistol (fitted with Compact weapon upgrade)'],
                    },
                    {
                        count: 1,
                        options: ['mesh cloak', 'carapace chestplate'],
                    },
                ],
            },
            background_bonus: {
                name: 'Inured to the Xenos',
                benefit:
                    'A character from a Rogue Trader Fleet gains a +10 bonus to Fear tests caused by aliens and a +20 bonus to Interaction skill tests with alien characters.',
                entries: [
                    {
                        name: 'Inured to the Xenos',
                        benefit:
                            'A character from a Rogue Trader Fleet gains a +10 bonus to Fear tests caused by aliens and a +20 bonus to Interaction skill tests with alien characters.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: ['+10 bonus to Fear tests caused by aliens.', '+20 bonus to Interaction skill tests with alien characters.'],
                    },
                ],
            },
            aptitudes: ['Finesse', 'Social'],
            background_aptitude: {
                prose: 'Finesse or Social',
                choice: {
                    count: 1,
                    options: ['Finesse', 'Social'],
                },
            },
            source: 'PG 36 EO',
        },
        {
            name: 'Exorcised',
            starting_skills: 'Awareness, Deceive or Inquiry, Dodge, Forbidden Lore (Daemonology), Intimidate or Scrutiny',
            starting_skills_structured: {
                fixed_skills: [
                    {
                        skill: 'Awareness',
                        speciality: null,
                    },
                    {
                        skill: 'Dodge',
                        speciality: null,
                    },
                    {
                        skill: 'Forbidden Lore',
                        speciality: 'Daemonology',
                    },
                ],
                skill_choices: [
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Deceive',
                                grants: [
                                    {
                                        skill: 'Deceive',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Inquiry',
                                grants: [
                                    {
                                        skill: 'Inquiry',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        count: 1,
                        options: [
                            {
                                label: 'Intimidate',
                                grants: [
                                    {
                                        skill: 'Intimidate',
                                        speciality: null,
                                    },
                                ],
                            },
                            {
                                label: 'Scrutiny',
                                grants: [
                                    {
                                        skill: 'Scrutiny',
                                        speciality: null,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            starting_talents: 'Hatred (Daemons), Weapon Training (Solid Projectile, Chain)',
            starting_talents_structured: {
                fixed_talents: [
                    {
                        talent: 'Hatred',
                        speciality: 'Daemons',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Solid Projectile',
                    },
                    {
                        talent: 'Weapon Training',
                        speciality: 'Chain',
                    },
                ],
                talent_choices: [],
            },
            starting_traits: null,
            starting_corruption_and_mutation: null,
            starting_malignancy: {
                prose: 'An Exorcised character starts with one Malignancy chosen from Table 8-15: Malignancies (see page 290 of the Dark Heresy Core Rulebook).',
                effects: ['Starts with one Malignancy, chosen (not randomly rolled) from Table 8-15: Malignancies.'],
            },
            starting_equipment:
                'Autopistol or stub revolver, shotgun, chainblade, Imperial robes, 3 doses of obscura or tranq, disguise kit or excruciator kit, rebreather, stab light or glow-globe',
            starting_equipment_structured: {
                fixed_equipment: ['shotgun', 'chainblade', 'Imperial robes', 'rebreather'],
                equipment_choices: [
                    {
                        count: 1,
                        options: ['Autopistol', 'stub revolver'],
                    },
                    {
                        count: 1,
                        options: ['3 doses of obscura', '3 doses of tranq'],
                    },
                    {
                        count: 1,
                        options: ['disguise kit', 'excruciator kit'],
                    },
                    {
                        count: 1,
                        options: ['stab light', 'glow-globe'],
                    },
                ],
            },
            background_bonus: {
                name: 'Touched by a Daemon',
                benefit:
                    'An Exorcised character starts with one Malignancy Chosen from the Malignancies table. An Exorcised character counts his Insanity bonus as 2 higher for purposes of avoiding Fear Tests. Additionally, he can never again become possessed by the same Daemon that once possessed him.',
                entries: [
                    {
                        name: 'Touched by a Daemon',
                        benefit:
                            'An Exorcised character counts his Insanity bonus as 2 higher for purposes of avoiding Fear tests. Additionally, he can never again become possessed by the same Daemon that once possessed him.',
                        conditional: false,
                        condition: null,
                        fixed_skills: [],
                        skill_choices: [],
                        fixed_talents: [],
                        talent_choices: [],
                        fixed_traits: [],
                        trait_choices: [],
                        effects: [
                            'Insanity bonus counts as 2 higher for purposes of avoiding Fear tests.',
                            'Can never again become possessed by the same Daemon that once possessed him.',
                        ],
                    },
                ],
            },
            aptitudes: ['Defence', 'Knowledge'],
            background_aptitude: {
                prose: 'Defence or Knowledge',
                choice: {
                    count: 1,
                    options: ['Defence', 'Knowledge'],
                },
            },
            source: 'PG 32 EB',
        },
    ];
}

export function backgroundNames() {
    return backgrounds().map((b) => b.name);
}
