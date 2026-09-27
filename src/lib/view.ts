// Types and small helpers shared by server pages and client components.
// Nothing here touches the file system or the Jev key.
import type { EventType, Verdict } from "./types";

export type Hit = {
  id: string;
  type: EventType;
  subtype: string | null;
  date: string;
  manufacturer: string;
  title: string;
  lede: string; // opening of the source text, verbatim
  relevance: number; // percent
  attention: number;
  interrupt: number;
  consequence: number; // 0..4
  area: string;
  verdict: Verdict;
};

export type VehicleView = {
  id: string;
  exit: number;
  label: string;
  title: string; // "2022 Ford F-150"
  trim: string;
  traits: string[];
  counts: { ignore: number; watch: number; interrupt: number; missing: number };
  hits: Hit[];
  // For the road: verdict index per event, in stream order, packed as a string of digits.
  lane: string;
};

export type RoadDay = { date: string; start: number; count: number };

export type MatrixRow = {
  id: string;
  type: EventType;
  date: string;
  title: string;
  lede: string;
  cells: [number, number][]; // per vehicle, in vehicle order: [relevance %, verdict index]
};

export type HomeData = {
  mode: "jev" | "mock" | "empty";
  model: string;
  window: { from: string; to: string } | null;
  total: number;
  byType: Record<string, number>;
  days: RoadDay[];
  // Stream order, one entry per notice, for the road.
  eventIds: string[];
  eventTitles: string[];
  eventTypes: string; // one digit per notice, an index into TYPE_ORDER
  vehicles: VehicleView[];
  matrix: MatrixRow[];
};

export const TYPE_ORDER: EventType[] = [
  "manufacturer_communication",
  "recall",
  "investigation",
  "complaint",
  "software_update",
  "other",
];

export const TYPE_LABEL: Record<EventType, string> = {
  manufacturer_communication: "Manufacturer communication",
  recall: "Recall",
  investigation: "Investigation",
  complaint: "Owner complaint, unverified",
  software_update: "Software release notes",
  other: "Notice",
};

export const TYPE_NOUN: Record<EventType, string> = {
  manufacturer_communication: "manufacturer communication",
  recall: "recall",
  investigation: "investigation",
  complaint: "owner complaint",
  software_update: "software release note",
  other: "notice",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  IGNORE: "Ignored",
  WATCH: "Worth knowing",
  INTERRUPT: "Interrupt",
};

// Fixed sentences. Jev writes none of this. "Highly" is tied to the relevance
// figure so the words never say more than the number does.
export function verdictSentence(type: EventType, verdict: Verdict, relevance: number): string {
  const noun = TYPE_NOUN[type];
  const tail = type === "complaint" ? " Owner complaints are unverified reports." : "";
  const relevant = relevance >= 80 ? "highly relevant" : "relevant";
  if (verdict === "INTERRUPT")
    return `This ${noun} appears ${relevant} to this vehicle configuration and warrants attention based on the vehicle state.${tail}`;
  if (verdict === "WATCH")
    return `This ${noun} appears ${relevant} to this vehicle configuration. It is worth knowing and does not call for an interruption.${tail}`;
  return `This ${noun} does not appear to warrant attention for this vehicle.${tail}`;
}

// Words for Jev's 0 to 4 score of how much the notice matters to this owner.
export const IMPORTANCE_SHORT = ["None", "Minor", "Worth knowing", "Important", "High"];

// Which figures put the pair in its state, in the order the rule applies them.
export function ruleSentence(verdict: Verdict, relevance: number, attention: number, interrupt: number): string {
  if (relevance < 50) return `Relevance of ${relevance}% is under one half, so the notice is ignored whatever the other figures say.`;
  if (verdict === "INTERRUPT") return `Relevance of ${relevance}% and interrupt probability of ${interrupt}% are both one half or more.`;
  if (verdict === "WATCH")
    return `Relevance of ${relevance}% and attention of ${attention}% are one half or more. Interrupt probability of ${interrupt}% is under one half.`;
  return `Relevance of ${relevance}% is one half or more, but attention of ${attention}% and interrupt probability of ${interrupt}% are both under one half.`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-09-03" -> "Sep 3, 2026". Done by hand so server and browser agree.
export function formatDate(iso: string, withYear = true): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

export const formatCount = (n: number) => n.toLocaleString("en-US");

// NHTSA's recall component is a long colon-separated path. For display, keep the
// top level only. The full path stays on the notice page and in what Jev reads.
export function displayTitle(type: EventType, title: string): string {
  if (type !== "recall") return title;
  const m = title.match(/^(Recall \S+: [^:]+):/);
  return m ? m[1] : title;
}

export function lede(text: string, max = 190): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)) + " ...";
}
