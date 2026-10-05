// Set the system version in every place that carries it.
//
//     npm run version 1.8.6.7
//
// Replaces an npm script that interpolated $npm_config_next in the shell. That expanded only
// under a POSIX shell; on Windows the literal string "$npm_config_next" was written into both
// files as the version. This reads argv instead, so it behaves the same everywhere.
//
// It also rewrites the pinned version inside system.json's `download` URL, which the old script
// left to be edited by hand -- the step that shipped a v1.8.6.5 manifest pointing at a download
// that 404'd.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const version = process.argv[2];

if (!version) {
    console.error('usage: npm run version <x.y.z[.w]>');
    process.exit(1);
}
if (!/^\d+\.\d+\.\d+(\.\d+)?$/.test(version)) {
    console.error(`not a version number: ${version}`);
    process.exit(1);
}

/** Read, transform and write a JSON file, preserving two-space indent and a trailing newline. */
function edit(relative, transform) {
    const path = new URL(relative, new URL('file://' + ROOT));
    const data = JSON.parse(readFileSync(path, 'utf8'));
    transform(data);
    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    return path;
}

edit('package.json', (pkg) => {
    pkg.version = version;
});

let downloadBefore;
edit('src/system.json', (system) => {
    system.version = version;
    downloadBefore = system.download;
    // Both the tag and the filename carry the version: .../download/v<version>/dark-heresy-2nd-<version>.zip
    system.download = system.download
        .replace(/\/v\d+\.\d+\.\d+(\.\d+)?\//, `/v${version}/`)
        .replace(/dark-heresy-2nd-\d+\.\d+\.\d+(\.\d+)?\.zip$/, `dark-heresy-2nd-${version}.zip`);
});

console.log(`version   -> ${version}  (package.json, src/system.json)`);
console.log(`download  -> ${JSON.parse(readFileSync(new URL('src/system.json', new URL('file://' + ROOT)), 'utf8')).download}`);
if (downloadBefore && !/\/v\d+\.\d+\.\d+(\.\d+)?\//.test(downloadBefore)) {
    console.warn('warning: the previous download URL had no /v<version>/ segment to rewrite -- check it by hand.');
}
