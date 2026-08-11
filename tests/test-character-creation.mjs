// Unit tests for the character-creation wizard's pure logic: merging grants from home world /
// background / role, resolving talent/trait specialities, and applying a divination's mechanical
// effect. The wizard itself (Foundry-dependent) is not exercised here -- see CLAUDE.md's
// verification-required section for what still needs a live test.
import {
    splitParenthetical,
    normaliseFixedGrant,
    collectFixedSkillGrants,
    collectSkillChoiceGroups,
    collectFixedTalentGrants,
    collectTalentChoiceGroups,
    collectFixedTraitGrants,
    collectTraitChoiceGroups,
    freeChoiceSkillName,
    mergeAptitudeNames,
    resolveGrantSpeciality,
    resolveDivinationEffect,
    applyHomeworldCharacteristicModifier,
    findDivinationForRoll,
} from '../src/module/rules/character-creation.mjs';
import { homeworlds } from '../src/module/rules/homeworlds.mjs';
import { backgrounds } from '../src/module/rules/backgrounds.mjs';
import { roles } from '../src/module/rules/roles.mjs';
import { divinations } from '../src/module/rules/divinations.mjs';
import { check, done } from './harness.mjs';


/* -------------------------------------------- */
/*  splitParenthetical / normaliseFixedGrant     */
/* -------------------------------------------- */

check('trailing parenthetical splits into name + speciality', splitParenthetical('Brutal Charge (2)'), { name: 'Brutal Charge', speciality: '2' });
check('no parenthetical leaves speciality null', splitParenthetical('Mechanicus Implants'), { name: 'Mechanicus Implants', speciality: null });
check('empty input is safe', splitParenthetical(''), { name: '', speciality: null });

check('a plain string fixed grant normalises via splitParenthetical',
    normaliseFixedGrant('Brutal Charge (2)', 'Home World'), { name: 'Brutal Charge', speciality: '2', source: 'Home World' });
check('a structured fixed grant object normalises directly',
    normaliseFixedGrant({ talent: 'Weapon Training', speciality: 'Las' }, 'Background'),
    { name: 'Weapon Training', speciality: 'Las', source: 'Background' });
check('a structured trait grant object uses the trait key',
    normaliseFixedGrant({ trait: 'Amphibious', speciality: null }, 'Background'), { name: 'Amphibious', speciality: null, source: 'Background' });

/* -------------------------------------------- */
/*  collecting grants: real data, spot checks     */
/* -------------------------------------------- */

const daemonWorld = homeworlds().find((h) => h.name === 'Daemon World');
const forgeWorld = homeworlds().find((h) => h.name === 'Forge World');
const penalColony = homeworlds().find((h) => h.name === 'Penal Colony');
const adminAdmin = backgrounds().find((b) => b.name === 'Adeptus Administratum');
const heretek = backgrounds().find((b) => b.name === 'Heretek');
const mutant = backgrounds().find((b) => b.name === 'Mutant');

check('Daemon World fixed skill + Adeptus Administratum fixed skills combine, tagged by source',
    collectFixedSkillGrants(daemonWorld, adminAdmin).map((g) => `${g.source}:${g.skill}${g.speciality ? `(${g.speciality})` : ''}`),
    ['Home World:Psyniscience', 'Background:Common Lore(Adeptus Administratum)', 'Background:Linguistics(High Gothic)', 'Background:Logic']);

check('Adeptus Administratum has two skill choice groups (Commerce/Medicae, and the free-choice Scholastic Lore)',
    collectSkillChoiceGroups(null, adminAdmin).length, 2);
check('the second Adeptus Administratum skill group is the free-choice one',
    freeChoiceSkillName(collectSkillChoiceGroups(null, adminAdmin)[1].group), 'Scholastic Lore');
check('an ordinary (non-free-choice) group has no free-choice skill name',
    freeChoiceSkillName(collectSkillChoiceGroups(null, adminAdmin)[0].group), null);
check('Heretek has two free-choice skill groups (Forbidden Lore, Trade)',
    collectSkillChoiceGroups(null, heretek).filter((g) => freeChoiceSkillName(g.group)).map((g) => freeChoiceSkillName(g.group)),
    ['Forbidden Lore', 'Trade']);

check('Forge World has one talent choice group (Technical Knock or Weapon-Tech)',
    collectTalentChoiceGroups(forgeWorld, null).length, 1);
check('Penal Colony fixed talent grant is Peer (Criminal Cartels)',
    collectFixedTalentGrants(penalColony, null), [{ name: 'Peer', speciality: 'Criminal Cartels', source: 'Home World' }]);

