/**
 * Conditional item bonuses.
 *
 * A great deal of equipment in the books grants a bonus that only applies in specific
 * circumstances -- "+30 to Security tests when trying to open locks", "+20 to Awareness when
 * used", "+30 to Medicae tests to stop Blood Loss". These cannot be ActiveEffects: an effect
 * would inflate every roll of that skill regardless of what the character is actually doing.
 *
 * So they are not applied at all. They are collected when the relevant test is rolled and
 * shown alongside the result, with the condition spelled out and the number the target would
 * become, leaving the call to the player and GM. The roll's own maths is untouched.
 */

/** Types whose conditional bonuses only count while the item is equipped. */
const EQUIP_GATED_TYPES = ['armour', 'cybernetic', 'forceField', 'weapon', 'gear', 'tool'];

/**
 * Key a roll against the vocabulary items use: a characteristic name ("perception"), a skill
 * name ("security"), or a specialist skill and its speciality ("navigate.surface").
 */
export function conditionalBonusKey(name, speciality) {
    if (!name) return '';
    return speciality ? `${name}.${speciality}` : name;
}

/**
 * Every conditional bonus on the actor's available items that applies to `targetKey`.
 * Returns [] rather than null so callers can render it without guarding.
 */
export function collectConditionalBonuses(actor, targetKey) {
    if (!actor?.items || !targetKey) return [];

    const found = [];
    for (const item of actor.items) {
        const bonuses = item.system?.conditionalBonuses;
        if (!Array.isArray(bonuses) || bonuses.length === 0) continue;

        // Consumables and drugs are spent through Use, not carried into a test.
        if (item.isUsable) continue;
        if (EQUIP_GATED_TYPES.includes(item.type) && !item.system.equipped) continue;

        for (const bonus of bonuses) {
            if (bonus?.key !== targetKey) continue;
            let value = Number(bonus.value);
            if (!Number.isFinite(value) || value === 0) continue;

            // Talents taken more than once scale with how many times: Peer (X) is +10 per rank.
            // An unrated copy advises nothing rather than pretending to be rank 1.
            if (bonus.perLevel) {
                const level = Number(item.system?.level) || 0;
                if (level <= 0) continue;
                value *= level;
            }

            // "{choice}" stands in for whatever specialisation this copy was taken with.
            // Until one is picked the advisory would be meaningless, so it stays hidden
            // rather than nagging on every roll of that characteristic.
            const rawCondition = bonus.condition ?? '';
            if (rawCondition.includes('{choice}') && !item.choiceLabel) continue;
            const condition = rawCondition.replace(/\{choice\}/g, item.choiceLabel);

            found.push({
                // displayName so the advisory reads "Hatred (Mutants)", not a bare "Hatred".
                source: item.displayName ?? item.name,
                value,
                // Pre-signed here so templates can print it without a comparison helper.
                display: value > 0 ? `+${value}` : `${value}`,
                condition,
            });
        }
    }
    return found;
}
