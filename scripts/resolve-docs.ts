// Adds links to NHTSA's own documents (the bulletin or recall report PDF) for
// notices that reached at least one vehicle. Links are read from NHTSA's index,
// never constructed, and only static.nhtsa.gov addresses are accepted.
//   npx tsx scripts/resolve-docs.ts
// One request per notice, one at a time, a few dozen in total.
import { VEHICLES } from "../src/data/vehicles";
import { load } from "../src/lib/site";
import { loadEvents, saveEvents } from "../src/lib/store";
import type { EventType, SourceDocument } from "../src/lib/types";

const KEY: Partial<Record<EventType, string>> = {
  manufacturer_communication: "manufacturerCommunications",
  recall: "recalls",
  investigation: "investigations",
};

const LABEL: Record<string, string> = {
  manufacturerCommunications: "Manufacturer's document",
  recalls: "Recall document",
  investigations: "Investigation document",
};

type Doc = { fileName?: string; summary?: string; url?: string };

async function main() {
  const { site } = load();
  const reached = new Set<string>();
  for (const v of VEHICLES) site.cells[v.id].forEach((c, i) => c && c[5] > 0 && reached.add(site.events[i].id));

  const events = loadEvents();
  let asked = 0;
  let found = 0;
  let failed = 0;
  for (const e of events) {
    const key = KEY[e.type];
    if (!reached.has(e.id) || !key) continue;
    asked++;
    const url =
      `https://api.nhtsa.gov/safetyIssues/byNhtsaId?nhtsaId=${encodeURIComponent(e.sourceRecordId)}` +
      `&filter=issueType&filterValue=${key}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { results?: Record<string, { associatedDocuments?: Doc[] }[]>[] };
      const docs = body.results?.[0]?.[key]?.[0]?.associatedDocuments ?? [];
      const kept: SourceDocument[] = docs
        .filter((d) => typeof d.url === "string" && d.url.startsWith("https://static.nhtsa.gov/"))
        .slice(0, 3)
        // The name is NHTSA's own description of the document, falling back to a plain label.
        .map((d) => ({ name: (d.summary ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || LABEL[key], url: d.url! }));
      if (kept.length) {
        e.documents = kept;
        found++;
      }
      console.log(`${e.id}: ${kept.length} of ${docs.length} documents`);
    } catch (err) {
      failed++;
      console.log(`${e.id}: FAILED ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  saveEvents(events);
  console.log(`asked ${asked}, with documents ${found}, failed ${failed}`);
  console.log("data/events.json changed. Run npm run freeze before building.");
  if (failed) process.exitCode = 1;
}

main();
