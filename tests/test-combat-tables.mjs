// Sweeps over the two big transcribed combat tables.
//
// Both are pure lookup data with no unit tests at all, and both are consulted mid-combat, where a
// gap shows up as a null the caller was not expecting rather than as a visible mistake. A hole in
// either is exactly the kind of thing a transcription pass introduces and nothing else notices.
// Unlike the rest of `rules/`, these two are not Foundry-free: they call `game.dh.log`. That is
// their only global, so a no-op logger is enough to exercise the lookups in plain node.
globalThis.game ??= { dh: { log() {}, warn() {}, error() {} } };

const { getHitLocationForRoll, hitLocationNames } = await import('../src/module/rules/hit-locations.mjs');
const { criticalDamage, getCriticalDamage } = await import('../src/module/rules/critical-damage.mjs');
const { check, done } = await import('./harness.mjs');

/* -------------------------------------------- */
/*  Hit locations: every 1d100 roll lands        */
/* -------------------------------------------- */

const locations = new Set(hitLocationNames());
const badRolls = [];
for (let roll = 1; roll <= 100; roll++) {
    const hit = getHitLocationForRoll(roll);
    if (!hit || !locations.has(hit)) badRolls.push(`${roll} -> ${JSON.stringify(hit)}`);
}
if (badRolls.length) console.log(`        unresolved rolls: ${badRolls.slice(0, 10).join(', ')}`);
check('every 1d100 roll maps to a known hit location', badRolls.length, 0);

/* -------------------------------------------- */
/*  Critical damage: every cell of every table   */
/* -------------------------------------------- */

// The table is damage type -> hit location -> severity 1-10. Severities above 10 deliberately
// clamp to 10, which is the one piece of behaviour here that is not just a lookup.
const table = criticalDamage();
const types = Object.keys(table);
const missing = [];
let cells = 0;

for (const type of types) {
    for (const location of Object.keys(table[type])) {
        for (let severity = 1; severity <= 10; severity++) {
            cells += 1;
            const entry = getCriticalDamage(type, location, severity);
            if (!entry || typeof entry.text !== 'string' || !entry.text.trim()) {
                missing.push(`${type}/${location}/${severity}`);
            }
        }
    }
}

console.log(`\n  (swept ${cells} critical-damage cells across ${types.length} damage types)`);
if (missing.length) console.log(`        empty cells: ${missing.slice(0, 10).join(', ')}`);
check('every critical-damage cell has text', missing.length, 0);
check('the table covers all four damage types', types.length, 4);
check('severity above 10 clamps to the 10 entry', () => {
    const [type] = types;
    const [location] = Object.keys(table[type]);
    return getCriticalDamage(type, location, 47)?.text === getCriticalDamage(type, location, 10)?.text;
}, true);
check('an unknown damage type returns null, not a throw', getCriticalDamage('Sonic', 'Head', 1), null);

done();
