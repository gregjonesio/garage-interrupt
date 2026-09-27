# Garage Interrupt

Your car has patch notes. Garage Interrupt shows you the ones that matter.

A public showcase for Jev, the System One decision model from TypeSafe AI. NHTSA publishes a constant stream of manufacturer communications, recalls, investigations and owner complaints. Garage Interrupt asks Jev, for one specific vehicle, whether each notice is worth the owner's attention.

It is an attention filter. It does not diagnose vehicles, predict failures, or write explanations.

## The primitive

```
state + incoming event -> attention decision
```

The state is a vehicle profile. The event is a notice. Jev receives both and five typed questions, and returns probabilities. Code maps the probabilities to Ignored, Worth knowing, or Interrupt.

## How it is put together

| Part | Where | What it does |
|---|---|---|
| Sources | `src/ingest/` | `EventSource` interface. NHTSA flat files are the first implementation. |
| Events | `data/events.json` | Normalized `AutomotiveEvent` records for one date window. |
| Vehicles | `src/data/vehicles.ts` | Sixteen fictional vehicle states. |
| Questions | `src/lib/schema.ts` | The five questions, the state builder, the schema version, the pinned model. |
| Jev client | `src/lib/jev.ts` | Server and scripts only. Real mode and mock mode. |
| Decision cache | `data/decisions/*.jsonl` | One raw Jev response per vehicle and event pair. |
| Verdict | `src/lib/verdict.ts` | Deterministic thresholds. |
| Site | `src/app/` | Static pages built from the files above. Serving the site makes no Jev calls. |

The cache key is `vehicle state hash : notice content hash : contract`. The contract is a hash of the questions, the model and the shape of the state. Change a vehicle, a notice, a question or the model and that pair is decided again. Nothing else is.

## Running it

```bash
npm install
npm run dev
```

The site builds from the committed data. No key is needed to run or deploy it.

## Checks

```bash
npm run check
```

Runs lint, the type check, the tests and the release gate. `npm run build` runs the gate first, and the gate also runs inside the build itself, so a direct `next build` cannot skip it.

| Command | What it does |
|---|---|
| `npm test` | Unit tests. No network, no key. |
| `npm run verify` | The release gate on the data in `data/`. |
| `npm run audit:publication` | Looks for personal details, text aimed at a model, and secrets in what would be published. |
| `node scripts/smoke-site.mjs <address>` | Browser checks against a running build. Add `--public` for a deployed address. |

### What the release gate refuses

- A missing or empty `data/events.json`.
- A vehicle and notice pair with no decision.
- A notice whose text no longer matches its hash, so an old decision cannot show for new text.
- A decision missing any of the five answers, or with a value out of range.
- A decision made by a different model, or a stand-in decision among Jev's.
- The same pair stored twice with different answers.
- A cache file that cannot be read in full.
- An owner complaint that contains a personal detail.
- A source link that does not go to nhtsa.gov.
- Data that differs from the frozen manifest in `data/release.json`.
- A production deploy whose public address is localhost.

## Publishing a new snapshot

Run these in order. Each step stops with a message if something is wrong.

1. **Ingest.** Reads the four NHTSA files and writes `data/events.json` only if every file passes its layout check.

```bash
npm run ingest -- --from 2026-08-27 --to 2026-09-25
```

2. **Score.** The mode must be given. It skips every pair already decided.

```bash
npm run score -- --mode jev
```

3. **Document links** (optional). One request to NHTSA per notice that reached a vehicle.

```bash
npx tsx scripts/resolve-docs.ts
```

4. **Read the result.** See "Reading a run by eye" below.

5. **Audit.**

```bash
npm run audit:publication
```

6. **Freeze.** Writes `data/release.json`. The build refuses any data that does not match it.

```bash
npm run freeze
```

7. **Build, then smoke-test the preview before promoting it.**

To go back, restore `data/` from the previous commit. The three parts of a snapshot (`events.json`, `decisions/`, `release.json`) are only valid together.

### Refreshing the source files

