// Every structured character-creation grant must name something this system actually has.
//
// The value here is less in the unit cases below than in the sweep at the bottom: it walks every
// grant in all four rule modules against the real template.json and fails if any one of them
// cannot be resolved. A grant naming a skill that does not exist is worthless -- it would
// silently drop a starting skill during character creation -- and that is exactly the class of
// error a content extraction introduces, so this guards every future batch too.
import { readFileSync } from 'node:fs';
import { normaliseName, resolveSkillGrant, resolveSkillGrants } from '../src/module/rules/grant-resolution.mjs';
import { homeworlds } from '../src/module/rules/homeworlds.mjs';
import { backgrounds } from '../src/module/rules/backgrounds.mjs';
import { roles } from '../src/module/rules/roles.mjs';
import { check, done } from './harness.mjs';


const template = JSON.parse(readFileSync(new URL('../src/template.json', import.meta.url), 'utf8'));
const SKILLS = template.Actor.templates.creature.skills;

/* -------------------------------------------- */
/*  normalisation                               */
/* -------------------------------------------- */

check('punctuation folded', normaliseName('Tech-Use'), normaliseName('Tech Use'));
check('case folded', normaliseName('SLEIGHT of hand'), 'sleightofhand');
check('empty is safe', normaliseName(undefined), '');

/* -------------------------------------------- */
/*  the three real mismatches the audit found    */
/* -------------------------------------------- */

check('the book\'s hyphenated Tech-Use resolves to techUse',
    resolveSkillGrant({ skill: 'Tech-Use' }, SKILLS).skillKey, 'techUse');

const admin = resolveSkillGrant({ skill: 'Common Lore', speciality: 'Adeptus Administratum' }, SKILLS);
check('Common Lore (Adeptus Administratum) resolves via alias', [admin.status, admin.specialityKey, admin.alias],
    ['ok', 'administratum', true]);

const minist = resolveSkillGrant({ skill: 'Common Lore', speciality: 'Adeptus Ministorum' }, SKILLS);
check('Common Lore (Adeptus Ministorum) resolves to Ecclesiarchy, the same institution',
    [minist.status, minist.specialityKey, minist.alias], ['ok', 'ecclesiarchy', true]);

/* -------------------------------------------- */
/*  ordinary behaviour                          */
/* -------------------------------------------- */

check('a plain skill resolves with no speciality',
    resolveSkillGrant({ skill: 'Awareness' }, SKILLS).skillKey, 'awareness');
check('an exact speciality needs no alias',
    resolveSkillGrant({ skill: 'Common Lore', speciality: 'Imperial Guard' }, SKILLS).specialityKey, 'imperialGuard');
check('a player-choice speciality is reported as such, not as a failure',
    resolveSkillGrant({ skill: 'Scholastic Lore', speciality: "player's choice" }, SKILLS).status, 'player-choice');
check('an invented skill is refused',
    resolveSkillGrant({ skill: 'Basket Weaving' }, SKILLS).status, 'unresolved');
check('an invented speciality is refused',
    resolveSkillGrant({ skill: 'Common Lore', speciality: 'Tyranid Cuisine' }, SKILLS).status, 'unresolved');
check('a speciality on a skill that has none is refused',
    resolveSkillGrant({ skill: 'Dodge', speciality: 'Sideways' }, SKILLS).status, 'unresolved');
check('grants are resolved in bulk and failures kept separate',
    resolveSkillGrants([{ skill: 'Awareness' }, { skill: 'Nonsense' }], SKILLS).unresolved.length, 1);

/* -------------------------------------------- */
/*  the sweep: every grant in the real data      */
/* -------------------------------------------- */

// Talents and traits are validated by name against the compendium sources. Their specialities
// (a weapon group, a faction) come from separate `config.mjs` lists whose applicable list varies
// per talent, so only the name is checked here -- a wrong name is the failure that silently
// drops a grant, and it is the one this catches.
const packNames = (file) =>
    new Set([...readFileSync(new URL(file, import.meta.url), 'utf8').matchAll(/^\s*name:\s*(.+)$/gm)]
        .map((m) => normaliseName(m[1].trim().replace(/^['"]|['"]$/g, ''))));
const TALENTS = packNames('../src/packs/talents/talents.yml');
const TRAITS = packNames('../src/packs/traits/traits.yml');

const found = [];
const namedGrants = [];
const walk = (where, node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((n) => walk(where, n));
    if (node.skill) found.push({ where, grant: node });
    if (node.talent) namedGrants.push({ where, kind: 'talent', name: node.talent });
    if (node.trait) namedGrants.push({ where, kind: 'trait', name: node.trait });
    for (const [key, v] of Object.entries(node)) {
        // `effect_details` describes the parameters of an effect, not something the character
        // receives -- Crusader's bonus references the *target's* "Fear (X)" trait during damage
        // calculation, which is a lookup, not a grant.
        if (key === 'effect_details') continue;
        walk(where, v);
    }
};

for (const e of homeworlds()) walk(`home world "${e.name}"`, e.home_world_bonus?.structured);
for (const e of backgrounds()) {
    walk(`background "${e.name}"`, e.starting_skills_structured);
    walk(`background "${e.name}"`, e.starting_talents_structured);
    walk(`background "${e.name}"`, e.starting_traits);
    walk(`background "${e.name}"`, e.background_bonus?.entries);
}
for (const e of roles()) {
    walk(`role "${e.name}"`, e.role_talent_choice);
    walk(`role "${e.name}"`, e.role_bonus?.clauses);
}

const broken = found
    .map((f) => ({ ...f, result: resolveSkillGrant(f.grant, SKILLS) }))
    .filter((f) => f.result.status === 'unresolved');

console.log(`\n  (swept ${found.length} skill grants across the rule modules)`);
for (const b of broken) {
    console.log(`        ${b.where}: ${b.grant.skill}${b.grant.speciality ? ` (${b.grant.speciality})` : ''} -- ${b.result.reason}`);
}
check('every structured skill grant in the rule data resolves', broken.length, 0);

const unknownNamed = namedGrants.filter(
    (g) => !(g.kind === 'talent' ? TALENTS : TRAITS).has(normaliseName(g.name)),
);
console.log(`\n  (swept ${namedGrants.length} talent and trait grants against the compendium sources)`);
for (const g of unknownNamed) console.log(`        ${g.where}: ${g.kind} "${g.name}" is not in the pack`);
check('every talent and trait grant names something in the packs', unknownNamed.length, 0);

done();
