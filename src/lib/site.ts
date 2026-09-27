// Build-time view of the data for pages. Reads the event file and the decision
// cache from disk; pages that use it are rendered statically, so nothing here
// runs per request and no key is needed to serve the site.
import { VEHICLES } from "../data/vehicles";
import { readRelease } from "./release";
import { JEV_MODEL, SCHEMA_VERSION } from "./schema";
import type { Area, AutomotiveEvent, Decision, DecisionRecord, EventType, Verdict } from "./types";
import { answerProblems } from "./validate";
import { derive, THRESHOLDS } from "./verdict";
import { displayTitle } from "./view";

export type EventRow = {
  id: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  manufacturer: string;
  title: string;
  sourceRecordId: string;
};

// [relevance%, attention%, interrupt%, consequence x10, area index, verdict index]
export type Cell = [number, number, number, number, number, number];

export const VERDICTS: Verdict[] = ["IGNORE", "WATCH", "INTERRUPT"];
export const AREA_ORDER: Area[] = [
  "safety", "software", "battery", "electrical", "drivetrain", "engine", "transmission",
  "suspension", "brakes", "steering", "tires_wheels", "infotainment", "warranty",
  "maintenance", "body_interior", "charging", "other", "none",
];

export type Stats = {
  events: number;
  vehicles: number;
  pairs: number;
  scored: number;
  medianMs: number | null;
  p95Ms: number | null;
  inputTokens: number;
  estCostUsd: number;
  firstDate: string | null;
  lastDate: string | null;
  byType: Record<string, number>;
};

export type Site = {
  mode: "jev" | "mock" | "empty";
  model: string;
  schemaVersion: string;
  thresholdsVersion: string;
  events: EventRow[];
  cells: Record<string, (Cell | null)[]>; // vehicleId -> one cell per event, same order
  stats: Stats;
};

type Loaded = {
  site: Site;
  events: AutomotiveEvent[];
  records: Map<string, DecisionRecord>; // `${vehicleId}|${eventId}`
};

let memo: Loaded | null = null;

const pct = (n: number) => Math.round(n * 100);

function toCell(d: Decision): Cell {
  return [
    pct(d.relevance),
    pct(d.attention),
    pct(d.interrupt),
    Math.round(d.consequence * 10),
    AREA_ORDER.indexOf(d.area),
    VERDICTS.indexOf(d.verdict),
  ];
}

function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function load(): Loaded {
  if (memo) return memo;

  // The gate runs on every path that renders a page, so a build cannot skip it.
  // A production build stops on any problem. Development carries on and says so.
  const release = readRelease();
  if (release.errors.length) {
    const report = `Release gate: ${release.errors.length} problems\n  ` + release.errors.join("\n  ");
    if (process.env.NODE_ENV === "production") throw new Error(report);
    console.warn(report);
  }
  const events = [...release.events].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id));
  const mode: Site["mode"] = release.mode;

  const cells: Site["cells"] = {};
  const records = new Map<string, DecisionRecord>();
  const latencies: number[] = [];
  let tokens = 0;
  let scored = 0;
  for (const v of VEHICLES) {
    cells[v.id] = events.map((e) => {
      // Only records the gate selected are shown; one that fails validation is treated as missing.
      const rec = release.selected.get(`${v.id}|${e.id}`);
      if (!rec || answerProblems(rec.raw).length) return null;
      records.set(`${v.id}|${e.id}`, rec);
      scored++;
      if (rec.mode === "jev") {
        latencies.push(rec.ms);
        tokens += rec.inputTokens ?? 0;
      }
      return toCell(derive(rec));
    });
  }
  latencies.sort((a, b) => a - b);

  const byType: Record<string, number> = {};
  for (const e of events) byType[e.type] = (byType[e.type] ?? 0) + 1;

  const site: Site = {
    mode,
    model: mode === "jev" ? JEV_MODEL : "mock",
    schemaVersion: SCHEMA_VERSION,
    thresholdsVersion: THRESHOLDS.version,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.publishedAt.slice(0, 10),
      manufacturer: e.manufacturer ?? "",
      title: displayTitle(e.type, e.title ?? e.text.slice(0, 90)),
      sourceRecordId: e.sourceRecordId,
    })),
    cells,
    stats: {
      events: events.length,
      vehicles: VEHICLES.length,
      pairs: events.length * VEHICLES.length,
      scored,
      medianMs: quantile(latencies, 0.5),
      p95Ms: quantile(latencies, 0.95),
      inputTokens: tokens,
      estCostUsd: (tokens / 1e6) * 0.042,
      firstDate: events[0]?.publishedAt.slice(0, 10) ?? null,
      lastDate: events.at(-1)?.publishedAt.slice(0, 10) ?? null,
      byType,
    },
  };
  memo = { site, events, records };
  return memo;
}
