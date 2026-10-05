// Assertions about `tools/generate-wiki.mjs` -- the script that turns the compendium pack YAML
// into the markdown pages published on the project's GitHub wiki.
//
// These four checks exist for four different failure modes:
//
//   1. Determinism. A planned CI job regenerates this output and diffs it against what is
//      checked into the wiki repo to catch pages going stale. That only works if the same input
//      produces byte-identical output every time, so this runs the generator twice into two
//      independent temp directories and diffs every file between them.
//
//   2. Coverage. The cheapest possible proof the generator actually read every document in a
//      pack and did not silently drop one: the number of data rows in a generated page must
//      match the number of `name:` entries in that pack's source YAML.
//
//   3. Table integrity. A cell that leaked an unescaped `|` would split a markdown table row
//      without raising any error -- the one way this generator could go visibly wrong on GitHub
//      without crashing here. Checked by requiring every data row to carry the same number of
//      unescaped pipes as its table's header row.
//
//   4. The index. Compendium.md is the one page that claims to describe every other page, so
//      it is checked against the actual set of generated pages and counts, not against itself.
//
//   5. The sidebar's prose links. _Sidebar.md is generated, but it links the hand-written pages
//      in `wiki/` as well as the generated ones, and nothing in the generator produces those --
//      so the two can drift. A PROSE_PAGES entry with no file behind it is a dead sidebar link;
//      a file in `wiki/` missing from PROSE_PAGES is a page nothing navigates to.
//
//   6. Wiki-link collision. Foundry inline-roll syntax (`[[@pr/2]]`, `[[1d10]]`) is byte-identical
//      to GitHub's wiki-link syntax, so pack text carrying a formula renders as a link to a page
//      called "@pr/2" unless the generator rewrites it. 31 psychic power and ammunition cells hit
//      this. Only the index and the sidebar should contain `[[` at all; a pack page never should.
//
// This spawns the real CLI (`node tools/generate-wiki.mjs <dir>`) rather than importing the
// script, matching how it is actually invoked; generate-wiki.mjs is a program, not a library, and
// exports nothing to import.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from './harness.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const GENERATOR = join(ROOT, 'tools', 'generate-wiki.mjs');
const PACKS_DIR = join(ROOT, 'src', 'packs');

function generateInto(outDir) {
    const result = spawnSync(process.execPath, [GENERATOR, outDir], { encoding: 'utf8', cwd: ROOT });
    if (result.status !== 0) throw new Error(`generator exited ${result.status}\n${result.stderr}`);
}

function readAllFiles(dir) {
    const files = {};
    for (const name of readdirSync(dir)) files[name] = readFileSync(join(dir, name), 'utf8');
    return files;
}

// 'mental-disorders' -> 'Mental-Disorders', mirroring the generator's own pageName().
function pageNameOf(packDir) {
    return packDir
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('-');
}

// Pipes escaped by the generator are written as the two characters `\|`; anything left after
// removing every such pair is a delimiter -- or, if a cell leaked one, an extra delimiter.
function countUnescapedPipes(line) {
    return (line.replace(/\\\|/g, '').match(/\|/g) ?? []).length;
}

const dirA = mkdtempSync(join(tmpdir(), 'dh2e-wiki-a-'));
const dirB = mkdtempSync(join(tmpdir(), 'dh2e-wiki-b-'));

