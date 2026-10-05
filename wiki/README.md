# Hand-written wiki pages

These are the prose pages of the [project wiki](https://github.com/MattMavis/dark-heresy-2nd-vtt/wiki).
They live here, not in the wiki, so they are versioned with the code and reviewed in pull
requests like anything else.

`.github/workflows/wiki.yml` publishes the wiki on every push to `master`:

1. `node tools/generate-wiki.mjs` renders the 18 compendium packs plus `Compendium.md` and
   `_Sidebar.md`
2. every `.md` in this directory is copied in beside them
3. the result is pushed to the wiki repository

**Edit the wiki here, not on github.com.** A page edited in the wiki UI is overwritten by the
next push to `master`.

Two files are deliberately not in this directory:

- `_Sidebar.md` is generated, because it lists every compendium page and should not need a
  hand edit when a pack is added. The prose pages it links are named in `PROSE_PAGES` in
  `tools/generate-wiki.mjs` -- add a page here and add it there too.
- `Compendium.md` is the generated index.