The ingest uses the copies in `.cache/nhtsa/` (about 70 MB) when they exist. Add `--refresh` to download again. `data/window.json` records which copy was read: address, size, SHA-256 and time.

### The Jev key

| Variable | Value |
|---|---|
| `JEV_KEY_FILE` | Path to a file with an `API_KEY=...` line. |
| `TYPESAFE_API_KEY` | The key itself. Used instead of the file when set. |

The key is read by `scripts/score.ts` only. No page or component imports the client, and a test enforces that. The deployed site needs no key.

A scoring run stops early if the key is refused or the answers come from a different model. Only one scoring run can hold `data/.scoring.lock` at a time.

### After an interrupted run

```bash
npx tsx scripts/repair-cache.ts
```

Reports lines that are not valid records. With `--apply` it moves them to `.cache/quarantine/`. Score again to fill the gaps.

### Stand-in mode for development

```bash
npm run score -- --mode mock
```

Uses a keyword stand-in and writes to `data/decisions-mock/`, which git ignores. The site uses stand-in decisions only when no Jev decisions exist, labels the whole page when it does, and builds only with `ALLOW_MOCK_BUILD=1`. A stand-in build is refused on Vercel, previews included.

### Personal details

Owner complaints are free text. NHTSA redacts them, but not perfectly. The ingest leaves out any complaint whose text still contains an email address, a phone number, a full VIN, a case number or a street address, and the gate refuses a snapshot that contains one. The patterns are in `src/ingest/privacy.ts`. They cannot catch a name. Read the complaints that reach a vehicle before publishing; there are few.

### Reading a run by eye

```bash
npx tsx scripts/hits.ts
```

Lists every pair that reached a vehicle, and every pair a make, model and model-year lookup would return that Jev ignored. Read this before publishing a new run.

```bash
npx tsx scripts/analyze.ts --vehicle ford-f150
```

Shows the distribution of the three probabilities for one vehicle and its highest-ranked notices.

### Page captures

```bash
node scripts/capture.mjs http://localhost:3217
```

Writes whole-page, first-viewport and sliced captures to `.impeccable/review/` using the Edge or Chrome already installed. The social card at `src/app/opengraph-image.png` is a capture of the `/og` page; capture it again after the data changes.

## Benchmark

Accuracy has not been measured. The site says so and shows only figures that were measured: decision count, latency, tokens, cost.

```bash
npm run label-sample
```

Writes a CSV of vehicle and notice pairs to `data/labels/`, without Jev's numbers. A person fills in `human_label` with `relevant` or `irrelevant`.

```bash
npm run benchmark
```

Compares labels with decisions and writes `data/benchmark.json`. The site shows recall, false-positive rate and noise suppressed only when that file exists and holds at least 200 labels on real Jev decisions.

## Boundaries

- Outputs describe the relevance of information, never the condition of a vehicle.
- Text about a notice comes from NHTSA or from a fixed template. Jev writes nothing.
- No explanation of a Jev decision is generated.
- Owner complaints are labelled as unverified reports.
- Every notice links to its NHTSA record.

## Not built yet

- Historical replay: following one issue as complaints, communications, an investigation and a recall accumulate.
- Sources other than NHTSA, such as manufacturer release notes. The `EventSource` interface is ready for them.
- Real user vehicles and accounts.
- A database. The file cache sits behind a small `DecisionStore` interface so Postgres can replace it.

## Data

Notices are public records from the National Highway Traffic Safety Administration, Office of Defects Investigation. This project is not affiliated with NHTSA, TypeSafe AI, or any vehicle manufacturer.

No licence has been chosen for the code, and none is claimed over the notices. Complaint narratives were written by members of the public and manufacturer documents by their manufacturers. Decide the code licence and check the reuse terms for the data before the repository is made public.

## Provenance of a decision

Each record carries `provenance`. `recorded` means the code that made the call wrote the contract into the record. `attested` means the record predates that and the contract rests on the operator's statement, which the manifest must then spell out. The gate refuses attested decisions that have no stated basis. The published snapshot holds recorded decisions only.