check('Agri-World fixed trait grant "Brutal Charge (2)" splits correctly',
    collectFixedTraitGrants(homeworlds().find((h) => h.name === 'Agri-World'), null),
    [{ name: 'Brutal Charge', speciality: '2', source: 'Home World' }]);
// The option count is content, not behaviour -- adding a mutation to the book data must not fail
// the suite. What matters is that a background's trait box produces a choice group at all; the
// 46-group sweep below covers their shape.
check('Mutant\'s trait box becomes a choice group with options',
    collectTraitChoiceGroups(null, mutant)[0].group.options.length > 0, true);
check('a background with no starting traits reports zero fixed/choice trait grants',
    [collectFixedTraitGrants(null, adminAdmin).length, collectTraitChoiceGroups(null, adminAdmin).length], [0, 0]);

/* -------------------------------------------- */
/*  aptitude merging                             */
/* -------------------------------------------- */

check('General is always included even with no other sources', mergeAptitudeNames([]), ['General']);
check('duplicates collapse case/whitespace-insensitively, keeping first-seen casing',
    mergeAptitudeNames(['Toughness', 'toughness', 'TOUGHNESS']), ['Toughness', 'General']);
check('a realistic merge: home world + background choice + role fixed + role choice',
    mergeAptitudeNames(['Toughness', 'Knowledge', 'Fieldcraft', 'Intelligence', 'Knowledge', 'Perception', 'Tech', 'Willpower', 'Ballistic Skill']),
    ['Toughness', 'Knowledge', 'Fieldcraft', 'Intelligence', 'Perception', 'Tech', 'Willpower', 'Ballistic Skill', 'General']);

/* -------------------------------------------- */
/*  resolveGrantSpeciality                        */
/* -------------------------------------------- */

check('a bare-number speciality against a level-only item (Toxic) sets level, no choice',
    resolveGrantSpeciality('1', { hasLevel: true }), { selected: null, level: 1, unresolved: null });
check('a compound "Name (N)" speciality against a characteristic-choice item (Unnatural Characteristic)',
    resolveGrantSpeciality('Agility (1)', { choiceList: 'characteristic', hasLevel: true }),
    { selected: 'agility', level: 1, unresolved: null });
check('a plain choice-list speciality (Weapon Training/weapon_group) resolves to the canonical value',
    resolveGrantSpeciality('Las', { choiceList: 'weapon_group' }), { selected: 'Las', level: null, unresolved: null });
check('a faction speciality (Peer/Hatred) resolves case-insensitively',
    resolveGrantSpeciality('criminal cartels', { choiceList: 'faction' }), { selected: 'Criminal Cartels', level: null, unresolved: null });
check('no speciality at all is trivially resolved (nothing to set)',
    resolveGrantSpeciality(null, { choiceList: 'weapon_group' }), { selected: null, level: null, unresolved: null });
check('an invented choice-list value is refused, not guessed',
    resolveGrantSpeciality('Nonsense', { choiceList: 'faction' }).unresolved, '"Nonsense" is not a valid faction option.');
check('"player\'s choice" with no choice list on the item is refused (caller must substitute first)',
    resolveGrantSpeciality("player's choice", {}).unresolved, '"player\'s choice" needs a player choice this system cannot infer automatically.');
check('a speciality on an item with neither a choice list nor a level is refused rather than dropped',
    resolveGrantSpeciality('Something', {}).unresolved, 'Don\'t know how to apply speciality "Something" to this item.');

/* -------------------------------------------- */
/*  resolveDivinationEffect                       */
/* -------------------------------------------- */

const violence = divinations().find((d) => d.roll === '55-59'); // WS/BS +3, Ag/Int -3, both 2-candidate choices
check('a two-candidate characteristic change with no choice yet is reported as needing one',
    resolveDivinationEffect(violence).needsChoice,
    [{ kind: 'characteristic', index: 0, candidates: ['Weapon Skill', 'Ballistic Skill'] },
     { kind: 'characteristic', index: 1, candidates: ['Agility', 'Intelligence'] }]);
check('supplying both choices resolves both deltas and leaves nothing outstanding',
    (() => {
        const r = resolveDivinationEffect(violence, { characteristicChoices: { 0: 'Weapon Skill', 1: 'Intelligence' } });
        return [r.characteristicDeltas, r.needsChoice];
    })(),
    [[{ characteristic: 'Weapon Skill', amount: 3 }, { characteristic: 'Intelligence', amount: -3 }], []]);

const perceptionOnly = divinations().find((d) => d.roll === '02-05'); // single-candidate Perception +5
check('a single-candidate characteristic change needs no player choice',
    resolveDivinationEffect(perceptionOnly).characteristicDeltas, [{ characteristic: 'Perception', amount: 5 }]);
