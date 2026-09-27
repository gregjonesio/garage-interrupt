// Compares Jev's decisions with human labels and writes data/benchmark.json.
//   npx tsx scripts/benchmark.ts
// Reads every CSV in data/labels/ that has the human_label column filled in.
// Nothing is written unless real labels exist, and the site shows accuracy
// figures only when this file exists.
import fs from "node:fs";
import path from "node:path";
import { VEHICLES } from "../src/data/vehicles";
import { load } from "../src/lib/site";
import { DATA_DIR } from "../src/lib/store";

const MIN_LABELS = 200; // below this the figures are too loose to publish

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c !== "")) out.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) out.push(row);
  return out;
}

const dir = path.join(DATA_DIR, "labels");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".csv")) : [];
const { site } = load();
const eventIndex = new Map(site.events.map((e, i) => [e.id, i]));

// Weighted confusion counts. "Kept" means Jev's state was Worth knowing or Interrupt.
let relevantKept = 0;
let relevantDropped = 0;
let irrelevantKept = 0;
let irrelevantDropped = 0;
let labels = 0;
const labellers = new Set<string>();
const seen = new Set<string>();

for (const f of files) {
  const rows = parseCsv(fs.readFileSync(path.join(dir, f), "utf8"));
  const head = rows[0];
  const col = (name: string) => head.indexOf(name);
  for (const r of rows.slice(1)) {
    const label = (r[col("human_label")] ?? "").trim().toLowerCase();
    if (label !== "relevant" && label !== "irrelevant") continue;
    const vehicleId = r[col("vehicle_id")];
    const i = eventIndex.get(r[col("event_id")]);
    if (i === undefined || !VEHICLES.some((v) => v.id === vehicleId)) continue;
    const key = `${vehicleId}|${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = site.cells[vehicleId][i];
    if (!c) continue;
    const w = Number(r[col("weight")]) || 1;
    const kept = c[5] > 0;
    labels++;
    if (r[col("labeller")]) labellers.add(r[col("labeller")].trim());
    if (label === "relevant" && kept) relevantKept += w;
    else if (label === "relevant") relevantDropped += w;
    else if (kept) irrelevantKept += w;
    else irrelevantDropped += w;
  }
}

if (labels === 0) {
  console.log("No human labels found in data/labels/. Nothing written.");
  console.log("Run scripts/label-sample.ts, fill in the human_label column, then run this again.");
  process.exit(0);
}

const relevant = relevantKept + relevantDropped;
const irrelevant = irrelevantKept + irrelevantDropped;
const result = {
  computedAt: new Date().toISOString(),
  model: site.model,
  schemaVersion: site.schemaVersion,
  thresholdsVersion: site.thresholdsVersion,
  labels,
  labellers: labellers.size,
  publishable: labels >= MIN_LABELS && site.mode === "jev",
  decisions: site.stats.scored,
  // Of notices a person called relevant, the share Jev kept.
  recallOfRelevant: relevant ? relevantKept / relevant : null,
  // Of notices a person called irrelevant, the share Jev let through anyway.
  falsePositiveRate: irrelevant ? irrelevantKept / irrelevant : null,
  // Of notices a person called irrelevant, the share Jev suppressed.
  noiseSuppressed: irrelevant ? irrelevantDropped / irrelevant : null,
  weighted: { relevantKept, relevantDropped, irrelevantKept, irrelevantDropped },
};
fs.writeFileSync(path.join(DATA_DIR, "benchmark.json"), JSON.stringify(result, null, 1));
console.log(result);
if (!result.publishable) console.log(`Not publishable yet: needs at least ${MIN_LABELS} labels on real Jev decisions.`);
