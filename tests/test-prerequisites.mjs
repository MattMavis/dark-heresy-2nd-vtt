// Unit tests for talent prerequisite parsing/evaluation, plus the sweep that matters most: every
// non-empty `prerequisites` string in the real talents.yml pack must parse into clauses this
// module actually recognises (status 'met' or 'unmet'), except the small explicit allowlist of
// genuinely-indeterminate ones below. A new unparseable pattern in future content fails this test,
// rather than silently degrading into an "advisory" nobody notices.
import { readFileSync } from 'node:fs';
import { check, done } from './harness.mjs';
import {
    CHARACTERISTIC_CODE_TO_KEY,
    evaluatePrerequisiteClause,
    evaluatePrerequisites,
    splitTopLevel,
} from '../src/module/rules/talent-prerequisites.mjs';


/* -------------------------------------------- */
/*  Snapshot builder                             */
/* -------------------------------------------- */

const template = JSON.parse(readFileSync(new URL('../src/template.json', import.meta.url), 'utf8'));
const REAL_SKILLS = template.Actor.templates.creature.skills;

/** A structurally-real (deep-cloned) skills object with every advance zeroed, so tests can bump
 * just the fields they care about without mutating shared state between checks. */
function freshSkills() {
    return JSON.parse(JSON.stringify(REAL_SKILLS));
}

function setSkillRank(skills, key, rank) {
    skills[key].advance = rank;
}

function setSpecialityRank(skills, key, spKey, rank) {
    skills[key].specialities[spKey].advance = rank;
}

/** Everything defaults to "has nothing" -- callers override only what a given test needs. */
function snapshot(overrides = {}) {
    return {
        characteristics: {
            weaponSkill: 0, ballisticSkill: 0, strength: 0, toughness: 0, agility: 0,
            intelligence: 0, perception: 0, willpower: 0, fellowship: 0,
        },
        skills: freshSkills(),
        talents: [],
        psyRating: 0,
        corruption: 0,
        insanity: 0,
        eliteAdvance: null,
        ...overrides,
    };
}

const evalClause = (text, snap) => evaluatePrerequisiteClause(text, snap).status;

/* -------------------------------------------- */
/*  splitTopLevel -- comma is AND, but not inside parentheses                                     */
/* -------------------------------------------- */

check('plain comma list splits', splitTopLevel('Ag 45, Ambidextrous, WS 35'), ['Ag 45', 'Ambidextrous', 'WS 35']);
check('a comma inside parens stays with its clause',
    splitTopLevel('Ag 45, Two-Weapon Wielder (Melee, Ranged)'),
    ['Ag 45', 'Two-Weapon Wielder (Melee, Ranged)']);
check('empty string splits to nothing', splitTopLevel(''), []);

/* -------------------------------------------- */
/*  Characteristic thresholds                    */
/* -------------------------------------------- */

check('characteristic threshold met', evalClause('WP 40', snapshot({ characteristics: { willpower: 40 } })), 'met');
check('characteristic threshold unmet (one short)', evalClause('WP 40', snapshot({ characteristics: { willpower: 39 } })), 'unmet');

// Every code, both ways round. Testing one code proves almost nothing: the 131-string sweep runs
// against an all-zero character, so a code wired to the wrong characteristic still answers
// "unmet" and passes it. Each code has to be shown reading the characteristic it names and no
// other -- a WS/BS or Int/Per transposition is otherwise invisible.
for (const [code, key] of Object.entries(CHARACTERISTIC_CODE_TO_KEY)) {
    check(`"${code} 40" reads ${key}`, evalClause(`${code} 40`, snapshot({ characteristics: { [key]: 40 } })), 'met');
    const others = Object.fromEntries(
        Object.values(CHARACTERISTIC_CODE_TO_KEY).filter((k) => k !== key).map((k) => [k, 99]),
    );
    check(`"${code} 40" reads nothing but ${key}`, evalClause(`${code} 40`, snapshot({ characteristics: others })), 'unmet');
}
check('every documented code maps', evalClause('S 50', snapshot({ characteristics: { strength: 50 } })), 'met');

/* -------------------------------------------- */
/*  "or" alternatives                            */
/* -------------------------------------------- */

check('explicit-both-sides characteristic or, first side met',
    evalClause('S 40 or WP 40', snapshot({ characteristics: { strength: 40, willpower: 0 } })), 'met');
check('explicit-both-sides characteristic or, neither met',
    evalClause('S 40 or WP 40', snapshot({ characteristics: { strength: 10, willpower: 10 } })), 'unmet');
