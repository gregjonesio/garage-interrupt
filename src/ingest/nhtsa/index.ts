// NHTSA Office of Defects Investigation, four record types, from the official
// flat files. Each record links to its page on nhtsa.gov by NHTSA ID.
import fs from "node:fs";
import path from "node:path";
import { identifyingDetails } from "../privacy";
import { ApplicabilityBuilder, finalize, inWindow, type Collected, type EventSource, type Window } from "../source";
import type { AutomotiveEvent } from "../../lib/types";
import {
  CACHE_DIR,
  cleanText,
  fetchFlatFile,
  isoDate,
  LayoutCheck,
  modelYear,
  rows,
  type Layout,
  type SourceFile,
} from "./flatfile";

const recordPage = (id: string) => `https://www.nhtsa.gov/recalls?nhtsaId=${encodeURIComponent(id)}`;

// Field positions and counts are from NHTSA's definition files, and were
// confirmed against every row of the files of 2026-09-26.
export const LAYOUTS: Record<string, Layout> = {
  communications: { name: "manufacturer communications", fields: 14, id: { index: 0, pattern: /^\d{6,9}$/ }, date: { index: 2, mayBeBlank: false }, make: 7 },
  recalls: { name: "recalls", fields: 29, id: { index: 1, pattern: /^\d{2}[A-Z][0-9A-Z]{3}\d{3}$/ }, date: { index: 15, mayBeBlank: false }, make: 2 },
  investigations: { name: "investigations", fields: 11, id: { index: 0, pattern: /^[A-Z]{1,2}\d{1,2}[A-Z]?-?\d{2,4}[A-Z]?$/ }, date: { index: 6, mayBeBlank: true }, make: 1 },
  complaints: { name: "owner complaints", fields: 51, id: { index: 1, pattern: /^\d{6,9}$/ }, date: { index: 15, mayBeBlank: false }, make: 3 },
};

