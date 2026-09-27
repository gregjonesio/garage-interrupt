// Compares two sets of decisions for the same pairs, to see how much Jev's
// answers move between runs on identical input.
//   npx tsx scripts/compare-runs.ts <older dir> <newer dir> [--write]
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, FileDecisionStore } from "../src/lib/store";
import { derive } from "../src/lib/verdict";

const [older, newer] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!older || !newer) {
  console.error("usage: compare-runs <older dir> <newer dir>");
  process.exit(2);
}

const a = new FileDecisionStore(older);
const b = new FileDecisionStore(newer);
let pairs = 0;
let identical = 0;
let verdictChanged = 0;
let areaChanged = 0;
let largest = 0;
const moved: string[] = [];
const bins = [0, 0, 0, 0]; // under 1 point, 1 to 5, 5 to 10, over 10

for (const rec of b.all()) {
  const old = a.get(rec.key);
  if (!old) continue;
  pairs++;
  const x = derive(old);
  const y = derive(rec);
  const diff = Math.max(
    Math.abs(x.relevance - y.relevance),
    Math.abs(x.attention - y.attention),
    Math.abs(x.interrupt - y.interrupt),
  );
  largest = Math.max(largest, diff);
  if (diff === 0 && x.consequence === y.consequence && x.area === y.area) identical++;
  bins[diff < 0.01 ? 0 : diff < 0.05 ? 1 : diff < 0.1 ? 2 : 3]++;
  if (x.area !== y.area) areaChanged++;
  if (x.verdict !== y.verdict) {
    verdictChanged++;
    if (moved.length < 20)
      moved.push(
        `${rec.vehicleId} x ${rec.eventId}: ${x.verdict} -> ${y.verdict} ` +
          `(relevance ${x.relevance.toFixed(3)} -> ${y.relevance.toFixed(3)}, attention ${x.attention.toFixed(3)} -> ${y.attention.toFixed(3)}, interrupt ${x.interrupt.toFixed(3)} -> ${y.interrupt.toFixed(3)})`,
      );
  }
}

// With --write, the counts go to data/rerun.json, which the method page reports.
if (process.argv.includes("--write")) {
  const out = {
    comparedAt: new Date().toISOString(),
    pairs,
    identical,
    stateChanged: verdictChanged,
    areaChanged,
    largestChangePoints: Math.round(largest * 100),
    changeUnder1: bins[0],
    change1to5: bins[1],
    change5to10: bins[2],
    changeOver10: bins[3],
  };
  fs.writeFileSync(path.join(DATA_DIR, "rerun.json"), JSON.stringify(out, null, 1));
}

console.log(`pairs in both runs: ${pairs}`);
console.log(`identical in every answer: ${identical}`);
console.log(`largest change in a probability: ${(largest * 100).toFixed(2)} points`);
console.log(`change under 1 point: ${bins[0]} | 1 to 5: ${bins[1]} | 5 to 10: ${bins[2]} | over 10: ${bins[3]}`);
console.log(`area changed: ${areaChanged}`);
console.log(`state changed: ${verdictChanged}`);
for (const m of moved) console.log("  " + m);
