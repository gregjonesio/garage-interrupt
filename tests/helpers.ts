// Small builders for test fixtures. Nothing here is real data.
import { finalize } from "../src/ingest/source";
import type { GateInput, ReleaseManifest } from "../src/lib/gate";
import { decisionKey, hashOf } from "../src/lib/hash";
import { JEV_MODEL, SCHEMA_VERSION } from "../src/lib/schema";
import type { AutomotiveEvent, DecisionRecord, JevRaw, VehicleProfile } from "../src/lib/types";

export const CONTRACT = "testcontract0001";

export function vehicle(id: string, make: string, model: string, year: number): VehicleProfile {
  return {
    id,
    label: model,
    exit: 1,
    state: {
      year,
      make,
      model,
      trim: "Base",
      powertrain: "Test",
      drivetrain: "Test",
      mileage: 1000,
      wheelsAndTires: "Test",
      features: [],
      modifications: [],
      usage: { type: "test", annualMiles: 1, mostlyHighway: false, towing: false, offRoad: false },
      warranty: "Test",
      ownerPriorities: [],
    },
  };
}

export function notice(id: string, over: Partial<AutomotiveEvent> = {}): AutomotiveEvent {
  return finalize({
    id,
    source: "NHTSA Recalls",
    sourceRecordId: id,
    type: "recall",
    manufacturer: "Test Motors",
    publishedAt: "2026-09-01",
    title: `Recall ${id}`,
    text: `Text of ${id}.`,
    sourceUrl: `https://www.nhtsa.gov/recalls?nhtsaId=${id}`,
    structuredApplicability: { vehicles: [{ make: "FORD", model: "F-150", years: [2022] }], components: ["BRAKES"] },
    ...over,
  });
}

export function answers(relevance = 0.9, attention = 0.8, interrupt = 0.7): JevRaw {
  return {
    model: JEV_MODEL,
    answers: {
      relevance: { type: "noul", noul: relevance },
      attention: { type: "noul", noul: attention },
      interrupt: { type: "noul", noul: interrupt },
      consequence: { type: "score", score: 3.2, confidence: 0.5 },
      area: { type: "choice", choice: "brakes", confidence: 0.9 },
    },
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}

export function record(v: VehicleProfile, e: AutomotiveEvent, over: Partial<DecisionRecord> = {}): DecisionRecord {
  const vehicleHash = hashOf(v.state);
  return {
    key: decisionKey(vehicleHash, e.hash, CONTRACT),
    vehicleId: v.id,
    eventId: e.id,
    vehicleHash,
    eventHash: e.hash,
    schemaVersion: SCHEMA_VERSION,
    contract: CONTRACT,
    provenance: "recorded",
    mode: "jev",
    model: JEV_MODEL,
    ms: 100,
    inputTokens: 100,
    decidedAt: "2026-09-26T00:00:00.000Z",
    raw: answers(),
    ...over,
  };
}

// A snapshot that passes the gate. Tests break one thing at a time.
export function goodInput(): GateInput {
  const vehicles = [vehicle("ford-f150", "Ford", "F-150", 2022), vehicle("toyota-camry", "Toyota", "Camry", 2023)];
  const events = [notice("26V001000"), notice("26V002000")];
  const records = vehicles.flatMap((v) => events.map((e) => record(v, e)));
  const decisionFiles = { "ford-f150.jsonl": "aaa", "toyota-camry.jsonl": "bbb" };
  const manifest: ReleaseManifest = {
    frozenAt: "2026-09-26T00:00:00.000Z",
    window: { from: "2026-09-01", to: "2026-09-02" },
    contract: CONTRACT,
    model: JEV_MODEL,
    schemaVersion: SCHEMA_VERSION,
    thresholds: "t-1",
    vehicles: { count: vehicles.length, hash: hashOf(vehicles.map((v) => v.state)) },
    events: { count: events.length, sha256: "eventsha", byType: { recall: 2 } },
    decisions: { pairs: 4, files: { ...decisionFiles } },
    provenance: { recorded: 4, attested: 0, basis: null },
  };
  return {
    contract: CONTRACT,
    vehicles,
    events,
    eventsSha256: "eventsha",
    records,
    conflicts: [],
    decisionFiles,
    manifest,
    requireManifest: true,
    env: { siteUrl: "https://example.com", vercelEnv: null, onVercel: false, allowMock: false },
  };
}