check('shared-threshold form "BS or WS 40" applies 40 to both sides',
    evalClause('BS or WS 40', snapshot({ characteristics: { ballisticSkill: 0, weaponSkill: 40 } })), 'met');
check('shared-threshold form, neither side reaches it',
    evalClause('BS or WS 40', snapshot({ characteristics: { ballisticSkill: 39, weaponSkill: 39 } })), 'unmet');

{
    const skills = freshSkills();
    setSkillRank(skills, 'dodge', 1);
    check('bare-skill "or" (Dodge or Parry), owning one side is enough',
        evalClause('Dodge or Parry', snapshot({ skills })), 'met');
}
check('bare-skill "or", owning neither side', evalClause('Dodge or Parry', snapshot()), 'unmet');

{
    const skills = freshSkills();
    setSkillRank(skills, 'survival', 2);
    check('"Rank N in A or any B skill", A alone satisfies it',
        evalClause('Rank 2 in Survival or any Operate skill', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSpecialityRank(skills, 'operate', 'voidship', 2);
    check('"Rank N in A or any B skill", any speciality of B satisfies it',
        evalClause('Rank 2 in Survival or any Operate skill', snapshot({ skills })), 'met');
}
check('"Rank N in A or any B skill", neither present is unmet',
    evalClause('Rank 2 in Survival or any Operate skill', snapshot()), 'unmet');

{
    const skills = freshSkills();
    setSpecialityRank(skills, 'commonLore', 'imperialCreed', 2);
    check('skill-bonus "or" a bare skill name, first side (the bonus) satisfies it',
        evalClause('Common Lore (Imperial Creed) +10 or Forbidden Lore (Daemonology)', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSpecialityRank(skills, 'forbiddenLore', 'daemonology', 1);
    check('skill-bonus "or" a bare skill name, second side (bare mention) satisfies it',
        evalClause('Common Lore (Imperial Creed) +10 or Forbidden Lore (Daemonology)', snapshot({ skills })), 'met');
}

/* -------------------------------------------- */
/*  Skill rank ("Rank N in X skill")             */
/* -------------------------------------------- */

{
    const skills = freshSkills();
    setSkillRank(skills, 'medicae', 2);
    check('Rank 2 in Medicae skill, met', evalClause('Rank 2 in Medicae skill', snapshot({ skills })), 'met');
}
check('Rank 2 in Medicae skill, unmet at rank 0', evalClause('Rank 2 in Medicae skill', snapshot()), 'unmet');

{
    const skills = freshSkills();
    setSpecialityRank(skills, 'linguistics', 'eldar', 3);
    check('Rank 3 in Linguistics (Any), any speciality counts',
        evalClause('Rank 3 in Linguistics (Any)', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSpecialityRank(skills, 'operate', 'surface', 2);
    check('Rank 2 in any Operate skill, any speciality counts',
        evalClause('Rank 2 in any Operate skill', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSpecialityRank(skills, 'forbiddenLore', 'xenos', 3);
    check('Rank 3 in Forbidden Lore (Xenos - Any) resolves to the specific Xenos speciality',
        evalClause('Rank 3 in Forbidden Lore (Xenos - Any)', snapshot({ skills })), 'met');
}
{
    // A non-Xenos Forbidden Lore speciality must NOT satisfy the Xenos-specific clause -- the
    // "- Any" qualifier names which speciality, it is not a full wildcard.
    const skills = freshSkills();
    setSpecialityRank(skills, 'forbiddenLore', 'heresy', 4);
    check('Rank 3 in Forbidden Lore (Xenos - Any) is not satisfied by an unrelated speciality',
        evalClause('Rank 3 in Forbidden Lore (Xenos - Any)', snapshot({ skills })), 'unmet');
}

/* -------------------------------------------- */
/*  Skill + bonus ("+10" advance-ladder shorthand)                                                */
/* -------------------------------------------- */

{
    const skills = freshSkills();
    setSkillRank(skills, 'techUse', 2);
    check('Tech Use +10 == Trained (rank 2), met', evalClause('Tech Use +10', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSkillRank(skills, 'techUse', 1);
    check('Tech Use +10, Known (rank 1) is not enough', evalClause('Tech Use +10', snapshot({ skills })), 'unmet');
}
{
    const skills = freshSkills();
    setSkillRank(skills, 'awareness', 2);
    check('Awareness +10, met', evalClause('Awareness +10', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSpecialityRank(skills, 'commonLore', 'imperialCreed', 2);
    check('Common Lore (Imperial Creed) +10, met', evalClause('Common Lore (Imperial Creed) +10', snapshot({ skills })), 'met');
}

/* -------------------------------------------- */
/*  Bare names -- skill first, then talent       */
/* -------------------------------------------- */

{
    const skills = freshSkills();
    setSkillRank(skills, 'techUse', 1);
    check('bare "Tech-Use" resolves as the skill (hyphen folded)', evalClause('Tech-Use', snapshot({ skills })), 'met');
}
{
    const skills = freshSkills();
    setSkillRank(skills, 'psyniscience', 1);
    check('bare "Psyniscience" resolves as the skill', evalClause('Psyniscience', snapshot({ skills })), 'met');
}
check('bare talent name, owned', evalClause('Jaded', snapshot({ talents: ['Jaded'] })), 'met');
check('bare talent name, not owned', evalClause('Jaded', snapshot()), 'unmet');

/* -------------------------------------------- */
/*  Talent / skill with a specialisation         */
/* -------------------------------------------- */

check('Resistance (Fear), owned with matching speciality',
    evalClause('Resistance (Fear)', snapshot({ talents: ['Resistance (Fear)'] })), 'met');
check('Resistance (Fear), owned but wrong speciality does not count',
    evalClause('Resistance (Fear)', snapshot({ talents: ['Resistance (Psychic Powers)'] })), 'unmet');

{
    const skills = freshSkills();
    setSkillRank(skills, 'trade', 1);
    skills.trade.specialities.armourer.advance = 1;
    check('Trade (Armourer) resolves as the skill speciality, not a talent',
        evalClause('Trade (Armourer)', snapshot({ skills })), 'met');
}

check('Two-Weapon Wielder (Melee, Ranged) needs BOTH copies (AND of specialisations)',
    evalClause('Two-Weapon Wielder (Melee, Ranged)', snapshot({ talents: ['Two-Weapon Wielder (Melee)'] })), 'unmet');
check('Two-Weapon Wielder (Melee, Ranged), both copies owned',
    evalClause('Two-Weapon Wielder (Melee, Ranged)', snapshot({ talents: ['Two-Weapon Wielder (Melee)', 'Two-Weapon Wielder (Ranged)'] })), 'met');
check('bare "Two-Weapon Wielder" (no spec) is satisfied by any one copy',
    evalClause('Two-Weapon Wielder', snapshot({ talents: ['Two-Weapon Wielder (Ranged)'] })), 'met');

/* -------------------------------------------- */
/*  Wildcards                                    */
/* -------------------------------------------- */

check('Hatred (any), any Hatred copy counts', evalClause('Hatred (any)', snapshot({ talents: ['Hatred (Orks)'] })), 'met');
check('Hatred (Any One), same wildcard, different phrasing', evalClause('Hatred (Any One)', snapshot({ talents: ['Hatred (Chaos)'] })), 'met');
check('Weapon Training (any Melee) ignores the qualifier, any copy counts',
    evalClause('Weapon Training (any Melee)', snapshot({ talents: ['Weapon Training (Shock)'] })), 'met');
check('Exotic Weapon Training (Any), any copy counts',
    evalClause('Exotic Weapon Training (Any)', snapshot({ talents: ['Exotic Weapon Training (Flame)'] })), 'met');
check('a wildcard clause is unmet when the base talent is not owned at all',
    evalClause('Hatred (any)', snapshot()), 'unmet');

{
    const skills = freshSkills();
    setSpecialityRank(skills, 'scholasticLore', 'astromancy', 1);
    check('Lore (any one) wildcards across the three Lore-family skills',
        evalClause('Lore (any one)', snapshot({ skills })), 'met');
}
check('Lore (any one), unmet with no Lore skill known', evalClause('Lore (any one)', snapshot()), 'unmet');

/* -------------------------------------------- */
/*  Psy Rating / Corruption / Insanity / elite advance                                            */
/* -------------------------------------------- */

check('bare "Psy Rating" needs at least 1', evalClause('Psy Rating', snapshot({ psyRating: 1 })), 'met');
check('bare "Psy Rating", zero is not enough', evalClause('Psy Rating', snapshot({ psyRating: 0 })), 'unmet');
check('"Psy rating 3" needs the stated number', evalClause('Psy rating 3', snapshot({ psyRating: 3 })), 'met');
check('"Psy rating 3", short by one', evalClause('Psy rating 3', snapshot({ psyRating: 2 })), 'unmet');

check('"10 Corruption points" met', evalClause('10 Corruption points', snapshot({ corruption: 10 })), 'met');
check('"20 Corruption points" unmet', evalClause('20 Corruption points', snapshot({ corruption: 19 })), 'unmet');
check('"Insanity 20" met', evalClause('Insanity 20', snapshot({ insanity: 25 })), 'met');
check('"Insanity 20" unmet', evalClause('Insanity 20', snapshot({ insanity: 5 })), 'unmet');

check('"Untouchable elite advance" met when that is the character\'s elite advance',
    evalClause('Untouchable elite advance', snapshot({ eliteAdvance: 'Untouchable' })), 'met');
check('"Untouchable elite advance" unmet for a different (or no) elite advance',
    evalClause('Untouchable elite advance', snapshot({ eliteAdvance: 'Psyker' })), 'unmet');
check('"Untouchable elite advance" unmet with none at all',
    evalClause('Untouchable elite advance', snapshot()), 'unmet');

/* -------------------------------------------- */
/*  The genuinely-indeterminate case             */
/* -------------------------------------------- */

check('"Rank 4 in selected skill" is indeterminate, never met or unmet',
    evalClause('Rank 4 in selected skill', snapshot()), 'indeterminate');

/* -------------------------------------------- */
/*  Rule: only a definite 'unmet' blocks -- indeterminate is advisory only                        */
/* -------------------------------------------- */

{
    const result = evaluatePrerequisites('WP 40, Rank 4 in selected skill', snapshot({ characteristics: { willpower: 40 } }));
    check('an indeterminate clause alongside an otherwise-met prerequisite does not block',
        result.blocked, false);
    check('the indeterminate clause is still surfaced as an advisory', result.advisories.length, 1);
}
{
    const result = evaluatePrerequisites('WP 40, Rank 4 in selected skill', snapshot({ characteristics: { willpower: 10 } }));
    check('a real unmet clause blocks regardless of an unrelated indeterminate clause',
        result.blocked, true);
}
{
    const result = evaluatePrerequisites('', snapshot());
    check('an empty prerequisites string never blocks', result.blocked, false);
    check('an empty prerequisites string has no clauses', result.clauses.length, 0);
}

/* -------------------------------------------- */
/*  The sweep: every real prerequisite string in talents.yml                                      */
/* -------------------------------------------- */

// The one pattern this parser cannot ever resolve: a talent's own specialisation, chosen only
// once the talent itself is bought, cannot be checked before that purchase happens. Any other
// string landing here would mean a new, genuinely-unhandled grammar pattern appeared in the data.
const INDETERMINATE_ALLOWLIST = new Set(['Rank 4 in selected skill']);

const yaml = readFileSync(new URL('../src/packs/talents/talents.yml', import.meta.url), 'utf8');
const prereqStrings = [...yaml.matchAll(/prerequisites:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean);

// A floor, not an equality: adding a talent with a prerequisite is a legitimate content edit and
// must not fail the suite. What does need guarding is the regex above, which only matches
// single-quoted YAML scalars -- a double-quoted or block-scalar entry would be skipped silently
// and its clauses never swept. So compare what it matched against every `prerequisites:` key in
// the file that carries anything at all.
const prereqKeysWithContent = [...yaml.matchAll(/^\s*prerequisites:[ \t]*(\S.*)$/gm)]
    .map((m) => m[1].trim())
    .filter((v) => v !== "''" && v !== '""' && v !== 'null' && v !== '~');
check('at least as many prerequisite strings as when this sweep was written', prereqStrings.length >= 131, true);
check('the extraction regex matched every non-empty prerequisites: key',
    prereqStrings.length, prereqKeysWithContent.length);

const emptySnapshot = snapshot();
let cleanCount = 0;
const notClean = [];
for (const raw of prereqStrings) {
    const result = evaluatePrerequisites(raw, emptySnapshot);
    const hasIndeterminate = result.clauses.some((c) => c.status === 'indeterminate');
    if (INDETERMINATE_ALLOWLIST.has(raw)) {
        if (!hasIndeterminate) notClean.push(`${raw} -- expected on the allowlist but parsed cleanly; remove it from the allowlist`);
        else cleanCount++; // allowlisted and behaves as expected
        continue;
    }
    if (hasIndeterminate) {
        notClean.push(`${raw} -- ${result.clauses.filter((c) => c.status === 'indeterminate').map((c) => c.reason).join('; ')}`);
    } else {
        cleanCount++;
    }
}

console.log(`\n  (parsed ${cleanCount}/${prereqStrings.length} real prerequisite strings with every clause recognised)`);
for (const line of notClean) console.log(`        ${line}`);
check('every prerequisite string either parses cleanly or is on the explicit allowlist', notClean.length, 0);
check('exactly one real talent needs the allowlist', prereqStrings.filter((s) => INDETERMINATE_ALLOWLIST.has(s)).length, 1);

done();
