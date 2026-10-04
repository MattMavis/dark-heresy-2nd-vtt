// Every Handlebars partial a template reaches for, checked against what the system registers.
//
// This set exists because `psychic-power-table.hbs` shipped in 1.8.6.5 referenced by
// `advancement-prompt.hbs` but absent from HandlebarManager.loadTemplates(). The file was in the
// package and the reference was correct; nothing had told Handlebars the partial existed. Foundry
// only discovers that at render time, so the Spend Experience dialog died with "The partial ...
// could not be found" for every user who opened it.
//
// Nothing else in this suite renders Handlebars, so no other test can catch it. These two
// assertions are a static stand-in: a partial must be registered before it is used, and a
// registered path must point at a file that exists.
//
// Paths are `systems/dark-heresy-2nd/...`, which is how Foundry serves them at runtime; on disk
// that prefix maps to `src/`.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import { check, done } from './harness.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const PREFIX = 'systems/dark-heresy-2nd/';

/** Every file under `dir` matching `ext`, recursively. */
function walk(dir, ext, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, ext, out);
        else if (entry.endsWith(ext)) out.push(full);
    }
    return out;
}

/** `systems/dark-heresy-2nd/...` -> the file on disk under `src/`. */
const onDisk = (path) => join(SRC, path.slice(PREFIX.length));

/*
 * Partial references, as `{{> "systems/dark-heresy-2nd/..." }}` or the same unquoted. Only
 * absolute `systems/` references are collected -- a partial registered under a short name would
 * not resolve through this path at all, and the system does not use any.
 */
const referenced = new Map(); // path -> the template that reaches for it
for (const file of walk(join(SRC, 'templates'), '.hbs')) {
    const body = readFileSync(file, 'utf8');
    for (const m of body.matchAll(/\{\{>\s*"?(systems\/dark-heresy-2nd\/[^"\s}]+)/g)) {
        if (!referenced.has(m[1])) referenced.set(m[1], relative(SRC, file).split(sep).join('/'));
    }
}

/*
 * Registration sites. The global preload in handlebars-manager.mjs is the main one; a sheet may
 * also declare a partial on its own PARTS entry (armour-sheet.mjs and friends do this with
 * trait-toggle.hbs), which registers it just as well. Both count, so any `systems/...*.hbs`
 * string literal anywhere in the module source is treated as a registration.
 */
const registered = new Set();
for (const file of walk(join(SRC, 'module'), '.mjs')) {
    const body = readFileSync(file, 'utf8');
    for (const m of body.matchAll(/['"`](systems\/dark-heresy-2nd\/[^'"`]+\.hbs)['"`]/g)) {
        registered.add(m[1]);
    }
}

// 1. A partial must be registered before a template can use it.
const unregistered = [...referenced]
    .filter(([path]) => !registered.has(path))
    .map(([path, by]) => `${path.slice(PREFIX.length)} (used by ${by})`)
    .sort();
check(`every partial a template uses is registered (${referenced.size} referenced)`, unregistered, []);

// 2. A registered path must point at a file that is actually there -- catches a typo and a
//    partial that was renamed or deleted without its registration following.
const missing = [...registered]
    .filter((path) => !existsSync(onDisk(path)))
    .map((path) => path.slice(PREFIX.length))
    .sort();
check(`every registered template exists on disk (${registered.size} registered)`, missing, []);

done();
