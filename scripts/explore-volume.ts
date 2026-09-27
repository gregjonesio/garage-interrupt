// Measures the shape of the cached NHTSA flat files: rows, field counts, and
// how many rows have an unusable value in a column the adapters rely on.
// Used to set the layout checks in src/ingest/nhtsa/layout.ts.
//   npx tsx scripts/explore-volume.ts
import fs from "node:fs";
import path from "node:path";
import { CACHE_DIR, isoDate, rows } from "../src/ingest/nhtsa/flatfile";

const files = [
  { name: "communications", match: /^tsbs__TSBS_RECEIVED/, id: 0, date: 2 },
  { name: "recalls", match: /^rcl__FLAT_RCL_POST_2010/, id: 1, date: 15 },
  { name: "investigations", match: /^inv__FLAT_INV/, id: 0, date: 6 },
  { name: "complaints", match: /^cmpl__COMPLAINTS_RECEIVED/, id: 1, date: 15 },
];

async function main() {
  for (const f of files) {
    const file = fs.readdirSync(CACHE_DIR).find((n) => f.match.test(n));
    if (!file) continue;
    const widths = new Map<number, number>();
    let n = 0;
    let badDate = 0;
    let blankDate = 0;
    let blankId = 0;
    for await (const r of rows(path.join(CACHE_DIR, file))) {
      n++;
      widths.set(r.length, (widths.get(r.length) ?? 0) + 1);
      if (!r[f.id]) blankId++;
      if (!r[f.date]) blankDate++;
      else if (!isoDate(r[f.date])) badDate++;
    }
    console.log(`${f.name} (${file}): ${n} rows`);
    console.log("  field counts:", Object.fromEntries([...widths.entries()].sort((a, b) => b[1] - a[1])));
    console.log(`  blank id ${blankId}, blank date ${blankDate}, malformed date ${badDate}`);
  }
}
main();
