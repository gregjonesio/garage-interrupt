// Server-side builders for page data. Everything is computed at build time
// from data/events.json and the decision cache.
import fs from "node:fs";
import path from "node:path";
import { NHTSA_MODELS, VEHICLES, vehicleTitle } from "../data/vehicles";
import { loadWindow } from "./home-window";
import { AREA_ORDER, load, VERDICTS, type Cell } from "./site";
import { DATA_DIR } from "./store";
import type { AutomotiveEvent, DecisionRecord, VehicleProfile } from "./types";
import { AREA_LABELS, derive } from "./verdict";
import { displayTitle, lede, TYPE_ORDER, type HomeData, type Hit, type MatrixRow, type RoadDay, type VehicleView } from "./view";

export { loadWindow, type WindowInfo } from "./home-window";

function traits(v: VehicleProfile): string[] {
  const s = v.state;
  const out = [s.powertrain.split(",")[0], `${s.mileage.toLocaleString("en-US")} miles`];
  if (s.usage.towing) out.push("Tows");
  if (s.usage.offRoad) out.push("Off-road use");
  if (s.modifications.length) out.push("Modified");
  out.push(s.usage.type.charAt(0).toUpperCase() + s.usage.type.slice(1));
  return out;
}

function hitFrom(e: AutomotiveEvent, c: Cell): Hit {
  return {
    id: e.id,
    type: e.type,
    subtype: e.subtype ?? null,
    date: e.publishedAt.slice(0, 10),
    manufacturer: e.manufacturer ?? "",
    title: displayTitle(e.type, e.title ?? ""),
    lede: lede(e.text),
    relevance: c[0],
    attention: c[1],
    interrupt: c[2],
    consequence: c[3] / 10,
    area: AREA_LABELS[AREA_ORDER[c[4]] ?? "none"],
    verdict: VERDICTS[c[5]],
  };
}

