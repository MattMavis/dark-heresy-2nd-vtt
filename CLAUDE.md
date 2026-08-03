# Dark Heresy 2nd Edition — Foundry VTT system

Unofficial DH2e system for Foundry VTT (author Matt Keathley, github mrkeathley/dark-heresy-2nd-vtt).

## Layout
- Content YAML: `src/packs/<name>/<name>.yml`, compiled to NeDB `.db` by gulp. Item docs use the
  LEGACY top-level key `data:` (NOT `system:`) — match the existing entries in a file's style
  before adding to it.
- Rules logic: `src/module/rules/*.mjs` (homeworlds, backgrounds, roles, elite-advances, combat
  rules, etc.) — check the relevant file before adding a new mechanical category, and check its
  backing pack too.
- Manifest: `src/system.json`.

## Build — read this before touching any pack
Foundry loads from `G:\FoundryData\Data\systems\dark-heresy-2nd`, a Windows junction to this
repo's `build/dark-heresy-2nd` output.
- Always run `npx gulp build` (full build) after editing any pack or rules file.
- **Never run bare `gulp packs`** — after a clean it can leave no `system.json` in the output
  ("unsupported core version" in Foundry), and it APPENDS into the NeDB pack files instead of
  replacing them, silently duplicating entries on repeat runs.
- After building, verify by comparing each affected pack's `.db` line count before vs after:
  `for f in build/dark-heresy-2nd/packs/*.db; do echo "$(basename "$f"): $(wc -l < "$f")"; done`
  A count that doesn't match "prior count + what you actually added" is the signature of the
  gulp-packs duplication trap.

## Source rulebooks
PDFs live in `C:\Users\Matt\Downloads`: Core Rulebook, Enemies Within, Enemies Beyond, Enemies
Without.
- **PDF-to-book page offset varies by file — do not assume it's the same across all four.**
  Core Rulebook, Enemies Within, and Enemies Beyond are book page = PDF page minus 1. **Enemies
  Without is minus 2** (verified against multiple page-image footers 2026-07-31). Always confirm
  against a visible footer/header page number before citing a page you haven't cross-checked yet,
  especially on a book you haven't sourced from before.
- **Before treating any book or chapter as "unread"/"untouched," grep the packs for its source-tag
  abbreviation first** — e.g. `grep -rho "source: .*EO\b" src/packs/*/*.yml` for Enemies Without.
  Confirmed tag convention actually used in this repo's data (verified 2026-07-31): `CB` = Core
  Rulebook, `EI` = Enemies Within (NOT "EW"), `EB`/`EBY` = Enemies Beyond, `EO` = Enemies Without.
  Content has been seeded in prior, untracked passes before — assume nothing about what's already
  implemented until you've actually checked. When a batched multi-match grep makes an entry look
  mis-tagged or duplicated, pull that one entry's full block directly before concluding there's a
  problem — this file's `name:`/`type:` fields terminate the *preceding* data block rather than
  introducing the next one, which makes naive line-windowed greps easy to misattribute.
- `pdftotext -layout` reliably garbles multi-column stat tables — weight/availability/damage
  values can shift onto the wrong row when a cell wraps to two lines. If a table extraction looks
  inconsistent or you're not confident which row a value belongs to, use the Read tool directly
  on that PDF page number to view it as an image instead of trusting the text extraction.

## Accuracy
Numeric/text claims sourced by paraphrasing or interpreting the book (rather than copying it
directly) have been wrong roughly 1-in-15 times on this project — including once nearly halving a
weapon's damage and once inverting an availability rating. Always read the actual book page
yourself and quote effect/benefit text directly. Don't trust a summary — including this file, and
including any prior session's catalogue/scratchpad notes — for an exact number; re-derive it from
the primary source.

## GM-side subsystems
Some book sections (investigation minigames, weapon-crafting/summoning rituals, NPC-statblock
generators) are procedural rules, not fixed item/talent/power content, and don't map onto this
system's item-pack data model. Don't force these into a pack — write a short scoping note (what
it does, page range, rough size) to your scratchpad instead, and leave the implementation for a
dedicated future task.

## Reporting
Write your findings/catalogue to your scratchpad incrementally, not only at the very end — a
session cutoff should not destroy the whole report. State explicitly, per item you touch, whether
you verified-and-left-alone, fixed, added, or flagged-as-uncertain — don't blur those together.
