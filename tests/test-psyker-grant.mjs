// Unit tests for the Psyker elite advance's grant logic (rules/psyker-grant.mjs): Psy Rating 1,
// the Psyker trait, the Psyker aptitude, and -- unless the character already has the Sanctioned
// trait -- 1d10+3 Corruption, all triggered by `bio.elite` becoming "Psyker". The Foundry-touching
// wiring around this -- documents/acolyte.mjs's `_onUpdate`/`applyPsykerElite`, the `new
// Roll('1d10+3')` call itself, and the compendium item lookup/creation -- is NOT exercised here;
// it needs a live Foundry world (see the same split character-creation-prompt.mjs has with the
// Foundry-free character-creation.mjs it wraps).
import {
    PSYKER_GRANTED_FLAG,
    needsPsykerGrant,
    planPsykerGrant,
    buildPsykerGrantUpdate,
    planPsykerGrantApplication,
} from '../src/module/rules/psyker-grant.mjs';
import { roleGrantedEliteAdvance } from '../src/module/rules/character-creation.mjs';
import { roles } from '../src/module/rules/roles.mjs';
import { eliteAdvancesNames } from '../src/module/rules/elite-advances.mjs';
import { check, done } from './harness.mjs';

/* -------------------------------------------- */
/*  needsPsykerGrant                             */
/* -------------------------------------------- */

check('a fresh Psyker with nothing granted yet needs the grant',
    needsPsykerGrant({ eliteAdvance: 'Psyker', alreadyGranted: false }), true);
check('a Psyker already flagged as granted does not need it again',
    needsPsykerGrant({ eliteAdvance: 'Psyker', alreadyGranted: true }), false);
check('an Untouchable never needs the Psyker grant',
    needsPsykerGrant({ eliteAdvance: 'Untouchable', alreadyGranted: false }), false);
check('no elite advance at all needs nothing',
    needsPsykerGrant({ eliteAdvance: '', alreadyGranted: false }), false);
check('the flag wins even if somehow re-checked while eliteAdvance still reads Psyker',
    needsPsykerGrant({ eliteAdvance: 'Psyker', alreadyGranted: true }), false);

/* -------------------------------------------- */
/*  planPsykerGrant                              */
/* -------------------------------------------- */

const fresh = { psyRating: 0, hasPsykerTrait: false, hasPsykerAptitude: false, hasSanctionedTrait: false };
check('a completely fresh psyker needs every grant, including the corruption roll',
    planPsykerGrant(fresh), { setPsyRating: true, grantTrait: true, grantAptitude: true, rollCorruption: true });

check('an existing Psy Rating of 1 or more is never touched (not lowered, not re-set)',
    planPsykerGrant({ ...fresh, psyRating: 3 }).setPsyRating, false);
check('an unset Psy Rating (undefined) still counts as needing the grant',
    planPsykerGrant({ ...fresh, psyRating: undefined }).setPsyRating, true);
check('a Psy Rating of exactly 1 already counts as granted',
    planPsykerGrant({ ...fresh, psyRating: 1 }).setPsyRating, false);

check('an already-owned Psyker trait is not granted a second time',
    planPsykerGrant({ ...fresh, hasPsykerTrait: true }).grantTrait, false);
check('an already-owned Psyker aptitude is not granted a second time',
    planPsykerGrant({ ...fresh, hasPsykerAptitude: true }).grantAptitude, false);

check('a Sanctioned character does not roll corruption',
    planPsykerGrant({ ...fresh, hasSanctionedTrait: true }).rollCorruption, false);
check('a rogue (non-Sanctioned) psyker does roll corruption',
    planPsykerGrant({ ...fresh, hasSanctionedTrait: false }).rollCorruption, true);

check('a character who already has everything needs nothing at all',
    planPsykerGrant({ psyRating: 1, hasPsykerTrait: true, hasPsykerAptitude: true, hasSanctionedTrait: true }),
    { setPsyRating: false, grantTrait: false, grantAptitude: false, rollCorruption: false });

