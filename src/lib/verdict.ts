// Deterministic mapping from Jev's probabilities to a display state.
// Jev produces numbers; this file, and only this file, decides what they are called.
import type { Area, Decision, DecisionRecord, Verdict } from "./types";

// Every threshold is 0.5: the point where Jev considers yes more likely than no.
// Nothing here was tuned to make the results look better. Tuning waits for a
// human-labelled benchmark, and any change gets a new version.
export const THRESHOLDS = {
  version: "t-1",
  relevanceFloor: 0.5, // below this the item is treated as not about this vehicle
  watchAttention: 0.5,
  interrupt: 0.5,
} as const;

type NoulAnswer = { noul?: number };
type ScoreAnswer = { score?: number };
type ChoiceAnswer = { choice?: string; confidence?: number };

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function verdictFor(relevance: number, attention: number, interrupt: number): Verdict {
  if (relevance < THRESHOLDS.relevanceFloor) return "IGNORE";
  if (interrupt >= THRESHOLDS.interrupt) return "INTERRUPT";
  if (attention >= THRESHOLDS.watchAttention) return "WATCH";
  return "IGNORE";
}

export function derive(record: DecisionRecord): Decision {
  const a = record.raw.answers as {
    relevance?: NoulAnswer;
    attention?: NoulAnswer;
    interrupt?: NoulAnswer;
    consequence?: ScoreAnswer;
    area?: ChoiceAnswer;
  };
  const relevance = num(a.relevance?.noul);
  const attention = num(a.attention?.noul);
  const interrupt = num(a.interrupt?.noul);
  return {
    relevance,
    attention,
    interrupt,
    consequence: num(a.consequence?.score),
    area: (a.area?.choice ?? "none") as Area,
    areaConfidence: num(a.area?.confidence),
    verdict: verdictFor(relevance, attention, interrupt),
  };
}

export const AREA_LABELS: Record<Area, string> = {
  safety: "Safety",
  software: "Software",
  battery: "Battery",
  electrical: "Electrical",
  drivetrain: "Drivetrain",
  engine: "Engine",
  transmission: "Transmission",
  suspension: "Suspension",
  brakes: "Brakes",
  steering: "Steering",
  tires_wheels: "Tires and wheels",
  infotainment: "Infotainment",
  warranty: "Warranty",
  maintenance: "Maintenance",
  body_interior: "Body and interior",
  charging: "Charging",
  other: "Other",
  none: "None",
};
