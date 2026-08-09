/**
 * Turning a book-worded grant into something this system can actually apply.
 *
 * The structured character-creation data records grants exactly as the rulebook prints them,
 * which is right for an audit trail but not directly usable: the book and this system spell a
 * few things differently. An audit of all 85 structured grants found three that do not match,
 * and all three are naming differences rather than missing content:
 *
 *   - "Tech-Use" -- the book hyphenates, this system's label is "Tech Use".
 *   - "Common Lore (Adeptus Administratum)" -- the speciality key here is `administratum`,
 *     labelled "Administratum". Note its siblings *do* keep the prefix ("Adeptus Arbites",
 *     "Adeptus Mechanicus"), so this one is the inconsistent entry, not the book.
 *   - "Common Lore (Adeptus Ministorum)" -- no such speciality exists at all. The Adeptus
 *     Ministorum and the Ecclesiarchy are the same institution, and "Ecclesiarchy" is offered,
 *     so that is what it resolves to. This one is a judgement call rather than a typo: if the
 *     table would rather see the Ministorum by name, add a speciality instead of aliasing it.
 *
 * Punctuation and spacing are folded away so only genuine differences need an alias entry.
 * Deliberately free of Foundry globals -- the caller passes the skills object in -- so this can
 * be unit tested in plain node like the rest of `rules/`.
 */

/** Fold case, punctuation and spacing, so "Tech-Use", "Tech Use" and "techuse" all agree. */
export function normaliseName(name) {
    return String(name ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

/**
 * Book wording -> this system's speciality key, per skill, for the cases folding punctuation
 * cannot reach. Keys are normalised on both sides, so add entries in plain book spelling.
 */
export const SPECIALITY_ALIASES = {
    commonLore: {
        'adeptus administratum': 'administratum',
        'adeptus ministorum': 'ecclesiarchy',
    },
};

/** A speciality the player picks at creation rather than one the book names. */
const PLAYER_CHOICE = /choice|any|pick one|pick/i;

/**
 * Resolve one `{skill, speciality}` grant against a skills object shaped like `template.json`'s
 * (or a live actor's `system.skills`).
 *
 * Never throws and never guesses silently: an unresolvable grant comes back with
 * `status: 'unresolved'` and a reason, so a caller can surface it instead of quietly dropping
 * a starting skill on the floor.
 *
 * @returns {{status: 'ok'|'player-choice'|'unresolved', skillKey: string|null,
 *            specialityKey: string|null, alias: boolean, reason: string|null}}
 */
export function resolveSkillGrant(grant, skills = {}) {
    const fail = (reason) => ({ status: 'unresolved', skillKey: null, specialityKey: null, alias: false, reason });
    if (!grant?.skill) return fail('no skill named');

    const wanted = normaliseName(grant.skill);
    let skillKey = null;
    for (const [key, def] of Object.entries(skills)) {
        if (normaliseName(key) === wanted || normaliseName(def?.label ?? '') === wanted) {
            skillKey = key;
            break;
        }
    }
    if (!skillKey) return fail(`no skill matching "${grant.skill}"`);

    const spec = grant.speciality;
    if (!spec) return { status: 'ok', skillKey, specialityKey: null, alias: false, reason: null };
    if (PLAYER_CHOICE.test(spec)) {
        return { status: 'player-choice', skillKey, specialityKey: null, alias: false, reason: null };
    }

    const available = skills[skillKey]?.specialities ?? {};
    if (!Object.keys(available).length) {
        return { status: 'unresolved', skillKey, specialityKey: null, alias: false, reason: `"${grant.skill}" has no specialities` };
    }

    const aliased = SPECIALITY_ALIASES[skillKey]?.[String(spec).trim().toLowerCase()];
    const target = normaliseName(aliased ?? spec);
    for (const [key, def] of Object.entries(available)) {
        if (normaliseName(key) === target || normaliseName(def?.label ?? '') === target) {
            return { status: 'ok', skillKey, specialityKey: key, alias: Boolean(aliased), reason: null };
        }
    }
    return { status: 'unresolved', skillKey, specialityKey: null, alias: false, reason: `no speciality matching "${spec}" on ${skillKey}` };
}

/** Resolve many grants at once, keeping the unresolved ones together for reporting. */
export function resolveSkillGrants(grants = [], skills = {}) {
    const resolved = [];
    const unresolved = [];
    for (const g of grants) {
        const r = resolveSkillGrant(g, skills);
        (r.status === 'unresolved' ? unresolved : resolved).push({ grant: g, ...r });
    }
    return { resolved, unresolved };
}
