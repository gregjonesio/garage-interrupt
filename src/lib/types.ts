// Shared types. The primitive is: state + incoming event -> attention decision.

export type EventType =
  | "manufacturer_communication"
  | "recall"
  | "investigation"
  | "complaint"
  | "software_update"
  | "other";

export type Applicability = {
  // Only what the source states in structured fields. Never inferred from prose.
  // An empty years list means the source gave no model year.
  vehicles: { make: string; model: string; years: number[] }[];
  components?: string[];
};

export type SourceDocument = { name: string; url: string };

export type AutomotiveEvent = {
  id: string;
  source: string; // e.g. "NHTSA Recalls"
  sourceRecordId: string; // the identifier the source itself uses
  type: EventType;
  subtype?: string; // the source's own category, verbatim
  manufacturer?: string;
  publishedAt: string; // ISO date the source made it public
  title?: string; // from a source field, or a fixed template over source fields
  text: string; // source text, unedited apart from whitespace cleanup
  facts?: Record<string, string>; // other structured source fields, verbatim
  sourceUrl?: string;
  documents?: SourceDocument[]; // official documents, resolved from the source's own index
  structuredApplicability?: Applicability;
  hash: string; // hash of the content sent to Jev; part of the decision cache key
};

export type VehicleProfile = {
  id: string;
  label: string; // short display name
  exit: number; // stable display number
  state: VehicleState;
};

export type VehicleState = {
  year: number;
  make: string;
  model: string;
  trim: string;
  powertrain: string;
  drivetrain: string;
  mileage: number;
  wheelsAndTires: string;
  softwareVersion?: string;
  features: string[];
  modifications: string[];
  usage: {
    type: string;
    annualMiles: number;
    mostlyHighway: boolean;
    towing: boolean;
    offRoad: boolean;
  };
  warranty: string;
  ownerPriorities: string[];
};

export type Area =
  | "safety"
  | "software"
  | "battery"
  | "electrical"
  | "drivetrain"
  | "engine"
  | "transmission"
  | "suspension"
  | "brakes"
  | "steering"
  | "tires_wheels"
  | "infotainment"
  | "warranty"
  | "maintenance"
  | "body_interior"
  | "charging"
  | "other"
  | "none";

// Exactly what came back from the API, stored untouched so decisions can be re-derived.
export type JevRaw = {
  model: string;
  answers: Record<string, unknown>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type DecisionRecord = {
  key: string; // vehicleHash:eventHash:contract
  vehicleId: string;
  eventId: string;
  vehicleHash: string;
  eventHash: string;
  schemaVersion: string;
  contract: string; // hash of the questions, the model and the state shape used for the call
  // "recorded": the contract was computed by the code that made the call.
  // "attested": the call predates contract recording; see data/release.json for the basis.
  provenance: "recorded" | "attested";
  mode: "jev" | "mock";
  model: string;
  ms: number;
  inputTokens: number | null;
  decidedAt: string;
  raw: JevRaw;
};

export type Verdict = "IGNORE" | "WATCH" | "INTERRUPT";

// The numbers the interface reads, derived from a DecisionRecord by code.
export type Decision = {
  relevance: number;
  attention: number;
  interrupt: number;
  consequence: number; // 0..4, probability-weighted
  area: Area;
  areaConfidence: number;
  verdict: Verdict;
};