export function buildHome(): HomeData {
  const { site, events } = load();
  const window = loadWindow();

  const days: RoadDay[] = [];
  events.forEach((e, i) => {
    const date = e.publishedAt.slice(0, 10);
    const last = days.at(-1);
    if (last && last.date === date) last.count++;
    else days.push({ date, start: i, count: 1 });
  });

  const vehicles: VehicleView[] = VEHICLES.map((v) => {
    const cells = site.cells[v.id];
    const counts = { ignore: 0, watch: 0, interrupt: 0, missing: 0 };
    const hits: Hit[] = [];
    let lane = "";
    cells.forEach((c, i) => {
      if (!c) {
        counts.missing++;
        lane += "9"; // not judged yet
        return;
      }
      lane += String(c[5]);
      if (c[5] === 2) counts.interrupt++;
      else if (c[5] === 1) counts.watch++;
      else counts.ignore++;
      if (c[5] > 0) hits.push(hitFrom(events[i], c));
    });
    hits.sort((a, b) => (b.verdict === "INTERRUPT" ? 1 : 0) - (a.verdict === "INTERRUPT" ? 1 : 0) || b.interrupt - a.interrupt);
    return {
      id: v.id,
      exit: v.exit,
      label: v.label,
      title: vehicleTitle(v),
      trim: v.state.trim,
      traits: traits(v),
      counts,
      hits,
      lane,
    };
  });

  // One row per vehicle: the notice Jev scored highest for it (relevance x interrupt),
  // skipping a notice already chosen for another vehicle.
  const chosen = new Set<number>();
  for (const v of VEHICLES) {
    let best = -1;
    let bestScore = 0;
    site.cells[v.id].forEach((c, i) => {
      if (!c || c[5] === 0 || chosen.has(i)) return;
      const score = c[0] * c[2];
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) chosen.add(best);
  }
  const matrix: MatrixRow[] = [...chosen]
    .sort((a, b) => a - b)
    .map((i) => ({
      id: events[i].id,
      type: events[i].type,
      date: events[i].publishedAt.slice(0, 10),
      title: displayTitle(events[i].type, events[i].title ?? ""),
      lede: lede(events[i].text, 120),
      cells: VEHICLES.map((v) => {
        const c = site.cells[v.id][i];
        return [c ? c[0] : 0, c ? c[5] : 0] as [number, number];
      }),
    }));

  return {
    mode: site.mode,
    model: site.model,
    window: window ? { from: window.from, to: window.to } : null,
    total: events.length,
    byType: site.stats.byType,
    days,
    eventIds: events.map((e) => e.id),
    eventTitles: events.map((e) => displayTitle(e.type, e.title ?? "")),
    eventTypes: events.map((e) => TYPE_ORDER.indexOf(e.type)).join(""),
    vehicles,
    matrix,
  };
}

// Code-side comparison of the vehicle with the fields NHTSA filled in.
export type FieldCheck = {
  makeNamed: boolean;
  modelNamed: string | null; // the NHTSA model name that matched
  year: "listed" | "not_listed" | "not_stated" | "n/a";
};

export function fieldCheck(v: VehicleProfile, e: AutomotiveEvent): FieldCheck {
  const applies = e.structuredApplicability?.vehicles ?? [];
  const make = v.state.make.toUpperCase();
  const names = NHTSA_MODELS[v.id] ?? [v.state.model.toUpperCase()];
  const sameMake = applies.filter((a) => a.make.toUpperCase() === make);
  const sameModel = sameMake.filter((a) => names.includes(a.model.toUpperCase()));
  if (!sameModel.length) return { makeNamed: sameMake.length > 0, modelNamed: null, year: "n/a" };
  const years = sameModel.flatMap((a) => a.years);
  return {
    makeNamed: true,
    modelNamed: sameModel[0].model,
    year: years.length === 0 ? "not_stated" : years.includes(v.state.year) ? "listed" : "not_listed",
  };
}

export type EventDecisionView = {
  vehicleId: string;
  relevance: number;
  attention: number;
  interrupt: number;
  consequence: number;
  area: string;
  areaConfidence: number;
  verdict: "IGNORE" | "WATCH" | "INTERRUPT";
  ms: number;
  inputTokens: number | null;
  model: string;
  mode: "jev" | "mock";
  check: FieldCheck;
};

export function buildEvent(id: string) {
  const { events, records } = load();
  const event = events.find((e) => e.id === id);
  if (!event) return null;
  const decisions: EventDecisionView[] = [];
  for (const v of VEHICLES) {
    const rec: DecisionRecord | undefined = records.get(`${v.id}|${id}`);
    if (!rec) continue;
    const d = derive(rec);
    decisions.push({
      vehicleId: v.id,
      relevance: Math.round(d.relevance * 100),
      attention: Math.round(d.attention * 100),
      interrupt: Math.round(d.interrupt * 100),
      consequence: Math.round(d.consequence * 10) / 10,
      area: AREA_LABELS[d.area],
      areaConfidence: Math.round(d.areaConfidence * 100),
      verdict: d.verdict,
      ms: rec.ms,
      inputTokens: rec.inputTokens,
      model: rec.model,
      mode: rec.mode,
      check: fieldCheck(v, event),
    });
  }
  const top = [...decisions].sort((a, b) => b.relevance - a.relevance)[0];
  return { event, decisions, defaultVehicle: top?.vehicleId ?? VEHICLES[0].id };
}

export type Benchmark = {
  computedAt: string;
  labels: number;
  labellers: number;
  publishable: boolean;
  decisions: number;
  recallOfRelevant: number | null;
  falsePositiveRate: number | null;
  noiseSuppressed: number | null;
};

// Present only after scripts/benchmark.ts has run on real human labels.
export function loadBenchmark(): Benchmark | null {
  const file = path.join(DATA_DIR, "benchmark.json");
  if (!fs.existsSync(file)) return null;
  const b = JSON.parse(fs.readFileSync(file, "utf8")) as Benchmark;
  return b.publishable ? b : null;
}

export type Rerun = {
  comparedAt: string;
  pairs: number;
  identical: number;
  stateChanged: number;
  largestChangePoints: number;
  changeOver10: number;
};

// Present only after the same pairs have been judged twice (scripts/compare-runs.ts --write).
export function loadRerun(): Rerun | null {
  const file = path.join(DATA_DIR, "rerun.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Rerun) : null;
}

export type LookupRow = {
  id: string;
  type: AutomotiveEvent["type"];
  title: string;
  vehicleId: string;
  vehicle: string;
  matched: boolean; // a make, model and model-year lookup on NHTSA's fields returns this pair
  verdict: "IGNORE" | "WATCH" | "INTERRUPT";
  relevance: number;
  attention: number;
  interrupt: number;
};

// A plain make, model and model-year lookup against NHTSA's fields, set beside
// what Jev did with the same pairs. Every pair where the two differ or agree on
// "yes" is listed, none left out. Counts only; neither side is called correct.
export function lookupComparison() {
  const { site, events } = load();
  const rows: LookupRow[] = [];
  for (const v of VEHICLES) {
    site.cells[v.id].forEach((c, i) => {
      if (!c) return;
      const e = events[i];
      const check = fieldCheck(v, e);
      const matched = check.modelNamed !== null && check.year === "listed";
      if (!matched && c[5] === 0) return;
      rows.push({
        id: e.id,
        type: e.type,
        title: displayTitle(e.type, e.title ?? ""),
        vehicleId: v.id,
        vehicle: vehicleTitle(v),
        matched,
        verdict: VERDICTS[c[5]],
        relevance: c[0],
        attention: c[1],
        interrupt: c[2],
      });
    });
  }
  const matched = rows.filter((r) => r.matched);
  return {
    pairs: site.stats.scored,
    matched: matched.length,
    matchedPassed: matched.filter((r) => r.verdict !== "IGNORE").length,
    matchedHeld: matched.filter((r) => r.verdict === "IGNORE").length,
    unmatchedPassed: rows.filter((r) => !r.matched).length,
    rows,
  };
}

export function allEventIds(): string[] {
  return load().events.map((e) => e.id);
}
