// Every pack document's artwork, checked against what is actually on disk.
//
// This set exists because 842 items shared 62 pictures between them: all 178 weapons were the
// same pistol, every psychic power the same blue beam. Each item now has its own image, and the
// two ways that silently regresses are a path pointing at a file that was never shipped, and two
// items drifting back onto the same picture. Both are invisible in play until someone opens a
// compendium, so both are asserted here.
//
// Paths are `systems/dark-heresy-2nd/...`, which is how Foundry serves them at runtime; on disk
// that prefix maps to `src/`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { check, done } from './harness.mjs';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const PACKS = join(SRC, 'packs');
const PREFIX = 'systems/dark-heresy-2nd/';

/*
 * Documents added after the art run, still waiting on their own icon. They keep an old shared
 * placeholder in the meantime, so they are exempt from the "generated art" and "no two share an
 * image" assertions — but ONLY by being named here, so the debt stays visible and the list is
 * expected to empty rather than grow.
 */
const AWAITING_ART = new Set([
    'traits/Shove',
    'traits/Binaric Screech',
    'traits/Dispassionate',
    'traits/Shady Deals',
    'traits/Pursuit of Justice',
]);

/* -------------------------------------------- */
/*  Read every document out of the pack YAML     */
/* -------------------------------------------- */

const docs = [];
for (const pack of readdirSync(PACKS)) {
    const dir = join(PACKS, pack);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.yml'))) {
        for (const d of yaml.loadAll(readFileSync(join(dir, file), 'utf8'))) {
            if (d && d.name) docs.push({ pack, name: d.name, img: d.img ?? '' });
        }
    }
}

check('packs yield a full set of documents', docs.length > 800, true);

/* -------------------------------------------- */
/*  1. Every document has artwork                */
/* -------------------------------------------- */

check(
    'every document has an img',
    docs.filter((d) => !d.img).map((d) => `${d.pack}/${d.name}`),
    [],
);

/* -------------------------------------------- */
/*  2. Every path resolves to a real file        */
/* -------------------------------------------- */

const missing = [];
for (const d of docs) {
    if (!d.img.startsWith(PREFIX)) continue; // core Foundry art (icons/svg/...) is not ours to ship
    if (!existsSync(join(SRC, d.img.slice(PREFIX.length)))) missing.push(`${d.pack}/${d.name} -> ${d.img}`);
}
check('every system img path exists on disk', missing, []);

/* -------------------------------------------- */
/*  3. No two documents share a picture          */
/* -------------------------------------------- */

// The whole point of the set. A duplicate here means an item quietly went back to shared art.
const byImg = new Map();
for (const d of docs) {
    if (AWAITING_ART.has(`${d.pack}/${d.name}`)) continue;
    if (!byImg.has(d.img)) byImg.set(d.img, []);
    byImg.get(d.img).push(`${d.pack}/${d.name}`);
}

// Knife is deliberately in weapons twice -- once Melee, once Thrown, both DH2 p.160 -- and the two
// share one image on purpose. Any other sharing is a regression.
const unexpected = [...byImg.entries()]
    .filter(([, list]) => list.length > 1)
    .filter(([, list]) => !(list.length === 2 && list.every((n) => n === 'weapons/Knife')))
    .map(([img, list]) => `${list.join(' + ')} -> ${img}`);

check('no two documents share the same image', unexpected, []);

/* -------------------------------------------- */
/*  4. The generated set is complete             */
/* -------------------------------------------- */

check(
    'every document uses generated art',
    docs.filter((d) => !d.img.includes('/icons/gen/') && !AWAITING_ART.has(`${d.pack}/${d.name}`)).map((d) => `${d.pack}/${d.name}`),
    [],
);

/* The exemption list must describe reality: everything on it really is still without art. */
check(
    'awaiting-art list is accurate',
    [...AWAITING_ART].filter((k) => {
        const d = docs.find((x) => `${x.pack}/${x.name}` === k);
        return !d || d.img.includes('/icons/gen/');
    }),
    [],
);

done('icons');
