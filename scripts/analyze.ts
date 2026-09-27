// Distribution of real decisions for one vehicle, used to choose and document thresholds.
//   npx tsx scripts/analyze.ts --vehicle ford-f150 [--top 40]
import path from "node:path";
import { VEHICLES } from "../src/data/vehicles";
import { CONTRACT } from "../src/lib/contract";
import { decisionKey, hashOf } from "../src/lib/hash";
import { appliesLines } from "../src/lib/schema";
import { DATA_DIR, FileDecisionStore, loadEvents } from "../src/lib/store";
import { derive } from "../src/lib/verdict";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const store = new FileDecisionStore(path.join(DATA_DIR, "decisions"));
const events = loadEvents();
const ids = arg("vehicle") ? [arg("vehicle")!] : VEHICLES.map((v) => v.id);
const top = Number(arg("top") ?? 40);

function hist(values: number[]) {
  const bins = Array(10).fill(0);
  for (const v of values) bins[Math.min(9, Math.floor(v * 10))]++;
  return bins.map((n, i) => `${i / 10}:${n}`).join("  ");
}

for (const id of ids) {
  const v = VEHICLES.find((x) => x.id === id)!;
  const vHash = hashOf(v.state);
  const rowsOut = [];
  for (const e of events) {
    const rec = store.get(decisionKey(vHash, e.hash, CONTRACT));
    if (!rec) continue;
    rowsOut.push({ e, d: derive(rec) });
  }
  if (!rowsOut.length) continue;
  const counts = { IGNORE: 0, WATCH: 0, INTERRUPT: 0 };
  for (const r of rowsOut) counts[r.d.verdict]++;
  console.log(`\n=== ${v.state.year} ${v.state.make} ${v.state.model} | ${rowsOut.length} decisions |`, counts);
  if (ids.length > 1) continue;
  console.log("relevance ", hist(rowsOut.map((r) => r.d.relevance)));
  console.log("attention ", hist(rowsOut.map((r) => r.d.attention)));
  console.log("interrupt ", hist(rowsOut.map((r) => r.d.interrupt)));
  rowsOut.sort((a, b) => b.d.attention - a.d.attention);
  for (const { e, d } of rowsOut.slice(0, top)) {
    const mine = appliesLines(e).filter((l) => l.toUpperCase().includes(v.state.make.toUpperCase())).slice(0, 3).join(" | ");
    console.log(
      `${d.relevance.toFixed(2)} ${d.attention.toFixed(2)} ${d.interrupt.toFixed(2)} c${d.consequence.toFixed(1)} ${d.area.padEnd(13)} ${d.verdict.padEnd(9)} ${e.type.slice(0, 6)} ${e.id.replace("nhtsa-", "")} [${mine || appliesLines(e)[0] || ""}] ${e.text.slice(0, 110)}`,
    );
  }
}
