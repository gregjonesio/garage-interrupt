// The question schema sent to Jev. A decision is only valid for the exact
// questions, model and state shape that produced it. src/lib/contract.ts hashes
// all three into the cache key, so editing a question cannot reuse an old answer.
import type { AutomotiveEvent, VehicleState } from "./types";

// A label for people. The cache relies on the contract hash, not on this.
export const SCHEMA_VERSION = "gi-1";

// Pinned on purpose. Thresholds in verdict.ts were chosen against this version.
export const JEV_MODEL = "jev-1.13.0";

// The top-level keys of the state. Change this when buildState changes shape.
export const STATE_SHAPE = "vehicle+incoming_information/1";

export const AREAS = {
  safety: "Occupant protection or crash avoidance: airbags, seat belts, restraints, driver assistance, visibility, lighting",
  software: "Vehicle software, firmware, control module programming, over-the-air updates",
  battery: "High-voltage or 12-volt battery, battery management, cell or pack",
  electrical: "Wiring, connectors, fuses, sensors, modules, charging system of a combustion vehicle",
  drivetrain: "Axles, differentials, transfer case, driveshafts, electric drive units, four-wheel drive",
  engine: "Combustion engine, fuel system, cooling, turbocharger, emissions, exhaust",
  transmission: "Automatic, manual, CVT or dual-clutch transmission and its controls",
  suspension: "Springs, dampers, air suspension, control arms, ride height",
  brakes: "Service brakes, parking brake, brake assist, regenerative braking behavior",
  steering: "Steering gear, column, power assist, steering wheel",
  tires_wheels: "Tires, wheels, lug nuts, tire pressure monitoring",
  infotainment: "Displays, audio, navigation, phone connectivity, cameras used for display",
  warranty: "Warranty coverage, extended coverage, customer satisfaction programs, reimbursement",
  maintenance: "Scheduled service, fluids, filters, inspection procedures",
  body_interior: "Doors, latches, glass, seats, trim, paint, water leaks, climate control",
  charging: "Charge port, onboard charger, charging cable, charging behavior of a plug-in vehicle",
  other: "A vehicle area not listed here",
  none: "The information does not concern any area of this vehicle",
} as const;

export const CONSEQUENCE_LEVELS = [
  "Irrelevant to this vehicle",
  "Minor: applies but has little practical effect for this owner",
  "Worth knowing: useful background for this owner",
  "Important: this owner would want to read it",
  "High attention: this owner would want to read it now",
] as const;

export const QUESTIONS = {
  relevance: {
    type: "noul",
    instructions:
      "Does this new information apply or appear relevant to this specific vehicle configuration?",
    criteria: {
      true: "The information concerns this make, model, model year and configuration",
      false: "The information concerns a different vehicle, or a configuration this vehicle does not have",
    },
  },
  attention: {
    type: "noul",
    instructions:
      "Given the vehicle state and owner context, does this information warrant the owner's attention?",
  },
  consequence: {
    type: "score",
    instructions: "How consequential is this information for this vehicle?",
    criteria: [...CONSEQUENCE_LEVELS],
  },
  area: {
    type: "choice",
    instructions: "Which area of this vehicle is primarily affected by this information?",
    criteria: { ...AREAS },
  },
  interrupt: {
    type: "noul",
    instructions:
      "Should this information interrupt the owner rather than simply remain available for later review?",
  },
} as const;

const SOURCE_NOTES: Record<AutomotiveEvent["type"], string> = {
  manufacturer_communication:
    "A communication from the manufacturer to its dealers, filed with NHTSA. Usually a service bulletin or repair procedure. Not a recall.",
  recall: "A safety recall filed with NHTSA. The manufacturer has committed to a remedy.",
  investigation:
    "A defect investigation opened by NHTSA. An investigation is an inquiry, not a finding.",
  complaint:
    "A complaint filed with NHTSA by a vehicle owner. Owner complaints are unverified reports.",
  software_update: "Release notes published by the manufacturer for a software update.",
  other: "An automotive notice.",
};

const MAX_TEXT = 6000; // characters of source text sent to Jev; well inside the 32k token budget
const MAX_APPLIES = 300; // model lines sent to Jev; the rest are counted, not listed

// [2021, 2022, 2023, 2025] -> "2021-2023, 2025"
export function yearRanges(years: number[]): string {
  const ys = [...new Set(years)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < ys.length; i++) {
    let j = i;
    while (j + 1 < ys.length && ys[j + 1] === ys[j] + 1) j++;
    out.push(i === j ? String(ys[i]) : `${ys[i]}-${ys[j]}`);
    i = j;
  }
  return out.join(", ");
}

export function appliesLines(event: AutomotiveEvent): string[] {
  return (event.structuredApplicability?.vehicles ?? []).map((v) =>
    `${v.make} ${v.model} ${v.years.length ? yearRanges(v.years) : "(model year not stated)"}`.trim(),
  );
}

// Everything about an event that Jev sees. The event hash is taken over this,
// so a link or document added later does not invalidate a decision.
export function eventContent(event: AutomotiveEvent) {
  const lines = appliesLines(event);
  return {
    kind: event.type,
    what_this_kind_of_document_is: SOURCE_NOTES[event.type],
    source: event.source,
    category_given_by_source: event.subtype ?? null,
    published: event.publishedAt.slice(0, 10),
    manufacturer: event.manufacturer ?? null,
    title: event.title ?? null,
    applies_to_as_stated_by_source: lines.length ? lines.slice(0, MAX_APPLIES) : null,
    further_models_not_listed_here: Math.max(0, lines.length - MAX_APPLIES),
    components_as_stated_by_source: event.structuredApplicability?.components ?? null,
    other_source_fields: event.facts ?? null,
    text: event.text.length > MAX_TEXT ? event.text.slice(0, MAX_TEXT) : event.text,
  };
}

// The state is the only thing Jev knows. It carries the vehicle, the incoming
// document, and what kind of document it is.
export function buildState(vehicle: VehicleState, event: AutomotiveEvent) {
  return { vehicle, incoming_information: eventContent(event) };
}
