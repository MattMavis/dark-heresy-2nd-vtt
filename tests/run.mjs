/**
 * Runs every test file and reports all of them, then exits non-zero if any failed.
 *
 * This replaces the old `node a.mjs && node b.mjs && ...` chain in package.json. Under `&&` the
 * first failing file stopped the run, so a single broken unit assertion in the first file meant
 * the content sweeps -- the most valuable tests in this suite, the ones that catch a talent grant
 * naming something the packs do not have -- never executed at all. Every file runs here,
 * regardless of what the ones before it did.
 *
 * A file that produces no tally line (a crash on import, a syntax error, a `process.exit` from
 * somewhere unexpected) is reported as CRASHED and fails the run; it is not silently counted as
 * zero passes.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const FILES = [
    'test-advancement.mjs',
    'test-ledger.mjs',
    'test-grants.mjs',
    'test-starting-equipment.mjs',
    'test-character-creation.mjs',
    'test-psyker-grant.mjs',
    'test-prerequisites.mjs',
    'test-psychic-powers.mjs',
    'test-combat-tables.mjs',
    'test-icons.mjs',
    'test-templates.mjs',
];

const rule = (s) => `${'='.repeat(78)}\n  ${s}\n${'='.repeat(78)}`;

const results = [];
for (const file of FILES) {
    console.log(`\n${rule(file)}`);
    const run = spawnSync(process.execPath, [join(HERE, file)], { encoding: 'utf8' });
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);

    const tally = (run.stdout ?? '').match(/(\d+) passed, (\d+) failed/);
    results.push({
        file,
        pass: tally ? Number(tally[1]) : 0,
        fail: tally ? Number(tally[2]) : 0,
        crashed: !tally || run.status === null,
        status: run.status,
    });
}

console.log(`\n${rule('summary')}`);
let totalPass = 0;
let totalFail = 0;
let broken = 0;
for (const r of results) {
    totalPass += r.pass;
    totalFail += r.fail;
    if (r.crashed) {
        broken++;
        console.log(`  CRASHED  ${r.file.padEnd(32)} (no tally printed; exit ${r.status})`);
    } else {
        const verdict = r.fail ? 'FAIL' : 'ok  ';
        console.log(`  ${verdict}     ${r.file.padEnd(32)} ${String(r.pass).padStart(4)} passed, ${r.fail} failed`);
    }
}
console.log(`\n  ${results.length} files, ${totalPass} passed, ${totalFail} failed${broken ? `, ${broken} crashed` : ''}`);

process.exitCode = totalFail || broken ? 1 : 0;
