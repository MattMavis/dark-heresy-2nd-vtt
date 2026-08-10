/**
 * Talent prerequisites -- turning the free-text `prerequisites` string every talent carries
 * (e.g. `'WP 40, Rank 2 in Medicae skill'`) into something the spend-XP window and the character
 * creation wizard can actually enforce, instead of just printing it.
 *
 * A sweep of all 131 non-empty prerequisite strings in `src/packs/talents/talents.yml` found the
 * grammar below. Commas separate AND-ed clauses (but a comma *inside* parentheses is part of the
 * clause, e.g. "Two-Weapon Wielder (Melee, Ranged)" is one clause, not two). Within a clause,
 * " or " separates alternatives (also parenthesis-aware).
 *
 * Every clause resolves to one of three states -- never just true/false:
 *   - 'met'           the snapshot satisfies it.
 *   - 'unmet'         the snapshot definitely does not satisfy it. This is the only state that
 *                      may block a purchase.
 *   - 'indeterminate' the clause is real but this parser cannot evaluate it (a genuinely unknown
 *                      pattern) or it is inherently unanswerable before purchase (a talent's own
 *                      not-yet-chosen specialisation, e.g. "Rank 4 in selected skill"). This must
 *                      never block -- see the module doc on `evaluatePrerequisites`.
 *
 * Deliberately free of Foundry globals: the caller passes a plain snapshot of the character in,
 * so this can be unit tested in plain node like the rest of `rules/`.
 */
import { normaliseName, SPECIALITY_ALIASES } from './grant-resolution.mjs';

/* -------------------------------------------- */
/*  Characteristics                              */
/* -------------------------------------------- */

/** Book short-code -> this system's characteristic key (template.json / actor.system.characteristics). */
export const CHARACTERISTIC_CODE_TO_KEY = {
    WS: 'weaponSkill',
    BS: 'ballisticSkill',
    S: 'strength',
    T: 'toughness',
    Ag: 'agility',
    Int: 'intelligence',
    Per: 'perception',
    WP: 'willpower',
    Fel: 'fellowship',
};

const CHAR_CODE_PATTERN = '(?:WS|BS|WP|Ag|Int|Per|Fel|T|S)';

/** Lore-family skills for the "Lore (any one)" wildcard, which names no real skill or talent by
 * itself -- see `Infused Knowledge` (talents.yml): "counts as having all Common Lore and
 * Scholastic Lore skills at rank 1", gated behind knowing at least one Lore skill already. */
const LORE_FAMILY_SKILL_KEYS = ['commonLore', 'forbiddenLore', 'scholasticLore'];

/* -------------------------------------------- */
/*  Splitting -- comma and " or ", both parenthesis-aware                                        */
/* -------------------------------------------- */

/** Split `text` on `separator` (a single character), never inside parentheses. Used for the
 * top-level AND split (comma) and, on a talent's own specialisation list, the AND-of-specialisations
 * form ("Two-Weapon Wielder (Melee, Ranged)" needs *both* copies). */
