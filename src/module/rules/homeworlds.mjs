export function homeworlds() {
    return [
        {
            name: 'Feral World',
            bonus_characteristics: ['Strength', 'Toughness'],
            negative_characteristic: 'Influence',
            fate_threshold: 2,
            emperors_blessing: 3,
            home_world_bonus: {
                name: 'The Old Ways',
                benefit: "A Feral World character's Low-Tech weapons lose any present Primitive Qualities and gain the Proven (3) Quality.",
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ['Low-Tech weapons wielded by this character lose the Primitive quality (if they had it) and gain the Proven (3) quality.'],
                },
            },
            aptitude: 'Toughness',
            wounds: '9+1d5',
            source: 'PG 32 CB',
        },
        {
            name: 'Forge World',
            bonus_characteristics: ['Intelligence', 'Toughness'],
            negative_characteristic: 'Fellowship',
            fate_threshold: 3,
            emperors_blessing: 8,
            home_world_bonus: {
                name: "Omnissiah's Chosen",
                benefit: 'A Forge World character gains the Technical Knock or Weapon-Tech Talent.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [
                        {
                            count: 1,
                            options: [
                                {
                                    label: 'Technical Knock',
                                    grants: [
                                        {
                                            talent: 'Technical Knock',
                                            speciality: null,
                                        },
                                    ],
                                },
                                {
                                    label: 'Weapon-Tech',
                                    grants: [
                                        {
                                            talent: 'Weapon-Tech',
                                            speciality: null,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [],
                },
            },
            aptitude: 'Intelligence',
            wounds: '8+1d5',
            source: 'PG 34 CB',
        },
        {
            name: 'Highborn',
            bonus_characteristics: ['Fellowship', 'Influence'],
            negative_characteristic: 'Toughness',
            fate_threshold: 4,
            emperors_blessing: 10,
            home_world_bonus: {
                name: 'Breeding Counts',
                benefit: 'A Highborn character reduces Influence losses by 1, to a minimum loss of 1.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ['Whenever this character would reduce his Influence, he reduces it by 1 less (to a minimum reduction of 1).'],
                },
            },
            aptitude: 'Fellowship',
            wounds: '9+1d5',
            source: 'PG 36 CB',
        },
        {
            name: 'Hive World',
            bonus_characteristics: ['Agility', 'Perception'],
            negative_characteristic: 'Willpower',
            fate_threshold: 2,
            emperors_blessing: 6,
            home_world_bonus: {
                name: 'Teeming Masses in Metal Mountains',
                benefit:
                    'A Hive World character moves through crowds as if they were open terrain and gains a +20 bonus to Navigate (Surface) Tests in closed spaces.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'Ignores crowds for purposes of movement, treating them as open terrain.',
                        '+20 bonus to Navigate (Surface) Tests when in enclosed spaces.',
                    ],
                },
            },
            aptitude: 'Perception',
            wounds: '8+1d5',
            source: 'PG 38 CB',
        },
        {
            name: 'Shrine World',
            bonus_characteristics: ['Fellowship', 'Willpower'],
            negative_characteristic: 'Perception',
            fate_threshold: 3,
            emperors_blessing: 6,
            home_world_bonus: {
                name: 'Faith in the Creed',
                benefit: "When spending a Fate Point, a Shrine World character's number of Fate Points are not reduced on a 1d10 result of 1.",
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ['Whenever this character spends a Fate point, he rolls 1d10; on a result of 1, his total number of Fate points is not reduced.'],
                },
            },
            aptitude: 'Willpower',
            wounds: '7+1d5',
            source: 'PG 40 CB',
        },
        {
            name: 'Garden World',
            bonus_characteristics: ['Fellowship', 'Agility'],
            negative_characteristic: 'Toughness',
            fate_threshold: 2,
            emperors_blessing: 4,
            home_world_bonus: {
                name: 'Serenity of the Green',
                benefit:
                    'A garden world character halves the duration (rounded up) of any result from Table 8-11: Shock or Table 8-13: Mental Traumas, and can remove Insanity points for 50xp per point.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'Halves (rounded up) the duration of any result rolled on Table 8-11: Shock or Table 8-13: Mental Traumas (Core Rulebook pages 287-288).',
                        'May remove Insanity points for 50xp per point, rather than the normal 100xp per point.',
                    ],
                },
            },
            aptitude: 'Social',
            wounds: '7+1d5',
            source: 'PG 28 EO',
        },
        {
            name: 'Research Station',
            bonus_characteristics: ['Intelligence', 'Perception'],
            negative_characteristic: 'Fellowship',
            fate_threshold: 3,
            emperors_blessing: 8,
            home_world_bonus: {
                name: 'Pursuit of Data',
                benefit:
                    'Whenever character reaches Rank 2 (Trained) in a Scholastic Lore skill, he also gains Rank 1 (Known) in one related or identical Forbidden Lore skill specialization of his choice. The GM is the final arbiter of whether the two specializations are related.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'Whenever this character reaches Rank 2 (Trained) in any Scholastic Lore specialisation, he also gains Rank 1 (Known) in one related or identical Forbidden Lore specialisation of his choice (GM adjudicates relatedness). This is a triggered rule that can fire during later advancement, not a one-time grant resolved at character creation, so it is not modelled as a skill_choice here.',
                    ],
                },
            },
            aptitude: 'Knowledge',
            wounds: '8+1d5',
            source: 'PG 30 EO',
        },
        {
            name: 'Voidborn',
            bonus_characteristics: ['Intelligence', 'Willpower'],
            negative_characteristic: 'Strength',
            fate_threshold: 3,
            emperors_blessing: 5,
            home_world_bonus: {
                name: 'Child of the Dark',
                benefit: 'A Voidborn character gains a the Strong Minded Talent and a +30 bonus to movement tests in zero gravity.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [
                        {
                            talent: 'Strong Minded',
                            speciality: null,
                        },
                    ],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ['+30 bonus to Tests made to move in a zero gravity environment.'],
                },
            },
            aptitude: 'Intelligence',
            wounds: '7+1d5',
            source: 'PG 42 CB',
        },
        {
            name: 'Agri-World',
            bonus_characteristics: ['Fellowship', 'Strength'],
            negative_characteristic: 'Agility',
            fate_threshold: 2,
            emperors_blessing: 7,
            home_world_bonus: {
                name: 'Strength from the Land',
                benefit: 'An agri-world Character starts with the Brutal Charge (2) trait.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: ['Brutal Charge (2)'],
                    trait_choices: [],
                    effects: [],
                },
            },
            aptitude: 'Strength',
            wounds: '8+1d5',
            source: 'PG 24 EI',
        },
        {
            name: 'Agri-World (Novo Arcadia)',
            bonus_characteristics: ['Fellowship', 'Strength'],
            negative_characteristic: 'Agility',
            fate_threshold: 2,
            emperors_blessing: 7,
            home_world_bonus: {
                name: 'An Unforgettable Encounter',
                benefit:
                    'Due to an unfortunate encounter during warp travel which left this character scarred if they are surprised, non-surprised attackers do not gain the normal +30 bonus to their Weapon Skill and Ballistic Skill tests when targeting this character.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'While this character is surprised, non-surprised attackers do not gain the normal +30 bonus to their Weapon Skill and Ballistic Skill tests when targeting him.',
                    ],
                },
                homebrew: true,
                homebrew_note:
                    "Campaign homebrew, confirmed by this game's GM -- not a printed home world. Its bonus is mechanically the same as Death World's 'Survivor's Paranoia' but written for this table. Do not go looking for it in the rulebooks: 'Novo Arcadia' appears in none of the four DH2e PDFs, and Enemies Within's only named agri-world variant is Kalto (p.85), a different place with a different bonus.",
            },
            aptitude: 'Strength',
            wounds: '8+1d5',
            // Deliberately not a page citation: this is homebrew, not printed, so no page
            // citation exists. Do not restore 'PG 24 EI' -- that is the ordinary Agri-World's
            // page.
            source: 'Homebrew',
        },
        {
            name: 'Feudal World',
            bonus_characteristics: ['Perception', 'Weapon Skill'],
            negative_characteristic: 'Intelligence',
            fate_threshold: 3,
            emperors_blessing: 6,
            home_world_bonus: {
                name: 'At Home in Armor',
                benefit: 'A feudal world character ignores the maximum Agility value imposed by any armor he is wearing.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ['Ignores the maximum Agility value imposed by any armour worn.'],
                },
            },
            aptitude: 'Weapon Skill',
            wounds: '9+1d5',
            source: 'PG 26 EI',
        },
        {
            name: 'Frontier World',
            bonus_characteristics: ['Ballistic Skill', 'Perception'],
            negative_characteristic: 'Fellowship',
            fate_threshold: 3,
            emperors_blessing: 7,
            home_world_bonus: {
                name: 'Rely on None but Yourself',
                benefit:
                    'A frontier world character gains a +20 bonus to Tech-use test when applying personal weapon modifications, and a +10 bonus when repairing damaged items.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        '+20 bonus to Tech-Use tests when applying personal weapon modifications.',
                        '+10 bonus to Tech-Use tests when repairing damaged items.',
                    ],
                },
            },
            aptitude: 'Ballistic Skill',
            wounds: '7+1d5',
            source: 'PG 28 EI',
        },
        {
            name: 'Death World',
            bonus_characteristics: ['Agility', 'Perception'],
            negative_characteristic: 'Fellowship',
            fate_threshold: 2,
            emperors_blessing: 5,
            home_world_bonus: {
                name: "Survivor's Paranoia",
                benefit:
                    'While a death world character is surprised, non-surprised attackers do not gain the normal +30 bonus to their Weapon Skill and Ballistic Skill tests when targeting this character.',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'While this character is Surprised, non-Surprised attackers do not gain the normal +30 bonus to their Weapon Skill and Ballistic Skill tests when targeting him.',
                    ],
                },
            },
            aptitude: 'Fieldcraft',
            wounds: '9+1d5',
            source: 'PG 26 EO',
        },
        {
            name: 'Daemon World',
            bonus_characteristics: ['Willpower', 'Perception'],
            negative_characteristic: 'Fellowship',
            fate_threshold: 3,
            emperors_blessing: 4,
            home_world_bonus: {
                name: 'Touched by the Warp',
                benefit:
                    'Begins with one Rank in the Psyniscience skill. Should he gain this skill again in a later step of character creation, he instead gains one additional Rank in the skill. Note that he cannot purchase more Ranks of this skill unless he acquires the Psyker aptitude. This character also begins with 1d10+5 Corruption points.',
                structured: {
                    fixed_skills: [
                        {
                            skill: 'Psyniscience',
                            speciality: null,
                        },
                    ],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [
                        'Begins with one Rank (Known) in Psyniscience (captured as a fixed skill grant above).',
                        'If this character would gain the Psyniscience skill again during a later step of character creation, he instead gains one additional Rank in it.',
                        'Cannot purchase further Ranks of Psyniscience unless he acquires the Psyker aptitude.',
                        'Begins with 1d10+5 Corruption points.',
                    ],
                },
            },
            aptitude: 'Willpower',
            wounds: '7+1d5',
            source: 'PG 26 EB',
        },
        {
            name: 'Penal Colony',
            bonus_characteristics: ['Toughness', 'Perception'],
            negative_characteristic: 'Influence',
            fate_threshold: 3,
            emperors_blessing: 8,
            home_world_bonus: {
                name: 'Finger on the Pulse',
                benefit:
                    'One survives a penal colony by instinctively knowing who is in charge and who is a threat. A penal colony character begins with one Rank in the Common Lore (Underworld) and Scrutiny skills,and starts with the Peer (Criminal Cartels) talent.',
                structured: {
                    fixed_skills: [
                        {
                            skill: 'Common Lore',
                            speciality: 'Underworld',
                        },
                        {
                            skill: 'Scrutiny',
                            speciality: null,
                        },
                    ],
                    skill_choices: [],
                    fixed_talents: [
                        {
                            talent: 'Peer',
                            speciality: 'Criminal Cartels',
                        },
                    ],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: [],
                },
            },
            aptitude: 'Toughness',
            wounds: '10+1d5',
            source: 'PG 28 EB',
        },
        {
            name: 'Quarantine World',
            bonus_characteristics: ['Ballistic Skill', 'Intelligence'],
            negative_characteristic: 'Strength',
            fate_threshold: 3,
            emperors_blessing: 9,
            home_world_bonus: {
                name: 'Secretive by Nature',
                benefit:
                    'Those who manage to leave a quarantine world learn how to keep secrets. Whenever the warband’s Subtlety would decrease, it decreases by 2 less (to a minimum reduction of 1).',
                structured: {
                    fixed_skills: [],
                    skill_choices: [],
                    fixed_talents: [],
                    talent_choices: [],
                    fixed_traits: [],
                    trait_choices: [],
                    effects: ["Whenever the warband's Subtlety would decrease, it decreases by 2 less (to a minimum reduction of 1)."],
                },
            },
            aptitude: 'Fieldcraft',
            wounds: '8+1d5',
            source: 'PG 30 EB',
        },
    ];
}

export function homeworldNames() {
    return homeworlds().map((h) => h.name);
}
