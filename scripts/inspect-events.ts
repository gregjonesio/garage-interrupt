// Prints one sample event per type and a few size figures, for eyeballing an ingest.
import { appliesLines } from "../src/lib/schema";
import { loadEvents } from "../src/lib/store";

const events = loadEvents();
const seen = new Set<string>();
for (const e of events) {
  if (seen.has(e.type)) continue;
  seen.add(e.type);
  console.log("\n==", e.type, e.id, e.publishedAt);
  console.log("title:", e.title);
  console.log("mfr:", e.manufacturer, "| subtype:", e.subtype);
  console.log("applies:", appliesLines(e).slice(0, 5), "of", appliesLines(e).length);
  console.log("components:", e.structuredApplicability?.components?.slice(0, 4));
  console.log("facts:", e.facts);
  console.log("text:", e.text.slice(0, 300));
}
const lens = events.map((e) => e.text.length).sort((a, b) => a - b);
console.log("\ntext length median", lens[lens.length >> 1], "max", lens.at(-1), "over 6000:", lens.filter((l) => l > 6000).length);
const ap = events.map((e) => appliesLines(e).length).sort((a, b) => a - b);
console.log("applies lines median", ap[ap.length >> 1], "max", ap.at(-1), "over 60:", ap.filter((l) => l > 60).length);
const makes = new Map<string, number>();
for (const e of events) for (const v of e.structuredApplicability?.vehicles ?? []) if (/MACH|LIGHTNING|4XE/.test(v.model)) makes.set(`${v.make} ${v.model}`, (makes.get(`${v.make} ${v.model}`) ?? 0) + 1);
console.log("variant model names:", Object.fromEntries(makes));
const bad = events.filter((e) => /[�]|â€|Ã/.test(e.text)).length;
console.log("events with encoding damage:", bad);