export function splitTopLevel(text, separator = ',') {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const ch of String(text ?? '')) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === separator && depth === 0) {
            out.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

/** Split on the literal " or " (case-insensitive), never inside parentheses. */
function splitTopLevelOr(text) {
    const out = [];
    let depth = 0;
    let cur = '';
    const s = String(text ?? '');
    let i = 0;
    while (i < s.length) {
        const ch = s[i];
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (depth === 0 && s.slice(i, i + 4).toLowerCase() === ' or ') {
            out.push(cur.trim());
            cur = '';
            i += 4;
            continue;
        }
        cur += ch;
        i++;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

/** "Name (Specialisation)" -> {base: 'Name', spec: 'Specialisation'|null}. Not parenthesis-nested
 * anywhere in the real data, so a single non-greedy match is enough. */
function parseNameSpec(text) {
    const m = String(text ?? '').match(/^(.+?)\s*\(([^()]*)\)\s*$/);
    if (!m) return { base: text.trim(), spec: null };
    return { base: m[1].trim(), spec: m[2].trim() };
}

const met = () => ({ status: 'met' });
const unmet = () => ({ status: 'unmet' });
const statusFrom = (isMet) => (isMet ? met() : unmet());
const indeterminate = (reason) => ({ status: 'indeterminate', reason });

/* -------------------------------------------- */
/*  Skill lookups against a snapshot shaped like actor.system.skills / template.json             */
/* -------------------------------------------- */

function findSkillKey(skills, name) {
    const wanted = normaliseName(name);
    for (const [key, def] of Object.entries(skills ?? {})) {
        if (normaliseName(key) === wanted || normaliseName(def?.label ?? '') === wanted) return key;
    }
    return null;
}

/**
 * Resolve a speciality name against one skill's `specialities` object.
 * - "Any" / "Any One" -> full wildcard (any speciality of this skill counts).
 * - "X - Any" (only real case: "Xenos - Any") -> the specific speciality named by X, if it
 *   exists; if the qualifier itself doesn't match a real speciality, fall back to the full
 *   wildcard rather than declaring the clause unmet on what would be a parser miss.
 * - otherwise an exact/alias match, same alias table `resolveSkillGrant` uses.
 */
function findSpecialityKey(skillKey, skillDef, specText) {
    const available = skillDef?.specialities ?? {};
    if (!Object.keys(available).length) return { key: null, wildcard: false, notFound: true };

    const norm = specText.trim();
    if (/^any(\s+one)?$/i.test(norm)) return { key: null, wildcard: true };

    const dashAny = norm.match(/^(.+?)\s*-\s*any$/i);
    const probe = dashAny ? dashAny[1] : norm;
    const aliased = SPECIALITY_ALIASES[skillKey]?.[probe.trim().toLowerCase()];
    const target = normaliseName(aliased ?? probe);
    for (const [key, def] of Object.entries(available)) {
        if (normaliseName(key) === target || normaliseName(def?.label ?? '') === target) {
            return { key, wildcard: false };
        }
    }
    if (dashAny) return { key: null, wildcard: true };
    return { key: null, wildcard: false, notFound: true };
}

function skillRankValue(skills, skillKey, specialityKey, wildcard) {
    const skill = skills?.[skillKey];
    if (!skill) return 0;
    if (wildcard) {
        const specs = Object.values(skill.specialities ?? {});
        if (specs.length) return Math.max(0, ...specs.map((s) => Number(s.advance) || 0));
        return Number(skill.advance) || 0;
    }
    if (specialityKey) return Number(skill.specialities?.[specialityKey]?.advance) || 0;
    return Number(skill.advance) || 0;
}

function loreWildcardRank(skills) {
    let max = 0;
    for (const key of LORE_FAMILY_SKILL_KEYS) {
        for (const spec of Object.values(skills?.[key]?.specialities ?? {})) {
            max = Math.max(max, Number(spec.advance) || 0);
        }
    }
    return max;
}

/**
 * Is `nameText` a skill reference at all, and if so does it meet `requiredRank`?
 * Returns `null` (not a skill by this name -- caller should try a talent next), or a status.
 * Handles the "any X" wildcard shape used inside "Rank N in ... skill" clauses.
 */
function resolveSkillThreshold(nameText, snapshot, requiredRank) {
    const anyMatch = String(nameText).match(/^any\s+(.+)$/i);
    const { base, spec } = parseNameSpec(anyMatch ? anyMatch[1] : nameText);
    const forceWildcard = !!anyMatch;

    if (normaliseName(base) === 'lore') {
        return statusFrom(loreWildcardRank(snapshot.skills) >= requiredRank);
    }

    const skillKey = findSkillKey(snapshot.skills, base);
    if (!skillKey) return null;
    const skillDef = snapshot.skills[skillKey];

    let specialityKey = null;
    let wildcard = forceWildcard;
    if (spec && !forceWildcard) {
        const r = findSpecialityKey(skillKey, skillDef, spec);
        if (r.notFound) return indeterminate(`could not match the "${spec}" specialisation against ${skillDef.label ?? skillKey}`);
        specialityKey = r.key;
        wildcard = r.wildcard;
    }

    const rank = skillRankValue(snapshot.skills, skillKey, specialityKey, wildcard);
    return statusFrom(rank >= requiredRank);
}

/* -------------------------------------------- */
/*  Talent ownership against snapshot.talents (display-name strings, e.g. "Resistance (Fear)")   */
/* -------------------------------------------- */

function ownedTalentBaseSpecs(snapshot) {
    return (snapshot.talents ?? []).map((name) => parseNameSpec(name));
}

/**
 * @param specs {string[]|null} null = bare name, any copy counts. An array requires a matching
 *   owned copy for *every* entry (the AND-of-specialisations form, "Two-Weapon Wielder (Melee, Ranged)").
 */
function hasTalent(snapshot, base, specs, wildcard) {
    const baseNorm = normaliseName(base);
    const owned = ownedTalentBaseSpecs(snapshot).filter((t) => normaliseName(t.base) === baseNorm);
    if (!owned.length) return false;
    if (wildcard || !specs) return true;
    return specs.every((reqSpec) => owned.some((t) => t.spec && normaliseName(t.spec) === normaliseName(reqSpec)));
}

/* -------------------------------------------- */
/*  Atom resolvers                               */
/* -------------------------------------------- */

/** Corruption / Insanity / Psy Rating / elite advance / a bare characteristic threshold. None of
 * these ever legitimately contain " or ", so they're safe to try before splitting on it. */
function resolveSimpleAtom(text, snapshot) {
    let m;
    if ((m = text.match(/^(\d+)\s+Corruption\s+points?$/i))) {
        return statusFrom((Number(snapshot.corruption) || 0) >= Number(m[1]));
    }
    if ((m = text.match(/^Insanity\s+(\d+)$/i))) {
        return statusFrom((Number(snapshot.insanity) || 0) >= Number(m[1]));
    }
    if ((m = text.match(/^Psy\s+Rating(?:\s+(\d+))?$/i))) {
        const need = m[1] ? Number(m[1]) : 1;
        return statusFrom((Number(snapshot.psyRating) || 0) >= need);
    }
    if ((m = text.match(/^(.+?)\s+elite\s+advance$/i))) {
        const wanted = normaliseName(m[1]);
        return statusFrom(!!snapshot.eliteAdvance && normaliseName(snapshot.eliteAdvance) === wanted);
    }
    if ((m = text.match(new RegExp(`^(${CHAR_CODE_PATTERN})\\s+(\\d+)$`)))) {
        const key = CHARACTERISTIC_CODE_TO_KEY[m[1]];
        const total = Number(snapshot.characteristics?.[key]) || 0;
        return statusFrom(total >= Number(m[2]));
    }
    return null;
}

/** "Name +N" / "Name (Spec) +N" -- the advance ladder: +0 Known, +10 Trained, +20 Experienced,
 * +30 Veteran, i.e. rank = N/10 + 1. */
function resolveBonusAtom(text, snapshot) {
    const m = text.match(/^(.+?)\s*\+\s*(\d+)$/);
    if (!m) return null;
    const requiredRank = Number(m[2]) / 10 + 1;
    return resolveSkillThreshold(m[1].trim(), snapshot, requiredRank);
}

/** A bare name or "Name (Spec)" with no bonus/rank prefix: resolved against skills first (a bare
 * mention means "knows it", i.e. rank >= 1), then talents (owned, by name and, if given, by
 * specialisation -- comma-separated specialisations are AND-ed together). Always resolvable: an
 * unrecognised skill falls through to a definite owned/not-owned talent check, never indeterminate. */
function resolveBareAtom(text, snapshot) {
    const { base, spec } = parseNameSpec(text);

    if (spec && /^any(\s+one)?\b/i.test(spec)) {
        if (normaliseName(base) === 'lore') return statusFrom(loreWildcardRank(snapshot.skills) >= 1);
        return statusFrom(hasTalent(snapshot, base, null, true));
    }

    const skillResult = resolveSkillThreshold(text, snapshot, 1);
    if (skillResult) return skillResult;

    const specs = spec ? splitTopLevel(spec, ',') : null;
    return statusFrom(hasTalent(snapshot, base, specs, false));
}

/** "Rank N in X" -- X may itself be an OR of alternatives ("Rank 2 in Survival or any Operate
 * skill"), each optionally trailed by the word "skill". "Rank N in selected skill" refers to the
 * talent's own not-yet-chosen specialisation and can never be known before purchase. */
function resolveRankClause(text, snapshot) {
    const m = text.match(/^Rank\s+(\d+)\s+in\s+(.+)$/i);
    if (!m) return null;
    const rank = Number(m[1]);
    const rest = m[2].trim();

    if (/^selected\s+skill$/i.test(rest)) {
        return indeterminate("depends on the talent's own chosen specialisation, which is not known until it is bought");
    }

    const alts = splitTopLevelOr(rest).map((s) => s.replace(/\s+skill\s*$/i, '').trim());
    const results = alts.map((alt) => resolveSkillThreshold(alt, snapshot, rank));
    if (results.every((r) => r === null)) return indeterminate(`unrecognised skill reference "${rest}"`);
    if (results.some((r) => r?.status === 'met')) return met();
    if (results.some((r) => r?.status === 'indeterminate')) return indeterminate(results.find((r) => r?.status === 'indeterminate').reason);
    return unmet();
}

/** Any atom shape reachable from inside an OR-group: simple, bonus, or bare -- never rank-in or a
 * further nested "or" (neither appears on one side of an alternative anywhere in the real data). */
function resolveAtomAnywhere(text, snapshot) {
    return resolveSimpleAtom(text, snapshot) ?? resolveBonusAtom(text, snapshot) ?? resolveBareAtom(text, snapshot);
}

/** A clause containing a top-level " or ". Handles the shared-threshold characteristic shorthand
 * ("BS or WS 40" means BS 40 or WS 40) alongside ordinary explicit-threshold and bare/talent
 * alternatives ("Dodge or Parry", "Common Lore (Imperial Creed) +10 or Forbidden Lore (Daemonology)"). */
function resolveOrGroup(parts, snapshot) {
    const codePattern = new RegExp(`^(${CHAR_CODE_PATTERN})(?:\\s+(\\d+))?$`);
    const codeMatches = parts.map((p) => p.match(codePattern));
    if (codeMatches.every(Boolean)) {
        const fallbackNum = codeMatches.map((cm) => cm[2]).find(Boolean);
        const isMet = codeMatches.some((cm) => {
            const key = CHARACTERISTIC_CODE_TO_KEY[cm[1]];
            const need = Number(cm[2] ?? fallbackNum);
            return (Number(snapshot.characteristics?.[key]) || 0) >= need;
        });
        return statusFrom(isMet);
    }

    const results = parts.map((p) => resolveAtomAnywhere(p, snapshot));
    if (results.some((r) => r.status === 'met')) return met();
    if (results.some((r) => r.status === 'indeterminate')) return indeterminate(results.find((r) => r.status === 'indeterminate').reason);
    return unmet();
}

/* -------------------------------------------- */
/*  Public API                                   */
/* -------------------------------------------- */

/**
 * Evaluate one already-comma-split clause (e.g. `'Rank 2 in Medicae skill'`) against a character
 * snapshot.
 *
 * @param text {string}
 * @param snapshot {{
 *   characteristics: Object<string, number>,
 *   skills: Object<string, {label?: string, advance?: number, specialities?: Object<string, {label?: string, advance?: number}>}>,
 *   talents: string[],
 *   psyRating: number,
 *   corruption: number,
 *   insanity: number,
 *   eliteAdvance: string|null,
 * }}
 * @returns {{text: string, status: 'met'|'unmet'|'indeterminate', reason: string|null}}
 */
export function evaluatePrerequisiteClause(text, snapshot) {
    const clause = String(text ?? '').trim();
    if (!clause) return { text: clause, status: 'met', reason: null };

    let result = resolveRankClause(clause, snapshot);
    if (!result) {
        const orParts = splitTopLevelOr(clause);
        if (orParts.length > 1) result = resolveOrGroup(orParts, snapshot);
    }
    if (!result) result = resolveSimpleAtom(clause, snapshot);
    if (!result) result = resolveBonusAtom(clause, snapshot);
    if (!result) result = resolveBareAtom(clause, snapshot);

    return { text: clause, status: result.status, reason: result.reason ?? null };
}

/**
 * Evaluate a talent's full `prerequisites` string. Splits on top-level commas (AND), evaluates
 * each clause, and reports `blocked` -- true only when at least one clause is definitely `unmet`.
 * An `indeterminate` clause is surfaced (for a GM/player to judge) but never blocks -- silently
 * refusing a legitimate purchase because this parser doesn't recognise a pattern would be worse
 * than today's do-nothing display.
 *
 * @returns {{clauses: Array<{text:string, status:string, reason:string|null}>, blocked: boolean,
 *            advisories: Array<{text:string, status:string, reason:string|null}>}}
 */
export function evaluatePrerequisites(text, snapshot) {
    const clauses = splitTopLevel(text ?? '', ',').map((c) => evaluatePrerequisiteClause(c, snapshot));
    return {
        clauses,
        blocked: clauses.some((c) => c.status === 'unmet'),
        advisories: clauses.filter((c) => c.status === 'indeterminate'),
    };
}
