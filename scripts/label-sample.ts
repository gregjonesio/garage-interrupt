// Writes a sheet of vehicle x notice pairs for a person to label.
//   npx tsx scripts/label-sample.ts [--per-stratum 300]
// The labeller fills the human_label column with "relevant" or "irrelevant"
// WITHOUT looking at Jev's numbers, which are deliberately left out of the sheet.
// Strata and weights are kept so scripts/benchmark.ts can weight the results
// back to the full set of decisions.
import fs from "node:fs";
import path from "node:path";
import { VEHICLES, vehicleTitle } from "../src/data/vehicles";
import { load } from "../src/lib/site";
import { DATA_DIR } from "../src/lib/store";

const i = process.argv.indexOf("--per-stratum");
const PER = i >= 0 ? Number(process.argv[i + 1]) : 300;

// Small seeded generator so the same command always draws the same sample.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const csv = (v: string) => `"${v.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

const { site, events } = load();
type Pair = { vehicleId: string; eventIndex: number };
const strata: Record<string, Pair[]> = { reached: [], near: [], far: [] };
for (const v of VEHICLES) {
  site.cells[v.id].forEach((c, eventIndex) => {
    if (!c) return;
    const name = c[5] > 0 ? "reached" : c[0] >= 10 || c[1] >= 50 ? "near" : "far";
    strata[name].push({ vehicleId: v.id, eventIndex });
  });
}

const rand = rng(20260926);
const lines = ["stratum,weight,vehicle_id,vehicle,event_id,type,published,title,applies_to,text,source_url,human_label,labeller"];
for (const [name, pairs] of Object.entries(strata)) {
  const take = name === "reached" ? pairs.length : Math.min(PER, pairs.length);
  const pool = [...pairs];
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  const weight = pairs.length / Math.max(1, take);
  for (const p of pool.slice(0, take)) {
    const e = events[p.eventIndex];
    const v = VEHICLES.find((x) => x.id === p.vehicleId)!;
    const applies = (e.structuredApplicability?.vehicles ?? [])
      .slice(0, 12)
      .map((a) => `${a.make} ${a.model} ${a.years.join("/")}`)
      .join("; ");
    lines.push(
      [name, weight.toFixed(4), v.id, `${vehicleTitle(v)} ${v.state.trim}`, e.id, e.type, e.publishedAt.slice(0, 10), e.title ?? "", applies, e.text.slice(0, 1200), e.sourceUrl ?? "", "", ""]
        .map((x) => csv(String(x)))
        .join(","),
    );
  }
  console.log(`${name}: ${pairs.length} pairs, ${take} sampled, weight ${weight.toFixed(2)}`);
}
const dir = path.join(DATA_DIR, "labels");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `to-label-${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(file, "﻿" + lines.join("\n"));
console.log(`wrote ${lines.length - 1} rows -> ${path.relative(process.cwd(), file)}`);