try {
    generateInto(dirA);
    generateInto(dirB);
    const filesA = readAllFiles(dirA);
    const filesB = readAllFiles(dirB);

    /* -------------------------------------------------------------------------------------- */
    /*  1. Determinism                                                                          */
    /* -------------------------------------------------------------------------------------- */

    check('both runs produce the same set of files', Object.keys(filesA).sort(), Object.keys(filesB).sort());

    const differingFiles = Object.keys(filesA)
        .filter((name) => name in filesB)
        .filter((name) => filesA[name] !== filesB[name]);
    check('every file is byte-identical across two independent runs', differingFiles, []);

    /* -------------------------------------------------------------------------------------- */
    /*  2. Every pack with documents produces a page, with the right document count            */
    /* -------------------------------------------------------------------------------------- */

    const packDirs = readdirSync(PACKS_DIR);
    const expectedCounts = {};
    for (const dir of packDirs) {
        const yamlText = readFileSync(join(PACKS_DIR, dir, `${dir}.yml`), 'utf8');
        expectedCounts[dir] = (yamlText.match(/^name: /gm) ?? []).length;
    }
    // Sanity check on the check itself: if this were ever 0, the per-pack assertions below would
    // pass vacuously instead of proving anything.
    check(
        'every pack directory under src/packs has at least one document (sanity check on the counting method)',
        Object.values(expectedCounts).some((n) => n === 0),
        false,
    );

    for (const dir of packDirs) {
        const filename = `${pageNameOf(dir)}.md`;
        check(`${filename} was generated for src/packs/${dir}`, filename in filesA, true);
        if (!(filename in filesA)) continue;

        const lines = filesA[filename].split('\n');
        if (dir !== 'tables') {
            // Every normal pack page is exactly one table: a header line, a divider line, then
            // one data row per document. Lines starting "| " that are not the divider give the
            // row count directly.
            const dataRows = lines.filter((l) => l.startsWith('| ') && !l.startsWith('| ---')).length - 1; // minus the header row
            check(`${filename} has one table row per document (${expectedCounts[dir]} expected)`, dataRows, expectedCounts[dir]);
        } else {
            // Tables.md renders a Roll/Result sub-table per RollTable rather than one row per
            // document, so its row count does not reduce to the document count the same way --
            // it states its own document count in the generated note instead, which this checks
            // against the same `^name: ` count used for every other pack.
            const stated = Number((filesA[filename].match(/^\*(\d+) documents?,/m) ?? [])[1]);
            check(`${filename} states the same document count as src/packs/tables/tables.yml`, stated, expectedCounts[dir]);
        }
    }

    /* -------------------------------------------------------------------------------------- */
    /*  3. No table row is broken by an unescaped pipe                                          */
    /* -------------------------------------------------------------------------------------- */

    // Note on coverage: the current pack YAML contains zero literal `|` characters anywhere (a
    // grep across every src/packs/*.yml confirms it), so this cannot catch the escaping code path
    // actually firing on real data today -- it is a structural guarantee for whenever one shows
    // up, not evidence the substitution itself is exercised right now.
    const brokenRows = [];
    for (const [filename, content] of Object.entries(filesA)) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (!lines[i].startsWith('| ---')) continue; // found a divider row -> lines[i - 1] is its header
            const headerPipes = countUnescapedPipes(lines[i - 1]);
            for (let j = i + 1; j < lines.length && lines[j].startsWith('|'); j++) {
                if (countUnescapedPipes(lines[j]) !== headerPipes) brokenRows.push(`${filename}:${j + 1}`);
            }
        }
    }
    check('every table row has the same unescaped-pipe count as its header (an unescaped `|` in a cell would change it)', brokenRows, []);

    /* -------------------------------------------------------------------------------------- */
    /*  4. Compendium.md accurately indexes every generated page                               */
    /* -------------------------------------------------------------------------------------- */

    const compendium = filesA['Compendium.md'];
    const linkedTitles = [...compendium.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]).sort();
    const generatedTitles = Object.keys(filesA)
        .filter((name) => name.endsWith('.md') && name !== 'Compendium.md' && name !== '_Sidebar.md')
        .map((name) => name.slice(0, -'.md'.length))
        .sort();
    check('Compendium.md links to every generated pack page (and no others)', linkedTitles, generatedTitles);

    let sumOfPerPackCounts = 0;
    for (const m of compendium.matchAll(/— (\d+) documents?$/gm)) sumOfPerPackCounts += Number(m[1]);
    const statedTotal = Number((compendium.match(/\*\*Total: (\d+) documents? across \d+ packs\.\*\*/) ?? [])[1]);
    check('Compendium.md\'s stated total equals the sum of its own per-pack counts', statedTotal, sumOfPerPackCounts);

    /*
     * The generated sidebar links the hand-written pages too, from PROSE_PAGES in the generator.
     * Nothing generates those pages, so the list and the directory are maintained by hand and
     * can drift apart in either direction. Both directions are a real defect, so both are
     * checked: Home.md and this directory's own README are navigation and scaffolding rather
     * than wiki content, so neither is expected in PROSE_PAGES.
     */
    const NOT_IN_SIDEBAR = new Set(['Home', 'README']);

    const generatorSource = readFileSync(join(ROOT, 'tools', 'generate-wiki.mjs'), 'utf8');
    const proseBlock = (generatorSource.match(/const PROSE_PAGES = \[([\s\S]*?)\];/) ?? [])[1];
    check('the test can still find the PROSE_PAGES declaration', typeof proseBlock, 'string');
    const prosePages = [...(proseBlock ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const sidebar = readFileSync(join(dirA, '_Sidebar.md'), 'utf8');

    const proseFiles = readdirSync(join(ROOT, 'wiki'))
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.slice(0, -'.md'.length))
        .filter((title) => !NOT_IN_SIDEBAR.has(title))
        .sort();

    // PROSE_PAGES carries display titles with spaces; the files are hyphenated.
    const proseAsFilenames = prosePages.map((title) => title.replace(/ /g, '-')).sort();
    check('every page in wiki/ is linked from the sidebar, and every sidebar prose link has a file', proseAsFilenames, proseFiles);

    const unlinked = prosePages.filter((title) => !sidebar.includes(`[[${title}]]`));
    check('the generated sidebar actually renders a link for each prose page', unlinked, []);

    /*
     * Compendium.md and _Sidebar.md are navigation and are made of wiki links; every other page
     * is generated from pack text, where a `[[` can only have come from Foundry inline-roll
     * syntax that escaped the rewrite in cellText.
     */
    const pagesWithStrayLinks = readdirSync(dirA)
        .filter((name) => name.endsWith('.md') && name !== 'Compendium.md' && name !== '_Sidebar.md')
        .filter((name) => readFileSync(join(dirA, name), 'utf8').includes('[['))
        .sort();
    check('no generated pack page contains raw [[ ]] that GitHub would read as a wiki link', pagesWithStrayLinks, []);
} finally {
    rmSync(dirA, { recursive: true, force: true });
    rmSync(dirB, { recursive: true, force: true });
}

done();
