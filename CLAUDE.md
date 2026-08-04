# Dark Heresy 2nd Edition — Foundry VTT system

Unofficial DH2e system for Foundry VTT (author Matt Keathley, github mrkeathley/dark-heresy-2nd-vtt).
This file is a prescriptive runbook, not just background — follow these procedures directly rather
than re-deriving an approach each session.

## Session startup checklist (do this before anything else)
1. **Read this file in full first.** It already has the build gotchas, the legacy `data:` vs
   `system:` key convention, per-book PDF page offsets, and the source-tag convention. Don't
   re-derive any of this by grepping or testing — it's already answered below.
2. **`git status --short` and `git log --oneline -10`.** Establish what's committed vs. pending
   before touching anything. If there's uncommitted work you didn't create this session,
   investigate before assuming it's safe to build on top of or discard.
3. **If you're a Claude Code session with the auto-memory system enabled**, read `MEMORY.md`'s
   index, then pull any memory file tagged for this project that's relevant to the specific task
   (e.g. a status-effects plan file if resuming that work). Treat memory as a *point-in-time
   observation, not live state* — verify a cited file:line or "not yet implemented" claim against
   the current code before trusting it, especially if the memory itself carries an age warning.
4. If a plan file exists under `C:\Users\Matt\.claude\plans\` from a prior session, it may have
   been overwritten by an unrelated later task — treat memory as the durable source of truth, the
   plan file as a possibly-stale convenience copy.

## Layout
- Content YAML: `src/packs/<name>/<name>.yml`, compiled to NeDB `.db` by gulp. Item docs use the
  LEGACY top-level key `data:` (NOT `system:`) — match the existing entries in a file's style
  before adding to it. **Actor-type docs use `system:`** instead — the two doc kinds differ.
- Rules logic: `src/module/rules/*.mjs` (homeworlds, backgrounds, roles, elite-advances, combat
  rules, etc.) — check the relevant file before adding a new mechanical category, and check its
  backing pack too.
- Manifest: `src/system.json`.

## Pre-edit checks (before touching any pack or module file)
- **Never assume a book/chapter is untouched.** Run a source-tag survey first:
  `grep -rho "source: .*XX\b" src/packs/*/*.yml` (XX = tag below). This takes seconds and has
  repeatedly revealed content someone had already partially seeded without it being tracked
  anywhere. Confirmed tag convention: `CB` = Core Rulebook, `EI` = Enemies Within (**not** "EW"),
  `EB`/`EBY` = Enemies Beyond, `EO` = Enemies Without.
  **Exception**: `armour.yml`, `ammo.yml`, and `tools.yml` carry **no `source:` field at all**
  (unlike `weapons.yml`/`talents.yml`/`gear.yml`) — for those three packs a tag-only survey will
  under-report what's already there; search by item name instead.
  When a batched multi-match grep makes an entry look mis-tagged or duplicated, pull that one
  entry's full block directly before concluding there's a problem — this file format's
  `name:`/`type:` fields terminate the *preceding* data block rather than introducing the next
  one, which makes naive line-windowed greps easy to misattribute.
- **Build directory contention (EBUSY)**: Foundry may be running live against the junction
  (`G:\FoundryData\Data\systems\dark-heresy-2nd` → this repo's `build/dark-heresy-2nd`), which
  causes `gulp clean` to intermittently fail with `EBUSY: resource busy or locked`. Procedure:
  retry `npx gulp build` once (often transient); if it fails twice, `rm -rf build/dark-heresy-2nd`
  manually first, then `npx gulp build` again.

## Build & verify — exact steps, every time
1. `node --check <file>.mjs` for syntax on every touched module, before building.
2. `npx gulp build` (full build: clean → scss → copy → packs → archive), retry-once-on-EBUSY per
   above. **Never run bare `gulp packs`** — after a clean it can leave the build with no
   `system.json` ("unsupported core version" in Foundry), and `compilePacks` uses NeDB `db.insert`
   on the existing file, so repeated runs **append** — pack counts silently multiply (seen: 141
   weapons → 1128 after 8 runs).
3. Compare **per-pack** `.db` line counts before vs. after against the expected delta — not just
   the grand total, since a duplication in one pack can be masked by an unrelated change in
   another if you only check the sum:
   ```
   for f in build/dark-heresy-2nd/packs/*.db; do echo "$(basename "$f"): $(wc -l < "$f")"; done
   ```
4. For module-only changes (no pack edits), still run the build and confirm pack totals are
   unchanged — proves nothing leaked into a pack file by accident.
5. Other build-config notes: `maximum` was removed from `system.json` compatibility (was
   hard-blocking Foundry 15); `verified` is 14.365. PowerShell `Set-Content -Encoding UTF8` adds a
   BOM that no other pack file has — use node or the `Write` tool for YAML instead.

## Bulk-editing a large generated data file — exact procedure
For a structural or wide-reaching change to a file like `critical-damage.mjs` (~2400 lines, 160
entries), never hand-edit/retype it directly — transcription drift across that much prose is real
and hard to catch by eye. Instead:
1. **Load, don't retype.** From a scratch script in the session's scratchpad directory, `import`
   the live data straight from the actual file (e.g.
   `import { criticalDamage } from 'file:///G:/DarkHeresy2ndGit/dark-heresy-2nd-vtt/src/module/rules/critical-damage.mjs';`)
   — never copy-paste large text blocks by hand into a new file.
2. **Transform in memory**, then write the result to an intermediate JSON file in scratchpad
   (not the real source file yet).
3. **Verify before trusting.** Re-import the OLD committed version too (`git show <commit>:path >
   temp-old.mjs`, then import that) and assert every field that *shouldn't* have changed is
   byte-identical between old and new — only expected fields may differ. Don't proceed until this
   passes with zero unexpected diffs.
4. **Regenerate the real file from a template-string generator script** — a small script that
   reads the verified JSON and writes out the full module, preserving any unrelated helper
   functions unchanged. The same generator can then be re-run cheaply every time a later batch of
   changes needs merging in, without re-risking drift each time.
5. **Re-run the verification script against the newly generated real file** too (not just the
   intermediate JSON) — this confirms the generator itself didn't introduce a serialization bug.
6. Only after that: run the Build & verify steps above.

## Splitting content-authoring work across parallel agents — exact procedure
Use when a task has a natural partition and is too large for one focused pass (e.g. "populate
structured data for 160 table entries" split into 4 batches of ~40 by damage type):
1. Partition along a real boundary in the data (damage type, book chapter, pack category) — not
   an arbitrary line-count split.
2. Each agent gets: (a) the exact schema/shape expected, with field-by-field semantics spelled
   out, not just a type signature; (b) 2-3 **already-verified worked examples** from real, tested
   data as calibration — agents anchor far better to "here's a real example and why it's right"
   than to abstract rules alone; (c) the explicit list of any entries in their batch that are
   already done elsewhere, so they skip rather than redo/conflict; (d) an instruction to
   cross-verify against the primary source directly (page images, not just the text dump) for the
   *whole* batch, not a sample.
3. Each agent writes only to its own new file in its own scratchpad — never edits the shared
   source directly. This makes true parallelism safe (no concurrent-edit risk) at the cost of a
   merge step done centrally afterward (per the bulk-edit procedure above).
4. Every agent reports back anything it found genuinely ambiguous, with its reasoning. Collect
   these across all agents, **group by recurring pattern** (not one-by-one), and bring a small
   number (3-5) of grouped policy decisions back to the user rather than a long flat list of
   individual judgment calls.

## Primary-source verification
Numeric/text claims sourced by paraphrasing or interpreting the book (rather than copying it
directly) have been wrong roughly 1-in-15 times on this project — including once nearly halving a
weapon's damage and once inverting an availability rating. Always read the actual book page
yourself and quote effect/benefit text directly; don't trust a summary, including this file and
any prior session's catalogue/scratchpad notes.
- **Decision rule**: `pdftotext -layout` is reliable for anything that reads as a paragraph
  (talent text, power descriptions, fluff). The moment you're looking at a table with aligned
  columns (Name/Class/Range/RoF/Dam/Pen/Special/Wt/Availability), stop trusting the text dump's
  column alignment — a wrapped cell can shift values onto the wrong row — and use the `Read` tool
  directly on that PDF page number to view it as a rendered image instead.
- **PDF-to-book page offset varies by file.** Core Rulebook, Enemies Within, and Enemies Beyond
  are book page = PDF page minus 1. **Enemies Without is minus 2** (verified against page-image
  footers). Always confirm against a visible footer/header page number before citing a page you
  haven't cross-checked yet, and re-verify on any new source PDF rather than assuming the same
  offset applies.
- Before accepting any subagent's claim that names a specific number/page, or asserts "this
  doesn't exist" or "already implemented" — spend one tool call confirming it against the actual
  page image or code file. This caught real errors on this project: a false "already implemented"
  on 4 psychic powers that were actually missing, a wrong weapon damage die, and a mis-scoped "no
  Actor pack model exists" claim that turned out false on investigation.

## When to use EnterPlanMode
**Trigger**: the change touches shared/core pipeline code that every turn or every roll runs
through (the dice-roll pipeline, action-initiation gating, anything with system-wide blast
radius) — not a purely additive/opt-in feature (a new button, a new pack, a new Actor type, a new
content entry). The signal is **blast radius, not line count**: a one-line change to a shared
success/failure calculation deserves more upfront design than a 40-file content-pack addition.

**Procedure once triggered** (validated on the critical-damage-effects feature, where Phase 2
caught a real bug — a `sourceActor`/`baseChar` field-naming gap that would have silently broken
half the intended feature — before any code was written):
1. **Phase 1 — Explore.** Launch 1-3 Explore agents (parallel if the investigation has
   independent sub-questions) to ground the design in the actual current code, not assumptions.
   If a first pass leaves real gaps, run a SECOND focused Explore pass on just the gaps rather
   than guessing in the plan.
2. **Phase 2 — Plan.** Launch exactly one Plan agent with the full accumulated context (both
   Explore passes' findings, concrete file:line citations, real code snippets already found) and
   a specific list of design questions it needs to answer — not just "make a plan." Read its
   output fully; good Plan-agent output finds things you didn't ask about.
3. **Phase 3 — Sanity-check.** Read the critical files yourself to verify the plan against
   reality before finalizing — don't just trust the agent chain end to end.
4. **Phase 4 — Write the plan.** Context (why), the recommended approach only (not every
   alternative considered), named critical files, a verification section.
5. **Phase 5 — `ExitPlanMode`** to get explicit sign-off before writing any implementation code.

## Commit conventions (confirmed user preferences)
- One commit per coherent unit of work. Split unrelated concerns into separate commits even when
  found/fixed in the same session — a pre-existing bug found mid-feature gets its own commit, not
  folded into the feature's.
- Commit messages explain **why**, not just what — this project's own git history already modeled
  this style before any AI-assisted work. See commit `26e4ce5` for the reference shape: what was
  broken, why the chosen data-model change was the right one, a dedicated paragraph per unrelated
  bug found and fixed along the way, and an explicit "deliberately not done" section scoping out
  follow-up work.
- **Hold commits until explicitly asked** — even immediately after a fully verified, live-tested,
  working feature, wait for the user to say "commit."
- **Never push to `origin` without being asked**, even after committing locally.
- Trailer: `Co-Authored-By: Claude <model name> <noreply@anthropic.com>`, naming whichever model
  actually did the work that session (e.g. `Claude Sonnet 5`) — not a fixed string.
- Transparently surface your own mistakes (a misread file, a wrong initial claim) in conversation
  rather than quietly correcting them.

## Foundry-version-specific facts (this project's actual client, 14.365.0 — none of these are
guessable from source alone, found only by live-testing)
- `CONFIG.statusEffects` uses id `stun`, **not** `stunned`. `prone`/`blind`/`deaf`/`dead` all
  match the obvious guess; `stun` is the one exception. Check `CONFIG.statusEffects` directly
  before assuming an id for any new status reference.
- `ActiveEffect` document creation requires a real `name` field — `label` is a read-only
  compatibility getter that works when reading an already-constructed document, but is silently
  dropped (not an error) as raw creation data, so schema validation fails with "name: may not be
  undefined" if only `label` is passed. This codebase's existing convention *reads* effects back
  via `label` (e.g. `effect.label === 'Burning'`), so when creating one, set **both** `name` and
  `label` to the same value. This exact gap silently broke two pre-existing features before it was
  found: the Active Effects panel's name column, and a per-turn Bleeding/Burning automation hook.
- Chat-message enrichment rewrites `[[XdY]]` inline-roll syntax anywhere it appears in the
  rendered HTML of a chat message, **including inside HTML attribute values** — passing book text
  containing that syntax through a `data-*` attribute on a chat-card button corrupts the attribute
  (the injected `<a class="...">` tag's own unescaped quote prematurely closes the attribute it
  landed inside, spilling the remainder out as literal visible text). Never round-trip text
  containing `[[ ]]` syntax through a DOM attribute — pass a lookup key (type/location/amount, an
  id, etc.) and re-fetch the text server-side/in-JS from the source module instead.
- `actor.system.armour` is a real, live, per-location derived field (keyed by location name, each
  with `.value`/`.toughnessBonus`). Location-name matching needs to be whitespace-stripped and
  case-insensitive (`location.replace(/\s/g, '').toUpperCase() === name.toUpperCase()`) since
  hit-location strings sometimes carry a space ("Left Arm") that armour-object keys don't — reuse
  `_getArmourAtLocation()` in `basic-action-manager.mjs` rather than re-deriving the match logic.
- The V1→V2 ApplicationV2 sheet migration (commit `8add603`, 2026-07-28) left sheet content able
  to silently overflow with **no scrollbar at all** — `scrollable: ['']` in a sheet's `PARTS`
  config only makes ApplicationV2 remember/restore a scroll position on an element that's
  *already* a genuine CSS scroll container; it doesn't create one. Fixed by adding
  `height: 100%; overflow-y: auto;` to `.dh-wrapper` (the actual root of every sheet template) in
  `dark-heresy-2nd.scss`. If a future sheet template ever stops extending `.dh-wrapper`, this fix
  won't automatically apply to it.

## Error-isolation habit for multi-effect handlers
When one user action triggers several independent effects in sequence (e.g. one button click
applying Fatigue + Stunned + Prone + Blood Loss + a permanent injury-log entry), wrapping each
step in its own try/catch is necessary but **not sufficient** — a helper that can legitimately do
nothing (e.g. "there's no duration info on this entry, so there's nothing to apply") will resolve
without error, and a generic wrapper that treats "didn't throw" as "succeeded" will misreport that
correct no-op as a success (this shipped once: an empty Active Effects panel next to a toast
claiming two statuses were applied).
- Have the no-op-capable helper explicitly `return false` when it correctly did nothing.
- Have the calling wrapper treat that as "don't report success" — distinct from both "threw" and
  "did something." Don't conflate "didn't crash" with "did what was asked."
- Reuse the `attempt(label, fn)` pattern in `basic-action-manager.mjs` for any new handler shaped
  like this, rather than re-deriving the isolation logic.

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
