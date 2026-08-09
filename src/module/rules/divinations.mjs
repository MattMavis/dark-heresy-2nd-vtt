export function divinations() {
    return [
        {
            name: 'Mutation without, corruption within.',
            effect: 'Roll once on the Malignancies table and apply the result.',
            effect_full_book_text: 'Roll once on Table 8-15: Malignancies (see page 290) and apply the result.',
            roll: '01',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [
                    {
                        table_name: 'Malignancies',
                        table_number: '8-15',
                        page: 290,
                        mode: 'must_roll_and_apply',
                        when: 'at_chargen_immediately',
                    },
                ],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Dark dreams lie upon the heart.',
            effect: 'Whenever this character would roll on the Malignancies table, he may instead select any one result and gain that Malignancy.',
            effect_full_book_text:
                'Whenever this character would roll on the Malignancies table (see page 290), he may instead select any one result and gain that Malignancy.',
            roll: '50-54',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [
                    {
                        table_name: 'Malignancies',
                        table_number: '8-15',
                        page: 290,
                        mode: 'may_choose_result_instead_of_rolling',
                        when: 'ongoing_whenever_would_roll_malignancies',
                    },
                ],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Trust in your fear.',
            effect: "Increase this character's Perception by 5. He also gains the Phobia Mental Disorder.",
            effect_full_book_text: "Increase this character's Perception by 5. He also gains the Phobia Mental Disorder (see page 288).",
            roll: '02-05',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Perception'],
                        choose: 1,
                        amount: 5,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [
                    {
                        name: 'Phobia',
                        page: 288,
                    },
                ],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Violence solves everything.',
            effect: "Increase this character's Weapon Skill or Ballistic Skill characteristic by 3. Reduce his Agility or Intelligence characteristic by 3.",
            effect_full_book_text:
                "Increase this character's Weapon Skill or Ballistic Skill characteristic by 3. Reduce his Agility or Intelligence characteristic by 3.",
            roll: '55-59',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Weapon Skill', 'Ballistic Skill'],
                        choose: 1,
                        amount: 3,
                    },
                    {
                        characteristics: ['Agility', 'Intelligence'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Humans must die so that humanity can endure.',
            effect: 'This character gains the Jaded talent. If he already possesses this talent, increase his Willpower characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Jaded talent. If he already possesses this talent, increase his Willpower characteristic by 2 instead.',
            roll: '06-09',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Jaded',
                        subchoice: null,
                        already_has_fallback: {
                            characteristic: 'Willpower',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Ignorance is a wisdom of its own.',
            effect: "Reduce this character's Perception characteristic by 3. The first time he would gain 1 or more Insanity points each session, he reduces that amount by 1 (to a minimum of 0) instead.",
            effect_full_book_text:
                "Reduce this character's Perception characteristic by 3. The first time he would gain 1 or more Insanity points each session, he reduces that amount by 1 (to a minimum of 0) instead.",
            roll: '60-63',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Perception'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character would gain 1 or more Insanity points each session',
                        effect_text: 'he reduces that amount by 1 (to a minimum of 0) instead',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'The pain of the bullet is ecstasy compared to damnation.',
            effect: "Reduce this character's Agility characteristic by 3. The first time this character suffers Critical damage each session, roll a 1d10. On a result of 10, he does not suffer any Critical Effects, though the damage still counts as Critical Damage.",
            effect_full_book_text:
                "Reduce this character's Agility characteristic by 3. The first time this character suffers Critical damage each session, roll a 1d10. On a result of 10, he does not suffer any Critical Effects, though the damage still counts as Critical Damage.",
            roll: '10-13',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Agility'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character suffers Critical damage each session',
                        effect_text: 'he does not suffer any Critical Effects, though the damage still counts as Critical Damage',
                        frequency: 'once_per_session',
                        involves_roll: true,
                        roll_die: '1d10',
                        success_value: 10,
                    },
                ],
            },
        },
        {
            name: 'Only the insane have the strength to prosper.',
            effect: "Increase this character's Willpower characteristic by 3. The first time he would gain 1 or more Insanity points each session, he gains that amount plus 1 instead.",
            effect_full_book_text:
                "Increase this character's Willpower characteristic by 3. The first time he would gain 1 or more Insanity points each session, he gains that amount plus 1 instead.",
            roll: '64-67',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Willpower'],
                        choose: 1,
                        amount: 3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character would gain 1 or more Insanity points each session',
                        effect_text: 'he gains that amount plus 1 instead',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'Be a boon to your allies and the bane of your enemies.',
            effect: 'The character gains the Hatred (choose any one) talent. If he already possessed this talent, increase his Strength characteristic by 2 instead.',
            effect_full_book_text:
                'The character gains the Hatred (choose any one) talent. If he already possessed this talent, increase his Strength characteristic by 2 instead.',
            roll: '14-17',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Hatred',
                        subchoice: {
                            ref: 'config.mjs:faction',
                            note: "'choose any one' - unrestricted, all 24 options in the existing faction choice list.",
                        },
                        already_has_fallback: {
                            characteristic: 'Strength',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'A suspicious mind is a healthy mind.',
            effect: "Increase this character's Perception characteristic by 2. Additionally, he may re-roll Awareness tests to avoid being Surprised.",
            effect_full_book_text:
                "Increase this character's Perception characteristic by 2. Additionally, he may re-roll Awareness tests to avoid being Surprised.",
            roll: '68-71',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Perception'],
                        choose: 1,
                        amount: 2,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: ['May re-roll Awareness tests made to avoid being Surprised.'],
                triggered_effects: [],
            },
        },
        {
            name: 'The wise learn from the deaths of others.',
            effect: "Increase this character's Agility or Intelligence Characteristic by 3. Reduce his Weapon Skill or Ballistic skill characteristic by 3.",
            effect_full_book_text:
                "Increase this character's Agility or Intelligence Characteristic by 3. Reduce his Weapon Skill or Ballistic skill characteristic by 3.",
            roll: '18-21',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Agility', 'Intelligence'],
                        choose: 1,
                        amount: 3,
                    },
                    {
                        characteristics: ['Weapon Skill', 'Ballistic Skill'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Suffering is an unrelenting instructor.',
            effect: "Reduce this character's Toughness characteristic by 3. The first time that this character suffers any damage each session, he gains a +20 bonus to the next test he makes before the end of his next turn.",
            effect_full_book_text:
                "Reduce this character's Toughness characteristic by 3. The first time that this character suffers any damage each session, he gains a +20 bonus to the next test he makes before the end of his next turn.",
            roll: '72-75',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Toughness'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character suffers any damage each session',
                        effect_text: 'he gains a +20 bonus to the next test he makes before the end of his next turn',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'Kill the alien before it can speak its lies.',
            effect: 'This character gains the Quick Draw talent. If he already possesses this talent, increase his Agility characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Quick Draw talent. If he already possesses this talent, increase his Agility characteristic by 2 instead.',
            roll: '22-25',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Quick Draw',
                        subchoice: null,
                        already_has_fallback: {
                            characteristic: 'Agility',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'The only true fear is dying without your duty done.',
            effect: 'This character gains the Resistance (Cold, Heat, or Fear) talent. If he already possesses this Talent, increase his Toughness characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Resistance (Cold, Heat, or Fear) talent. If he already possesses this Talent, increase his Toughness characteristic by 2 instead.',
            roll: '76-79',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Resistance',
                        subchoice: {
                            ref: 'config.mjs:resistance',
                            note: "RESTRICTED subset: the book explicitly limits this grant to Cold, Heat, or Fear only - not the full 8-option Resistance list used elsewhere (e.g. the Chirurgeon role's unrestricted 'Resistance (Pick One)').",
                        },
                        already_has_fallback: {
                            characteristic: 'Toughness',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Truth is subjective.',
            effect: "Increase this character's Perception by 3. The first time he would gain 1 or more Corruption points each session, he gains that amount plus 1 instead.",
            effect_full_book_text:
                "Increase this character's Perception by 3. The first time he would gain 1 or more Corruption points each session, he gains that amount plus 1 instead.",
            roll: '26-29',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Perception'],
                        choose: 1,
                        amount: 3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character would gain 1 or more Corruption points each session',
                        effect_text: 'he gains that amount plus 1 instead',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'Only in death does duty end.',
            effect: 'The first time this character would suffer Fatigue each session, he suffers that amount of Fatigue minus 1 (to a minimum of 0) instead.',
            effect_full_book_text:
                'The first time this character would suffer Fatigue each session, he suffers that amount of Fatigue minus 1 (to a minimum of 0) instead.',
            roll: '80-83',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character would suffer Fatigue each session',
                        effect_text: 'he suffers that amount of Fatigue minus 1 (to a minimum of 0) instead',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'Thought begets Heresy.',
            effect: "Reduce this character's Intelligence by 3. The first time he would gain 1 or more Corruption points each session, he reduces that amount by 1 (to a minimum of 0) instead.",
            effect_full_book_text:
                "Reduce this character's Intelligence by 3. The first time he would gain 1 or more Corruption points each session, he reduces that amount by 1 (to a minimum of 0) instead.",
            roll: '30-33',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Intelligence'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'the first time this character would gain 1 or more Corruption points each session',
                        effect_text: 'he reduces that amount by 1 (to a minimum of 0) instead',
                        frequency: 'once_per_session',
                        involves_roll: false,
                        roll_die: null,
                        success_value: null,
                    },
                ],
            },
        },
        {
            name: 'Innocence is an illusion.',
            effect: 'This character gains the Keen Intuition talent. If he already possesses this talent, increase his Intelligence characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Keen Intuition talent. If he already possesses this talent, increase his Intelligence characteristic by 2 instead.',
            roll: '84-87',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Keen Intuition',
                        subchoice: null,
                        already_has_fallback: {
                            characteristic: 'Intelligence',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Heresy begets Retribution.',
            effect: "Increase this character's Fellowship or Strength characteristic by 3. Reduce his Toughness or Willpower characteristic by 3.",
            effect_full_book_text:
                "Increase this character's Fellowship or Strength characteristic by 3. Reduce his Toughness or Willpower characteristic by 3.",
            roll: '34-38',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Fellowship', 'Strength'],
                        choose: 1,
                        amount: 3,
                    },
                    {
                        characteristics: ['Toughness', 'Willpower'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'To war is human.',
            effect: 'This character gains the Dodge skill as a Known skill (rank 1). If he already possesses this skill, increase his Agility characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Dodge skill as a Known skill (rank 1). If he already possesses this skill, increase his Agility characteristic by 2 instead.',
            roll: '88-91',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [
                    {
                        skill: 'Dodge',
                        rank: 1,
                        already_has_fallback: {
                            characteristic: 'Agility',
                            amount: 2,
                        },
                    },
                ],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'A mind without purpose wanders in dark places.',
            effect: 'When gaining Mental Disorders, the character may choose to gain a new Disorder instead of increasing the severity of an existing Disorder.',
            effect_full_book_text:
                'When gaining Mental Disorders (see page 287), the character may choose to gain a new Disorder instead of increasing the severity of an existing Disorder.',
            roll: '39-43',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [
                    'When this character would gain a Mental Disorder, he may choose to gain a new Disorder instead of increasing the severity of an existing Disorder (see page 287).',
                ],
                triggered_effects: [],
            },
        },
        {
            name: 'There is no substitute for zeal.',
            effect: 'This character gains the Clues from the Crowds talent. If he already possesses this talent, increase his Fellowship characteristic by 2 instead.',
            effect_full_book_text:
                'This character gains the Clues from the Crowds talent. If he already possesses this talent, increase his Fellowship characteristic by 2 instead.',
            roll: '92-95',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [
                    {
                        talent: 'Clues from the Crowds',
                        subchoice: null,
                        already_has_fallback: {
                            characteristic: 'Fellowship',
                            amount: 2,
                        },
                    },
                ],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'If a job is worth doing, it is worth dying for.',
            effect: "Increase this character's Toughness or Willpower characteristic by 3. Reduce his Fellowship or Strength characteristic by 3.",
            effect_full_book_text:
                "Increase this character's Toughness or Willpower characteristic by 3. Reduce his Fellowship or Strength characteristic by 3.",
            roll: '44-49',
            source_detail: {
                book: 'CB',
                page: 84,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [
                    {
                        characteristics: ['Toughness', 'Willpower'],
                        choose: 1,
                        amount: 3,
                    },
                    {
                        characteristics: ['Fellowship', 'Strength'],
                        choose: 1,
                        amount: -3,
                    },
                ],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [],
            },
        },
        {
            name: 'Even one who has nothing can still offer his life.',
            effect: 'When this character burns Fate threshold to survive a lethal injury, roll 1d10. On a result of 10, he survives whatever grievous wound would have killed him but does not reduce his Fate threshold.',
            effect_full_book_text:
                'When this character burns Fate threshold to survive a lethal injury, roll 1d10. On a result of 10, he survives whatever grievous wound would have killed him but does not reduce his Fate threshold.',
            roll: '96-99',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: null,
                passive_rules: [],
                triggered_effects: [
                    {
                        trigger: 'when this character burns Fate threshold to survive a lethal injury',
                        effect_text: 'he survives whatever grievous wound would have killed him but does not reduce his Fate threshold',
                        frequency: 'every_occurrence',
                        involves_roll: true,
                        roll_die: '1d10',
                        success_value: 10,
                    },
                ],
            },
        },
        {
            name: 'Do not ask why you serve. Only ask how.',
            effect: "Increase this character's Fate threshold by 1.",
            effect_full_book_text: "Increase this character's Fate threshold by 1.",
            roll: '100',
            source_detail: {
                book: 'CB',
                page: 85,
            },
            mechanical_effect: {
                automatable: true,
                characteristic_changes: [],
                talent_grants: [],
                skill_grants: [],
                mental_disorder_grants: [],
                table_rolls: [],
                fate_threshold_change: 1,
                passive_rules: [],
                triggered_effects: [],
            },
        },
    ];
}

export function divinationNames() {
    return divinations().map((d) => d.name);
}
