/**
 * The shared assertion harness for every file under `tests/`.
 *
 * Two things it does that the five copy-pasted versions it replaces did not:
 *
 *   1. `check` catches anything thrown while producing the value under test, and reports it as
 *      an ordinary FAIL. Previously an exception -- most often indexing into an array that a
 *      content edit had shrunk -- terminated the whole file, taking every later check with it
 *      and (because `npm test` chained the files with `&&`) every later file too. Pass a thunk
 *      as `got` whenever computing the value could throw; a plain value still works.
 *
 *   2. `done()` sets `process.exitCode` rather than calling `process.exit()`, so buffered stdout
 *      is flushed before the process ends. The runner (`run.mjs`) reads both the exit code and
 *      the printed tally.
 */

let pass = 0;
let fail = 0;

/**
 * @param label {string} what is being asserted, in plain English
 * @param got {*|(() => *)} the value under test, or a thunk producing it (thunks are safest --
 *        a throw inside one is reported as a FAIL instead of killing the file)
 * @param want {*} the expected value, compared by JSON round-trip
 */
export function check(label, got, want) {
    let ok = false;
    let actual;
    try {
        actual = typeof got === 'function' ? got() : got;
        ok = JSON.stringify(actual) === JSON.stringify(want);
    } catch (err) {
        actual = `threw ${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`;
        ok = false;
    }
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(want)}`);
    ok ? pass++ : fail++;
}

/** Print the tally and set the exit code. Call once, at the bottom of a test file. */
export function done() {
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
}

/** Current tally, for a test file that wants to branch on it. */
export function tally() {
    return { pass, fail };
}
