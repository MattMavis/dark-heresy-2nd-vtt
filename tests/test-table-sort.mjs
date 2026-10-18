// Unit tests for table sorting in the requisition and spend-experience windows.
//
// The interesting cases are the ORDERED CATEGORIES. Availability and Craftsmanship are scales,
// not words: sorted alphabetically, Availability reads Abundant before Ubiquitous and Rare
// before Plentiful, which inverts the meaning of the column the sort exists to expose.
import { nextSortState, sortIndicator, sortRows } from '../src/module/rules/table-sort.mjs';
import { check, done } from './harness.mjs';

const names = (rows) => rows.map((r) => r.name).join(',');

// --- ordered categories ------------------------------------------------------------------
check('availability sorts by scarcity, not alphabetically',
    sortRows([
        { name: 'c', availability: 'Rare' },
        { name: 'a', availability: 'Ubiquitous' },
        { name: 'b', availability: 'Plentiful' },
    ], 'availability').map((r) => r.availability),
    ['Ubiquitous', 'Plentiful', 'Rare']);

check('availability descending runs the other way',
    sortRows([
        { name: 'a', availability: 'Ubiquitous' },
        { name: 'b', availability: 'Unique' },
    ], 'availability', 'desc')[0].availability, 'Unique');

check('craftsmanship sorts Poor to Best',
    sortRows([
        { name: 'a', craftsmanship: 'Best' },
        { name: 'b', craftsmanship: 'Poor' },
        { name: 'c', craftsmanship: 'Good' },
        { name: 'd', craftsmanship: 'Common' },
    ], 'craftsmanship').map((r) => r.craftsmanship),
    ['Poor', 'Common', 'Good', 'Best']);

// indexOf returns -1 for an unknown tier, which would otherwise beat every real one.
check('a value off the scale sorts last, not first',
    sortRows([
        { name: 'a', availability: 'Common' },
        { name: 'b', availability: 'Nonsense' },
    ], 'availability')[0].availability, 'Common');

// --- numbers and text --------------------------------------------------------------------
check('numeric columns sort numerically, not as strings',
    sortRows([{ name: 'a', cost: 100 }, { name: 'b', cost: 25 }, { name: 'c', cost: 300 }], 'cost')
        .map((r) => r.cost), [25, 100, 300]);

// Talent tiers arrive as '1'/'2'/'3' strings from the pack data.
check('numeric strings also sort numerically',
    sortRows([{ name: 'a', tier: '3' }, { name: 'b', tier: '1' }, { name: 'c', tier: '2' }], 'tier')
        .map((r) => r.tier), ['1', '2', '3']);

check('names sort case-insensitively',
    names(sortRows([{ name: 'banner' }, { name: 'Axe' }, { name: 'cudgel' }], 'name')),
    'Axe,banner,cudgel');

// --- missing values ----------------------------------------------------------------------
check('blanks sort last ascending',
    sortRows([{ name: 'a', discipline: null }, { name: 'b', discipline: 'Biomancy' }], 'discipline')[0].discipline,
    'Biomancy');

// A blank is "unknown", not "smallest" -- it should not lead the list in either direction.
check('blanks sort last descending too',
    sortRows([{ name: 'a', discipline: null }, { name: 'b', discipline: 'Biomancy' }], 'discipline', 'desc')[0].discipline,
    'Biomancy');

// --- tie-breaks --------------------------------------------------------------------------
check('equal values fall back to name order',
    names(sortRows([{ name: 'zeta', cost: 100 }, { name: 'alpha', cost: 100 }], 'cost')),
    'alpha,zeta');

check('the name tie-break stays ascending when the column is reversed',
    names(sortRows([{ name: 'alpha', cost: 100 }, { name: 'zeta', cost: 100 }], 'cost', 'desc')),
    'alpha,zeta');

check('no key leaves the order alone',
    names(sortRows([{ name: 'c' }, { name: 'a' }], null)), 'c,a');

const original = [{ name: 'c' }, { name: 'a' }];
sortRows(original, 'name');
check('the input array is not mutated', names(original), 'c,a');

// --- header state ------------------------------------------------------------------------
check('clicking a new column starts it ascending',
    nextSortState({ key: 'name', direction: 'desc' }, 'cost').direction, 'asc');
check('clicking the active column reverses it',
    nextSortState({ key: 'cost', direction: 'asc' }, 'cost').direction, 'desc');
check('and reverses back',
    nextSortState({ key: 'cost', direction: 'desc' }, 'cost').direction, 'asc');
check('clicking from no sort at all works',
    nextSortState(null, 'name').key, 'name');

check('only the active column shows an arrow',
    sortIndicator({ key: 'cost', direction: 'asc' }, 'cost'), '▲');
check('an inactive column shows nothing',
    sortIndicator({ key: 'cost', direction: 'asc' }, 'name'), '');
check('descending shows a down arrow',
    sortIndicator({ key: 'cost', direction: 'desc' }, 'cost'), '▼');

done();