check('a single-candidate change also grants its mental disorder',
    resolveDivinationEffect(perceptionOnly).mentalDisorders, [{ name: 'Phobia', page: 288 }]);

const jadedRoll = divinations().find((d) => d.roll === '06-09'); // Jaded, or +2 WP if already had
check('a talent grant applies normally when the character does not already have it',
    resolveDivinationEffect(jadedRoll, { hasTalent: () => false }).talentGrant, { talent: 'Jaded', subchoice: null, fixedSubchoice: null });
check('the already-has fallback fires as a characteristic delta instead, when the character already has the talent',
    (() => {
        const r = resolveDivinationEffect(jadedRoll, { hasTalent: (name) => name === 'Jaded' });
        return [r.talentGrant, r.characteristicDeltas];
    })(),
    [null, [{ characteristic: 'Willpower', amount: 2 }]]);

const dodgeRoll = divinations().find((d) => d.roll === '88-91'); // Dodge skill rank 1, or +2 Agility if already known
check('a skill grant applies normally when the character does not already have that rank',
    resolveDivinationEffect(dodgeRoll, { hasSkill: () => false }).skillGrant, { skill: 'Dodge', rank: 1 });
check('the already-has fallback fires for a skill grant the same way it does for a talent grant',
    (() => {
        const r = resolveDivinationEffect(dodgeRoll, { hasSkill: () => true });
        return [r.skillGrant, r.characteristicDeltas];
    })(),
    [null, [{ characteristic: 'Agility', amount: 2 }]]);

const malignancyRoll = divinations().find((d) => d.roll === '01');
check('a table-roll divination (Malignancies) is surfaced for manual handling, not silently skipped',
    resolveDivinationEffect(malignancyRoll).manualTableRolls.length, 1);

const fateRoll = divinations().find((d) => d.roll === '100');
check('the fate-threshold-only divination passes its delta through untouched',
    resolveDivinationEffect(fateRoll).fateThresholdDelta, 1);

/* -------------------------------------------- */
/*  findDivinationForRoll                         */
/* -------------------------------------------- */

const allDivinations = divinations();
check('a bare-number roll ("01") matches exactly', findDivinationForRoll(1, allDivinations)?.roll, '01');
check('the top of a range matches', findDivinationForRoll(54, allDivinations)?.roll, '50-54');
check('the bottom of a range matches', findDivinationForRoll(50, allDivinations)?.roll, '50-54');
check('a value just outside a range does not match it', findDivinationForRoll(49, allDivinations)?.roll, '44-49');
check('the final bare-number roll ("100") matches', findDivinationForRoll(100, allDivinations)?.roll, '100');
check('every roll 1-100 resolves to exactly one divination',
    Array.from({ length: 100 }, (_, i) => i + 1).every((n) => findDivinationForRoll(n, allDivinations) !== null), true);

/* -------------------------------------------- */
/*  characteristic home world modifier            */
/* -------------------------------------------- */

const hiveWorld = homeworlds().find((h) => h.name === 'Hive World'); // bonus Agility/Perception, negative Willpower
check('a bonus characteristic gets +5', applyHomeworldCharacteristicModifier(50, 'Agility', hiveWorld), 55);
check('the negative characteristic gets -5', applyHomeworldCharacteristicModifier(50, 'Willpower', hiveWorld), 45);
check('an unrelated characteristic is untouched', applyHomeworldCharacteristicModifier(50, 'Strength', hiveWorld), 50);
check('no home world selected yet leaves the value untouched', applyHomeworldCharacteristicModifier(50, 'Agility', null), 50);

/* -------------------------------------------- */
/*  sweep: every choice group across all data has at least one option */
/* -------------------------------------------- */

const groups = [];
for (const hw of homeworlds()) {
    groups.push(...collectSkillChoiceGroups(hw, null), ...collectTalentChoiceGroups(hw, null), ...collectTraitChoiceGroups(hw, null));
}
for (const bg of backgrounds()) {
    groups.push(...collectSkillChoiceGroups(null, bg), ...collectTalentChoiceGroups(null, bg), ...collectTraitChoiceGroups(null, bg));
}
for (const role of roles()) {
    groups.push(...(role.role_aptitudes_structured?.choice_groups ?? []).map((group, i) => ({ id: `role-apt-${i}`, source: role.name, group: { options: group.options } })));
    if (role.role_talent_choice) groups.push({ id: 'role-talent', source: role.name, group: role.role_talent_choice });
}

const emptyGroups = groups.filter((g) => !(g.group.options?.length > 0));
console.log(`\n  (swept ${groups.length} choice groups across every home world, background and role)`);
for (const g of emptyGroups) console.log(`        ${g.source} (${g.id}): no options`);
check('every choice group across the real data has at least one option', emptyGroups.length, 0);

done();
