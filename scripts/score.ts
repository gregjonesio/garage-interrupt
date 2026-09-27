// Score every vehicle x notice pair that is not already in the cache.
//   JEV_KEY_FILE=<path> npx tsx scripts/score.ts --mode jev [--limit N] [--vehicle id]
//   npx tsx scripts/score.ts --mode mock
// The mode must be given. There is no default, so a missing setting can never
// quietly produce stand-in decisions. Stand-in decisions go to their own directory.
import fs from "node:fs";
import path from "node:path";
import { VEHICLES } from "../src/data/vehicles";
import { CONTRACT } from "../src/lib/contract";
import { decisionKey, hashOf } from "../src/lib/hash";
import { askJev, type JevMode } from "../src/lib/jev";
import { SCHEMA_VERSION } from "../src/lib/schema";
import { DATA_DIR, FileDecisionStore, loadEvents } from "../src/lib/store";
import type { DecisionRecord } from "../src/lib/types";
import { answerProblems } from "../src/lib/validate";

const CONCURRENCY = 12;
const GAP_MS = 70; // one call start every 70 ms is about 860 requests a minute; retries wait in the same queue
const LOCK = path.join(DATA_DIR, ".scoring.lock");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const mode = arg("mode") as JevMode | undefined;
  if (mode !== "jev" && mode !== "mock") {
    console.error("usage: score --mode jev|mock [--limit N] [--vehicle id]");
    process.exit(2);
  }

  // Two runs at once would pay for the same calls twice and could store conflicting answers.
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    fs.writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}`, { flag: "wx" });
  } catch {
    console.error(`Another scoring run holds ${LOCK} (${fs.readFileSync(LOCK, "utf8")}). Remove the file if that run is dead.`);
    process.exit(2);
  }
  const release = () => fs.rmSync(LOCK, { force: true });
  process.on("exit", release);
  process.on("SIGINT", () => process.exit(130));

  const dir = path.join(DATA_DIR, mode === "jev" ? "decisions" : "decisions-mock");
  const store = new FileDecisionStore(dir);
  const events = loadEvents();
  if (!events.length) {
    console.error("data/events.json is missing or empty. Run the ingest first.");
    process.exit(2);
  }
  const onlyVehicle = arg("vehicle");
  const limit = arg("limit") ? Number(arg("limit")) : Infinity;
  const vehicles = VEHICLES.filter((v) => !onlyVehicle || v.id === onlyVehicle);

  type Job = { v: (typeof VEHICLES)[number]; vHash: string; e: (typeof events)[number]; key: string };
  const jobs: Job[] = [];
  const queued = new Set<string>();
  let cached = 0;
  let shared = 0;
  for (const v of vehicles) {
    const vHash = hashOf(v.state);
    for (const e of events) {
      const key = decisionKey(vHash, e.hash, CONTRACT);
      const hit = store.get(key);
      // A cached record is only a hit if it is usable and was made in this mode.
      if (hit && hit.mode === mode && !answerProblems(hit.raw).length) cached++;
      // Two notices with identical content share one decision. Asking twice could store two different answers.
      else if (queued.has(key)) shared++;
      else {
        queued.add(key);
        jobs.push({ v, vHash, e, key });
      }
    }
  }
  const expected = vehicles.length * events.length;
  const todo = jobs.slice(0, limit);
  console.log(`mode ${mode} | contract ${CONTRACT} | ${vehicles.length} vehicles x ${events.length} notices = ${expected} pairs`);
  console.log(`cached ${cached} | to score now ${todo.length}${todo.length < jobs.length ? ` (limited from ${jobs.length})` : ""}`);

  let done = 0;
  let failed = 0;
  let calls = 0;
  let tokens = 0;
  let stop: string | null = null;
  const errors: string[] = [];
  const started = Date.now();
  let next = 0;

  let slot = Date.now();
  async function pace() {
    const now = Date.now();
    slot = Math.max(slot + GAP_MS, now);
    if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
  }

  async function worker() {
    while (next < todo.length && !stop) {
      const job = todo[next++];
      await pace();
      const r = await askJev(job.v.state, job.e, mode!);
      calls += r.attempts;
      if (!r.ok) {
        failed++;
        if (errors.length < 10) errors.push(`${job.v.id} x ${job.e.id}: ${r.error}`);
        if (r.fatal) stop = r.error;
        continue;
      }
      const record: DecisionRecord = {
        key: job.key,
        vehicleId: job.v.id,
        eventId: job.e.id,
        vehicleHash: job.vHash,
        eventHash: job.e.hash,
        schemaVersion: SCHEMA_VERSION,
        contract: CONTRACT,
        provenance: "recorded",
        mode: r.mode,
        model: r.raw.model,
        ms: r.ms,
        inputTokens: r.raw.usage?.input_tokens ?? null,
        decidedAt: new Date().toISOString(),
        raw: r.raw,
      };
      store.put(record);
      tokens += record.inputTokens ?? 0;
      done++;
      if (done % 250 === 0) console.log(`  ${done}/${todo.length} scored, ${failed} failed`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const have = cached + done + shared;
  if (shared) console.log(`${shared} pairs share a decision with a notice of identical content`);
  console.log(`scored ${done} in ${secs}s | failed ${failed} | calls made ${calls} | input tokens on stored decisions ${tokens}`);
  console.log(`cost of stored decisions at list price $${((tokens / 1e6) * 0.042).toFixed(4)}; failed and retried calls may also have been billed`);
  console.log(`coverage ${have}/${expected} pairs`);
  if (stop) console.log(`STOPPED EARLY: ${stop}`);
  for (const e of errors) console.log("  error:", e);
  if (done) console.log("Next: npm run freeze. The build refuses a snapshot that has not been frozen.");
  // A run that leaves pairs unscored must not look like success.
  if (failed > 0 || stop || (limit === Infinity && have !== expected)) process.exitCode = 1;
}

main();
