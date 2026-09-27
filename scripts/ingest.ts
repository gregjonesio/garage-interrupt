// Build data/events.json from the official sources for one date window.
//   npx tsx scripts/ingest.ts --from 2026-08-27 --to 2026-09-25 [--refresh]
// Nothing is written unless every source passes its layout check. Files are
// written to a temporary name and renamed, so a failed run leaves the last
// good snapshot in place.
import fs from "node:fs";
import path from "node:path";
import { nhtsaSources } from "../src/ingest/nhtsa";
import { DATA_DIR, loadEvents } from "../src/lib/store";
import type { AutomotiveEvent } from "../src/lib/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function writeAtomic(file: string, content: string) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

async function main() {
  const from = arg("from");
  const to = arg("to");
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !iso.test(from) || !iso.test(to) || from > to) {
    console.error("usage: ingest --from YYYY-MM-DD --to YYYY-MM-DD [--refresh]");
    process.exit(2);
  }
  const refresh = process.argv.includes("--refresh");
  const previous = new Map(loadEvents().map((e) => [e.id, e]));

  const all: AutomotiveEvent[] = [];
  const sources = [];
  const problems: string[] = [];
  for (const s of nhtsaSources(refresh)) {
    const got = await s.collect({ from, to });
    console.log(`${s.name}: ${got.events.length} events from ${got.rowsRead} rows`, got.leftOut);
    problems.push(...got.problems);
    // A source that returns nothing for the window is a failure, not a quiet month.
    if (got.events.length === 0) problems.push(`${s.id} returned no events for the window`);
    all.push(...got.events);
    sources.push({ id: s.id, name: s.name, rule: s.rule, events: got.events.length, rowsRead: got.rowsRead, leftOut: got.leftOut, file: got.file });
  }

  const ids = new Set<string>();
  for (const e of all) {
    if (ids.has(e.id)) problems.push(`duplicate event id ${e.id}`);
    ids.add(e.id);
  }

  if (problems.length) {
    console.error("\nNothing was written. Problems:");
    for (const p of problems) console.error("  " + p);
    process.exit(1);
  }

  // Carry over what later steps added to a notice, when the notice itself is unchanged.
  let changed = 0;
  let added = 0;
  for (const e of all) {
    const old = previous.get(e.id);
    if (!old) added++;
    else if (old.hash !== e.hash) changed++;
    else if (old.documents) e.documents = old.documents;
  }
  const removed = [...previous.keys()].filter((id) => !ids.has(id)).length;

  all.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  writeAtomic(path.join(DATA_DIR, "events.json"), JSON.stringify(all, null, 1));
  writeAtomic(
    path.join(DATA_DIR, "window.json"),
    JSON.stringify({ from, to, ingestedAt: new Date().toISOString(), sources }, null, 1),
  );
  console.log(`\ntotal ${all.length} events -> data/events.json`);
  console.log(`against the previous snapshot: ${added} new, ${changed} changed, ${removed} removed`);
  console.log("Next: score, then freeze. The build refuses a snapshot that has not been frozen.");
}

main();
