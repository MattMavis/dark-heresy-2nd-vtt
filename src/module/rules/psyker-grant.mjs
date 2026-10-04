/**
 * Deciding what the Psyker elite advance (elite-advances.mjs) still needs to grant, and building
 * the actor.update() payload for it: Psy Rating 1, the Psyker trait, the Psyker aptitude, and --
 * unless the character already carries the Sanctioned trait -- 1d10+3 Corruption.
 *
 * `bio.elite` (see documents/acolyte.mjs) is just a labelled string; nothing enforced what picking
 * "Psyker" off that dropdown actually grants until this module. The trigger lives on the acolyte
 * document (`_onUpdate`, documents/acolyte.mjs) rather than in `prepareDerivedData`, because
 * creating embedded items and rolling dice are writes, and Foundry re-runs data preparation far
 * too often for a write to safely live there.
 *
 * Everything here is deliberately free of Foundry globals -- no `game`, no `Roll`, no Document --
 * the same discipline `character-creation.mjs` uses, and for the same reason: it lets the whole
 * decision (including the corruption roll's arithmetic and the idempotency guard) run in a plain
 * unit test. `documents/acolyte.mjs`'s `applyPsykerElite()` is the thin real-world wiring around
 * `planPsykerGrantApplication` below: it supplies the actual `new Roll('1d10+3')`, the actor's
 * real flag/items, and the `actor.update()` / `grantItems()` calls, and is itself NOT unit tested
 * -- the same split `character-creation-prompt.mjs` has with `character-creation.mjs`.
 */

/** Set on the actor (`flags.dark-heresy-2nd.psykerGranted`, see documents/acolyte.mjs) once
 * {@link planPsykerGrantApplication} has produced an update for it. This is the guard of record:
 * once set, {@link needsPsykerGrant} always refuses, regardless of what `bio.elite` says, so
 * flipping the elite advance away from and back to "Psyker" -- or simply re-saving the sheet --
 * can never re-roll corruption or re-grant the trait/aptitude/rating. */
export const PSYKER_GRANTED_FLAG = 'psykerGranted';

/**
 * Whether the Psyker elite advance's grants still need applying at all.
 * @param eliteAdvance {string} the actor's current `bio.elite`.
 * @param alreadyGranted {boolean} the actor's {@link PSYKER_GRANTED_FLAG}.
 */
export function needsPsykerGrant({ eliteAdvance, alreadyGranted }) {
    return eliteAdvance === 'Psyker' && !alreadyGranted;
}

/**
 * What still needs granting, given the actor's current state. Every field defaults to "needs
 * granting" unless the actor already has it, so a partially hand-built psyker (a GM who already
 * set Psy Rating 1 by hand before flipping the dropdown, say) only receives what is missing --
 * and, importantly, an existing Psy Rating above 1 is never lowered: `setPsyRating` only fires
 * when the current rating is not already positive.
 */
export function planPsykerGrant({ psyRating, hasPsykerTrait, hasPsykerAptitude, hasSanctionedTrait }) {
    return {
        setPsyRating: !(Number(psyRating) > 0),
        grantTrait: !hasPsykerTrait,
        grantAptitude: !hasPsykerAptitude,
        rollCorruption: !hasSanctionedTrait,
    };
}

/**
 * The `actor.update()` payload for one application of `plan` -- everything except embedded item
 * creation, which is a separate call (`grantItems`, compendium-grants.mjs) so it can be batched
 * the same way character creation batches its grants. `corruptionGained` is the already-rolled
 * total (0 when `plan.rollCorruption` was false); rolling the dice is a side effect and stays out
 * of this pure function. `flagPath` is the dotted `flags.<scope>.<key>` path for
 * {@link PSYKER_GRANTED_FLAG} -- passed in rather than assembled here so this module never needs
 * to know the system id.
 *
 * The flag is always set to `true`, unconditionally: reaching this function at all means
 * {@link needsPsykerGrant} said the grant had not been applied yet, and applying it -- even when
 * every individual field in `plan` turned out to already be satisfied -- is what the flag records.
 */
export function buildPsykerGrantUpdate(plan, { currentCorruption, corruptionGained, flagPath }) {
    const update = { [flagPath]: true };
    if (plan.setPsyRating) update['system.psy.rating'] = 1;
    if (corruptionGained) update['system.corruption'] = (Number(currentCorruption) || 0) + corruptionGained;
    return update;
}

/**
 * Decide and build everything {@link applyPsykerElite} (documents/acolyte.mjs) needs to write to
 * `actor`, except rolling the dice and creating the granted items -- both real side effects, kept
 * out so this can run start-to-finish in a plain unit test. `rollCorruption` is injected for the
 * same reason: production passes something like `() => new Roll('1d10+3').evaluate().then(r =>
 * r.total)`; a test passes a fixed number and can assert it was (or was not) called at all.
 *
 * `actor` only needs to look like one: `.bio.elite`, `.items` (an array/array-like of
 * `{type, name}`, checked with `.some`), `.psy.rating` and `.corruption`. The real Acolyte
 * document satisfies this already; a plain object works just as well in a test.
 *
 * Returns `null` if nothing needs doing -- `bio.elite` is not "Psyker", or `alreadyGranted` is
 * already true. Otherwise returns `{ plan, corruptionGained, update }`: `update` is the
 * `actor.update()` payload to apply; `plan.grantTrait` / `plan.grantAptitude` tell the caller
 * which compendium items to fetch and create afterwards.
 */
export async function planPsykerGrantApplication(actor, { alreadyGranted, flagPath, rollCorruption }) {
    if (!needsPsykerGrant({ eliteAdvance: actor.bio?.elite, alreadyGranted })) return null;

    const items = actor.items ?? [];
    const hasPsykerTrait = items.some((i) => i.type === 'trait' && i.name === 'Psyker');
    const hasPsykerAptitude = items.some((i) => i.type === 'aptitude' && i.name === 'Psyker');
    const hasSanctionedTrait = items.some((i) => i.type === 'trait' && i.name === 'Sanctioned');
    const plan = planPsykerGrant({
        psyRating: actor.psy?.rating,
        hasPsykerTrait,
        hasPsykerAptitude,
        hasSanctionedTrait,
    });

    const corruptionGained = plan.rollCorruption ? await rollCorruption() : 0;
    const update = buildPsykerGrantUpdate(plan, { currentCorruption: actor.corruption, corruptionGained, flagPath });

    return { plan, corruptionGained, update };
}