/* -------------------------------------------- */
/*  buildPsykerGrantUpdate: the corruption roll's arithmetic                    */
/* -------------------------------------------- */

const FLAG_PATH = 'flags.dark-heresy-2nd.psykerGranted';

check('a full grant sets the flag, Psy Rating, and adds the rolled corruption to the existing total',
    buildPsykerGrantUpdate(
        { setPsyRating: true, grantTrait: true, grantAptitude: true, rollCorruption: true },
        { currentCorruption: 5, corruptionGained: 7, flagPath: FLAG_PATH },
    ),
    { [FLAG_PATH]: true, 'system.psy.rating': 1, 'system.corruption': 12 });

check('a Sanctioned grant (no roll) never writes system.corruption at all',
    buildPsykerGrantUpdate(
        { setPsyRating: true, grantTrait: true, grantAptitude: true, rollCorruption: false },
        { currentCorruption: 5, corruptionGained: 0, flagPath: FLAG_PATH },
    ),
    { [FLAG_PATH]: true, 'system.psy.rating': 1 });

check('an already-rated psyker\'s update never writes system.psy.rating',
    buildPsykerGrantUpdate(
        { setPsyRating: false, grantTrait: true, grantAptitude: true, rollCorruption: true },
        { currentCorruption: 0, corruptionGained: 4, flagPath: FLAG_PATH },
    ),
    { [FLAG_PATH]: true, 'system.corruption': 4 });

check('a no-op plan (everything already present) still always sets the flag',
    buildPsykerGrantUpdate(
        { setPsyRating: false, grantTrait: false, grantAptitude: false, rollCorruption: false },
        { currentCorruption: 5, corruptionGained: 0, flagPath: FLAG_PATH },
    ),
    { [FLAG_PATH]: true });

check('a missing/undefined currentCorruption is treated as zero, not NaN',
    buildPsykerGrantUpdate(
        { setPsyRating: false, grantTrait: false, grantAptitude: false, rollCorruption: true },
        { currentCorruption: undefined, corruptionGained: 9, flagPath: FLAG_PATH },
    )['system.corruption'], 9);

/* -------------------------------------------- */
/*  planPsykerGrantApplication: the end-to-end decision + corruption roll +     */
/*  idempotency guard, exactly as documents/acolyte.mjs#applyPsykerElite calls  */
/*  it, but with the dice roll and the actor both faked out.                    */
/* -------------------------------------------- */

/** A minimal stand-in for the real Acolyte document: only what planPsykerGrantApplication reads. */
function fakeActor({ elite = 'Psyker', items = [], psyRating = 0, corruption = 0 } = {}) {
    return { bio: { elite }, items, psy: { rating: psyRating }, corruption };
}

/** A `rollCorruption` stub that records how many times it was actually called -- the point being
 * to prove a Sanctioned or already-granted actor never rolls at all, not just that the number it
 * would have produced is unused. */
function countingRoll(value) {
    const calls = { count: 0 };
    const fn = async () => {
        calls.count += 1;
        return value;
    };
    fn.calls = calls;
    return fn;
}

{
    const actor = fakeActor({});
    const roll = countingRoll(7);
    const result = await planPsykerGrantApplication(actor, { alreadyGranted: false, flagPath: FLAG_PATH, rollCorruption: roll });
    check('a fresh rogue psyker: corruption is rolled exactly once', roll.calls.count, 1);
    check('a fresh rogue psyker: the rolled total is applied to the update', result.update['system.corruption'], 7);
    check('a fresh rogue psyker: Psy Rating 1 is set', result.update['system.psy.rating'], 1);
    check('a fresh rogue psyker: both trait and aptitude are planned', [result.plan.grantTrait, result.plan.grantAptitude], [true, true]);
    check('a fresh rogue psyker: the granted flag is set', result.update[FLAG_PATH], true);
}