// NHTSA splits the large files into five-year chunks and names the newest one
// for the years it holds so far, so the current chunk's name changes over time.
async function chunkFor(dir: string, prefix: string, year: number, refresh: boolean): Promise<SourceFile> {
  const start = Math.floor(year / 5) * 5;
  const names = [];
  for (let end = start + 4; end >= year; end--) names.push(`${prefix}_${start}-${end}.zip`);
  if (!refresh) {
    for (const n of names) {
      if (fs.existsSync(path.join(CACHE_DIR, `${dir}__${n}`))) return fetchFlatFile(`${dir}/${n}`);
    }
  }
  let last: unknown;
  for (const n of names) {
    try {
      return await fetchFlatFile(`${dir}/${n}`, { refresh });
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const COMM_TYPES: Record<string, string> = {
  "Service Bulletin/Repair Instructions": "Service bulletin",
  "Over The Air": "Over-the-air update notice",
  "Warranty Program/Extension": "Warranty program",
  "Service Campaign": "Service campaign",
  Emissions: "Emissions communication",
  Other: "Manufacturer communication",
};

type Base = Omit<AutomotiveEvent, "hash" | "structuredApplicability">;
type Draft = { base: Base; applies: ApplicabilityBuilder };

const put = (facts: Record<string, string>, key: string, value: string | undefined) => {
  const v = cleanText(value);
  if (v) facts[key] = v;
};

// Reads one file. A record spans several rows (one per product and component);
// the first row in the window opens the record and every row adds to what it applies to.
async function collect(
  file: SourceFile,
  layout: Layout,
  w: Window,
  read: {
    id: (r: string[]) => string;
    date: (r: string[]) => string | null;
    skip?: (r: string[]) => string | null; // a reason to leave the row out, or null
    open: (r: string[], id: string, date: string) => Base;
    vehicle: (r: string[]) => [string, string, number | null];
    component: (r: string[]) => string;
    leaveOut?: (base: Base) => string | null; // a reason to leave the whole record out, or null
  },
): Promise<Collected> {
  const check = new LayoutCheck(layout);
  const drafts = new Map<string, Draft>();
  const leftOut: Record<string, number> = {};
  const note = (reason: string) => (leftOut[reason] = (leftOut[reason] ?? 0) + 1);

  for await (const r of rows(file.path, check)) {
    if (r.length !== layout.fields) continue;
    const date = read.date(r);
    if (!inWindow(date, w)) continue;
    const skipped = read.skip?.(r);
    if (skipped) continue;
    const id = read.id(r);
    if (!drafts.has(id)) drafts.set(id, { base: read.open(r, id, date!), applies: new ApplicabilityBuilder() });
    const d = drafts.get(id)!;
    d.applies.addVehicle(...read.vehicle(r));
    d.applies.addComponent(read.component(r));
  }

  const events: AutomotiveEvent[] = [];
  for (const d of drafts.values()) {
    if (!d.base.text) {
      note("no text");
      continue;
    }
    const reason = read.leaveOut?.(d.base);
    if (reason) {
      note(reason);
      continue;
    }
    events.push(finalize({ ...d.base, structuredApplicability: d.applies.build() }));
  }
  const { path: _local, ...published } = file;
  void _local;
  return { events, file: published, rowsRead: check.rows, leftOut, problems: check.problems() };
}

export function communications(refresh = false): EventSource {
  return {
    id: "nhtsa-communications",
    name: "NHTSA Manufacturer Communications",
    rule: "Every manufacturer communication NHTSA added to its file in the window, all manufacturers.",
    async collect(w: Window) {
      const file = await chunkFor("tsbs", "TSBS_RECEIVED", Number(w.to.slice(0, 4)), refresh);
      return collect(file, LAYOUTS.communications, w, {
        id: (r) => r[0],
        date: (r) => isoDate(r[2]),
        open: (r, id, date) => {
          const docId = cleanText(r[3]);
          const kind = COMM_TYPES[r[6]] ?? "Manufacturer communication";
          const facts: Record<string, string> = {};
          put(facts, "Manufacturer document number", docId);
          put(facts, "Date of the communication", isoDate(r[4]) ?? "");
          put(facts, "Manufacturer campaign or software version", r[5]);
          put(facts, "Manufacturer component system", [cleanText(r[11]), cleanText(r[12])].filter(Boolean).join(" / "));
          return {
            id: `nhtsa-mc-${id}`,
            source: "NHTSA Manufacturer Communications",
            sourceRecordId: id,
            type: "manufacturer_communication",
            subtype: r[6] || undefined,
            manufacturer: cleanText(r[7]) || undefined,
            publishedAt: date,
            title: docId ? `${kind} ${docId}` : kind,
            text: cleanText(r[13]),
            facts,
            sourceUrl: recordPage(id),
          };
        },
        vehicle: (r) => [cleanText(r[7]), cleanText(r[8]), modelYear(r[9])],
        component: (r) => cleanText(r[10]),
      });
    },
  };
}

export function recalls(refresh = false): EventSource {
  return {
    id: "nhtsa-recalls",
    name: "NHTSA Recalls",
    rule: "Every recall NHTSA received in the window: vehicles, equipment, tires and child seats.",
    async collect(w: Window) {
      const file = await fetchFlatFile("rcl/FLAT_RCL_POST_2010.zip", { refresh });
      return collect(file, LAYOUTS.recalls, w, {
        id: (r) => r[1],
        date: (r) => isoDate(r[15]),
        open: (r, id, date) => {
          const facts: Record<string, string> = {};
          put(facts, "Consequence stated in the recall", r[20]);
          put(facts, "Remedy stated in the recall", r[21]);
          put(facts, "Notes", r[22]);
          put(facts, "Potentially affected units", r[11]);
          put(facts, "Manufacturer campaign number", r[5]);
          if (r[27] === "Yes") facts["Do-not-drive advisory in the recall"] = "Yes";
          if (r[28] === "Yes") facts["Park-outside advisory in the recall"] = "Yes";
          return {
            id: `nhtsa-rcl-${id}`,
            source: "NHTSA Recalls",
            sourceRecordId: id,
            type: "recall",
            subtype: { V: "Vehicle", E: "Equipment", T: "Tire", C: "Child seat", I: "Incomplete vehicle" }[r[10]] ?? undefined,
            manufacturer: cleanText(r[7]) || undefined,
            publishedAt: date,
            title: `Recall ${id}: ${cleanText(r[6])}`,
            text: cleanText(r[19]),
            facts,
            sourceUrl: recordPage(id),
          };
        },
        vehicle: (r) => [cleanText(r[2]), cleanText(r[3]), modelYear(r[4])],
        component: (r) => cleanText(r[6]),
      });
    },
  };
}

export function investigations(refresh = false): EventSource {
  return {
    id: "nhtsa-investigations",
    name: "NHTSA Investigations",
    rule: "Every defect investigation NHTSA opened in the window.",
    async collect(w: Window) {
      const file = await fetchFlatFile("inv/FLAT_INV.zip", { refresh });
      return collect(file, LAYOUTS.investigations, w, {
        id: (r) => r[0],
        date: (r) => isoDate(r[6]),
        open: (r, id, date) => {
          const facts: Record<string, string> = {};
          put(facts, "Date closed", isoDate(r[7]) ?? "");
          put(facts, "Related recall", r[8]);
          return {
            id: `nhtsa-inv-${id}`,
            source: "NHTSA Investigations",
            sourceRecordId: id,
            type: "investigation",
            subtype: id.slice(0, 2),
            manufacturer: cleanText(r[5]) || undefined,
            publishedAt: date,
            title: cleanText(r[9]) || `Investigation ${id}`,
            text: cleanText((r[10] ?? "").replace(/<[^>]+>/g, " ")),
            facts,
            sourceUrl: recordPage(id),
          };
        },
        vehicle: (r) => [cleanText(r[1]), cleanText(r[2]), modelYear(r[3])],
        component: (r) => cleanText(r[4]),
      });
    },
  };
}

// Complaints arrive at roughly 1,500 a week. The stream takes a fixed
// one-in-N sample chosen by complaint number, which no one here controls.
export const COMPLAINT_SAMPLE = 13;

export function complaints(refresh = false): EventSource {
  return {
    id: "nhtsa-complaints",
    name: "NHTSA Owner Complaints",
    rule: `A fixed sample of owner complaints added in the window: those whose NHTSA complaint number divides evenly by ${COMPLAINT_SAMPLE}. Vehicle complaints only. A complaint whose text still contains an email address, a phone number, a full VIN, a case number or a street address is left out. The sample was not chosen to be representative.`,
    async collect(w: Window) {
      const file = await chunkFor("cmpl", "COMPLAINTS_RECEIVED", Number(w.to.slice(0, 4)), refresh);
      return collect(file, LAYOUTS.complaints, w, {
        id: (r) => r[1],
        date: (r) => isoDate(r[15]),
        skip: (r) => {
          if (Number(r[1]) % COMPLAINT_SAMPLE !== 0) return "outside the sample";
          if ((r[45] ?? "V") !== "V") return "not a vehicle complaint";
          return null;
        },
        open: (r, id, date) => {
          // Location, VIN and dealer columns are in the file and are deliberately not carried.
          const facts: Record<string, string> = {};
          put(facts, "Date of incident", isoDate(r[7]) ?? "");
          put(facts, "Mileage reported", r[17] && r[17] !== "0" ? r[17] : "");
          if (r[6] === "Y") facts["Crash reported"] = "Yes";
          if (r[8] === "Y") facts["Fire reported"] = "Yes";
          return {
            id: `nhtsa-cmpl-${id}`,
            source: "NHTSA Owner Complaints",
            sourceRecordId: id,
            type: "complaint",
            manufacturer: cleanText(r[2]) || undefined,
            publishedAt: date,
            title: `Owner complaint ${id}: ${cleanText(r[3])} ${cleanText(r[4])} ${modelYear(r[5]) ?? ""}`.trim(),
            text: cleanText(r[19]),
            facts,
            sourceUrl: recordPage(id),
          };
        },
        vehicle: (r) => [cleanText(r[3]), cleanText(r[4]), modelYear(r[5])],
        component: (r) => cleanText(r[11]),
        leaveOut: (base) => (identifyingDetails(base.text).length ? "text contains a personal detail" : null),
      });
    },
  };
}

export const nhtsaSources = (refresh = false): EventSource[] => [
  communications(refresh),
  recalls(refresh),
  investigations(refresh),
  complaints(refresh),
];
