/**
 * Sorting for the pickable-item tables: requisition candidates, buyable talents, psychic powers.
 *
 * Pure -- rows in, rows out, no Foundry globals -- so the comparison rules are unit-tested rather
 * than eyeballed in a dialog.
 *
 * The reason this is not a one-line `localeCompare`: several of the columns are ORDERED
 * CATEGORIES, not text. Sorting Availability alphabetically puts Abundant above Ubiquitous and
 * Rare above Plentiful, which is worse than not sorting at all -- the column exists precisely to
 * express "how hard is this to get", and alphabetical order destroys that. Same for
 * Craftsmanship: Best, Common, Good, Poor is nonsense; Poor, Common, Good, Best is the scale.
 */

import { DarkHeresy } from './config.mjs';

/** Columns whose values are ordered categories, with the order to use. */
const SCALES = {
    availability: () => DarkHeresy.items.availability,
    craftsmanship: () => DarkHeresy.items.craftsmanship,
};

/**
 * Reduce a cell to something comparable, or null when there is nothing to compare.
 *
 * Ordered categories become their index on their scale, so Availability compares as scarcity
 * rather than as text. A value that is not on its scale is treated as MISSING rather than as
 * index -1, which would otherwise sort it ahead of the most common tier.
 */
function normalise(key, value) {
    const scale = SCALES[key]?.();
    if (scale) {
        const index = scale.indexOf(value);
        return index < 0 ? null : index;
    }
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : String(value);
}

/** Compare two already-normalised, non-null values. */
function comparePresent(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sort a copy of `rows` by `key`.
 *
 * Falls back to name order within equal values, so a sort by Tier or Cost still reads
 * alphabetically inside each group rather than in whatever order the pack happened to load.
 *
 * @param {Array<object>} rows
 * @param {string|null} key        Property to sort on; null leaves the order untouched.
 * @param {'asc'|'desc'} direction
 * @returns {Array<object>} a new array
 */
export function sortRows(rows, key, direction = 'asc') {
    if (!key) return [...rows];
    const sign = direction === 'desc' ? -1 : 1;

    const byName = (a, b) => comparePresent(String(a?.name ?? ''), String(b?.name ?? ''));

    return [...rows].sort((a, b) => {
        const va = normalise(key, a?.[key]);
        const vb = normalise(key, b?.[key]);

        /*
         * Missing values sort last in BOTH directions, so this is settled before the direction
         * sign is applied. A blank is "unknown", not "smallest" -- reversing a column should not
         * promote every row that has nothing in it to the top, which is exactly what multiplying
         * this result by the sign did.
         */
        if (va === null && vb === null) return byName(a, b);
        if (va === null) return 1;
        if (vb === null) return -1;

        const primary = comparePresent(va, vb);
        if (primary !== 0) return primary * sign;

        // Tie-break on name, always ascending: flipping it with the sort direction makes groups
        // appear to shuffle when the user only meant to reverse the column they clicked.
        return byName(a, b);
    });
}

/**
 * Next sort state when a column header is clicked.
 *
 * Clicking a new column starts it ascending; clicking the active one reverses it. There is no
 * third "unsorted" state -- a user who wants the original pack order is not thinking about
 * sorting at all, and cycling through an invisible state just makes the second click feel broken.
 */
export function nextSortState(current, key) {
    if (current?.key !== key) return { key, direction: 'asc' };
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** Arrow for a column header: the active column only, pointing the way it is sorted. */
export function sortIndicator(current, key) {
    if (current?.key !== key) return '';
    return current.direction === 'desc' ? '▼' : '▲';
}