{
    // Sanctioned via an actual "Sanctioned" trait item, same shape a real actor's .items carries.
    const actor = fakeActor({ items: [{ type: 'trait', name: 'Sanctioned' }] });
    const roll = countingRoll(7);
    const result = await planPsykerGrantApplication(actor, { alreadyGranted: false, flagPath: FLAG_PATH, rollCorruption: roll });
    check('a Sanctioned psyker: corruption is never rolled', roll.calls.count, 0);
    check('a Sanctioned psyker: no corruption is written to the update', 'system.corruption' in result.update, false);
    check('a Sanctioned psyker: the flag is still set', result.update[FLAG_PATH], true);
}

{
    // The idempotency guard: once alreadyGranted is true, nothing runs -- not the roll, not the
    // plan, not the update -- regardless of what bio.elite still says.
    const actor = fakeActor({});
    const roll = countingRoll(7);
    const result = await planPsykerGrantApplication(actor, { alreadyGranted: true, flagPath: FLAG_PATH, rollCorruption: roll });
    check('an already-granted actor: the whole call is a no-op', result, null);
    check('an already-granted actor: corruption is never rolled', roll.calls.count, 0);
}

{
    // A second, independent call against the SAME actor after the first grant landed -- the real
    // sequence `applyPsykerElite` produces: apply, persist the flag, then (if the hook fires again
    // for any reason) re-check. Simulated here by re-deriving alreadyGranted from what the first
    // call's update would have written, without a real Document in between.
    const actor = fakeActor({});
    const roll = countingRoll(7);
    const first = await planPsykerGrantApplication(actor, { alreadyGranted: false, flagPath: FLAG_PATH, rollCorruption: roll });
    const second = await planPsykerGrantApplication(actor, { alreadyGranted: !!first.update[FLAG_PATH], flagPath: FLAG_PATH, rollCorruption: roll });
    check('re-running against the same actor after the flag lands grants nothing further', second, null);
    check('re-running against the same actor after the flag lands never re-rolls corruption', roll.calls.count, 1);
}

{
    // A GM who hand-added the trait/aptitude/rating before ever touching the dropdown: the very
    // first application only fills the gap (corruption, here -- Sanctioned still rolls if the
    // trait itself is absent) and never re-creates what is already there.
    const actor = fakeActor({ items: [{ type: 'trait', name: 'Psyker' }, { type: 'aptitude', name: 'Psyker' }], psyRating: 1 });
    const roll = countingRoll(4);
    const result = await planPsykerGrantApplication(actor, { alreadyGranted: false, flagPath: FLAG_PATH, rollCorruption: roll });
    check('a hand-built psyker: neither trait nor aptitude are re-planned', [result.plan.grantTrait, result.plan.grantAptitude], [false, false]);
    check('a hand-built psyker: Psy Rating is left alone', result.plan.setPsyRating, false);
    check('a hand-built psyker: corruption still rolls once (not Sanctioned)', roll.calls.count, 1);
}

{
    // bio.elite is not "Psyker" at all -- the Untouchable elite advance, explicitly out of scope,
    // must never trigger anything here.
    const actor = fakeActor({ elite: 'Untouchable' });
    const roll = countingRoll(7);
    const result = await planPsykerGrantApplication(actor, { alreadyGranted: false, flagPath: FLAG_PATH, rollCorruption: roll });
    check('Untouchable is left alone entirely', result, null);
    check('Untouchable never rolls corruption', roll.calls.count, 0);
}

/* -------------------------------------------- */
/*  roleGrantedEliteAdvance: the Mystic role's chargen wiring                   */
/* -------------------------------------------- */

const mystic = roles().find((r) => r.name === 'Mystic');
check('the Mystic role grants the Psyker elite advance at character creation',
    roleGrantedEliteAdvance(mystic), 'Psyker');

const nonGrantingRoles = roles().filter((r) => r.name !== 'Mystic');
check('no other role grants an elite advance at character creation',
    nonGrantingRoles.every((r) => roleGrantedEliteAdvance(r) === null), true);

check('roleGrantedEliteAdvance is safe against a role with no role_bonus at all', roleGrantedEliteAdvance(null), null);

check('every elite advance a role can grant is one this system actually defines',
    eliteAdvancesNames().includes(roleGrantedEliteAdvance(mystic)), true);

done();
