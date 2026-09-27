// Repairs decision files after an interrupted run. A line that is not valid
// JSON is moved to .cache/quarantine/ and removed from the file, and the file
// is made to end with a newline so the next append cannot join two records.
// The pairs that lose their record are scored again by the next scoring run.
//   npx tsx scripts/repair-cache.ts [--mock]            (report only)
//   npx tsx scripts/repair-cache.ts [--mock] --apply
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../src/lib/store";

const apply = process.argv.includes("--apply");
const dir = path.join(DATA_DIR, process.argv.includes("--mock") ? "decisions-mock" : "decisions");
const quarantine = path.join(process.cwd(), ".cache", "quarantine");
let found = 0;

for (const name of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
  if (!name.endsWith(".jsonl")) continue;
  const file = path.join(dir, name);
  const text = fs.readFileSync(file, "utf8");
  const good: string[] = [];
  const bad: string[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      JSON.parse(line);
      good.push(line);
    } catch {
      bad.push(line);
      console.log(`${name} line ${i + 1}: not valid JSON (${line.length} characters)`);
    }
  }
  const unterminated = text.length > 0 && !text.endsWith("\n");
  if (unterminated) console.log(`${name}: no newline at the end`);
  if (!bad.length && !unterminated) continue;
  found++;
  if (!apply) continue;
  fs.mkdirSync(quarantine, { recursive: true });
  if (bad.length) fs.appendFileSync(path.join(quarantine, `${name}.${Date.now()}.txt`), bad.join("\n") + "\n");
  fs.writeFileSync(`${file}.tmp`, good.join("\n") + (good.length ? "\n" : ""));
  fs.renameSync(`${file}.tmp`, file);
  console.log(`${name}: repaired, ${bad.length} lines moved to ${path.relative(process.cwd(), quarantine)}`);
}

if (!found) console.log("Nothing to repair.");
else if (!apply) {
  console.log("\nReport only. Run again with --apply.");
  process.exitCode = 1;
} else console.log("\nRun the scoring script to fill the gaps, then freeze.");
