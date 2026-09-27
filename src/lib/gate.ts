// The release gate. Every verdict the site shows must trace to a notice whose
// content is what was judged, a vehicle state that is what was judged, and an
// identifiable set of questions and model. This file decides whether that is
// true for a snapshot. It reads nothing from disk, so it can be tested.
import { identifyingDetails } from "../ingest/privacy";
import { decisionKey, hashOf } from "./hash";
import { eventContent, JEV_MODEL } from "./schema";
import type { AutomotiveEvent, DecisionRecord, VehicleProfile } from "./types";
import { answerProblems } from "./validate";

export type ReleaseManifest = {
  frozenAt: string;
  window: { from: string; to: string } | null;
  contract: string;
  model: string;
  schemaVersion: string;
  thresholds: string;
  vehicles: { count: number; hash: string };
  events: { count: number; sha256: string; byType: Record<string, number> };
  decisions: { pairs: number; files: Record<string, string> };
  provenance: { recorded: number; attested: number; basis: string | null };
};

export type GateInput = {
  contract: string;
  vehicles: VehicleProfile[];
  events: AutomotiveEvent[] | null; // null when the events file is missing
  eventsSha256: string | null;
  records: DecisionRecord[];
  conflicts: string[];
  decisionFiles: Record<string, string>; // file name -> sha256
  manifest: ReleaseManifest | null;
  requireManifest: boolean; // false only while a snapshot is being frozen
  env: { siteUrl: string; vercelEnv: string | null; onVercel: boolean; allowMock: boolean };
};

export type GateResult = {
  errors: string[];
  selected: Map<string, DecisionRecord>; // `${vehicleId}|${eventId}` -> the record the site may show
  mode: "jev" | "mock" | "empty";
  provenance: { recorded: number; attested: number };
};

const MAX_LISTED = 12;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function checkRelease(input: GateInput): GateResult {
  const errors: string[] = [];
  const counts = new Map<string, number>();
  // Group repeats of one kind of problem so a systemic fault reads as one line with a count.
  const fail = (kind: string, detail: string) => {
    const n = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, n);
    if (n <= MAX_LISTED) errors.push(`${kind}: ${detail}`);
  };

  const selected = new Map<string, DecisionRecord>();
  const provenance = { recorded: 0, attested: 0 };
  const { events, vehicles, contract, manifest, env } = input;

  if (events === null) errors.push("data/events.json is missing");
  else if (events.length === 0) errors.push("data/events.json holds no notices");
  if (vehicles.length === 0) errors.push("there are no vehicles");

  const modes = new Set(input.records.map((r) => r.mode));
  const mode: GateResult["mode"] = input.records.length === 0 ? "empty" : modes.has("jev") ? "jev" : "mock";
  if (modes.size > 1) errors.push("the decision store mixes stand-in records with Jev's");
  if (mode !== "jev") {
    if (!env.allowMock) errors.push(`no Jev decisions to show (store is ${mode}); set ALLOW_MOCK_BUILD=1 for a local stand-in build`);
    else if (env.onVercel) errors.push("a stand-in build is refused on Vercel, previews included");
  }

  const vehicleIds = new Set<string>();
  for (const v of vehicles) {
    if (!/^[a-z0-9-]+$/.test(v.id)) fail("vehicle id", `${v.id} is not a safe file name`);
    if (vehicleIds.has(v.id)) fail("vehicle id", `${v.id} appears twice`);
    vehicleIds.add(v.id);
  }

  const seen = new Set<string>();
  const types: Record<string, number> = {};
  for (const e of events ?? []) {
    types[e.type] = (types[e.type] ?? 0) + 1;
    if (seen.has(e.id)) fail("notice id", `${e.id} appears twice`);
    seen.add(e.id);
    if (!e.text.trim()) fail("notice text", `${e.id} has none`);
    if (!ISO_DATE.test(e.publishedAt.slice(0, 10))) fail("notice date", `${e.id} has ${e.publishedAt}`);
    if (e.hash !== hashOf(eventContent(e))) fail("notice hash", `${e.id} was edited after it was hashed`);
    if (!e.sourceUrl?.startsWith("https://www.nhtsa.gov/")) fail("source link", `${e.id} does not link to nhtsa.gov`);
    for (const d of e.documents ?? [])
      if (!d.url.startsWith("https://static.nhtsa.gov/")) fail("document link", `${e.id} links to ${d.url.slice(0, 60)}`);
    if (e.type === "complaint") {
      const found = identifyingDetails(e.text);
      if (found.length) fail("personal detail", `${e.id} contains ${found.join(", ")}`);
    }
  }

  const byKey = new Map(input.records.map((r) => [r.key, r]));
  const conflicts = new Set(input.conflicts);
  for (const v of vehicles) {
    const vHash = hashOf(v.state);
    for (const e of events ?? []) {
      const key = decisionKey(vHash, e.hash, contract);
      const rec = byKey.get(key);
      if (!rec) {
        fail("missing decision", `${v.id} x ${e.id}`);
        continue;
      }
      const where = `${v.id} x ${e.id}`;
      // The cache is keyed by content. NHTSA sometimes files the same bulletin under two
      // ids; both notices then share one decision, so the stored notice id may be the twin's.
      if (rec.vehicleId !== v.id) fail("misfiled decision", `${where} is stored under ${rec.vehicleId}`);
      if (rec.vehicleHash !== vHash || rec.eventHash !== e.hash || rec.contract !== contract) fail("decision key", `${where} does not match its own key`);
      if (conflicts.has(key)) fail("conflicting decisions", `${where} is stored twice with different answers`);
      if (mode === "jev") {
        if (rec.mode !== "jev") fail("stand-in decision", where);
        if (rec.model !== JEV_MODEL || rec.raw.model !== JEV_MODEL) fail("model", `${where} was decided by ${rec.raw.model}`);
      }
      for (const p of answerProblems(rec.raw)) fail("answer", `${where}: ${p}`);
      provenance[rec.provenance === "recorded" ? "recorded" : "attested"]++;
      selected.set(`${v.id}|${e.id}`, rec);
    }
  }

  if (!input.requireManifest) {
    // Freezing: there is nothing to agree with yet.
  } else if (!manifest) errors.push("data/release.json is missing: the snapshot has not been frozen (npm run freeze)");
  else {
    const m = manifest;
    if (m.contract !== contract) errors.push("the questions or the model changed after the snapshot was frozen");
    if (m.vehicles.count !== vehicles.length || m.vehicles.hash !== hashOf(vehicles.map((v) => v.state)))
      errors.push("the vehicles changed after the snapshot was frozen");
    if (events && (m.events.count !== events.length || m.events.sha256 !== input.eventsSha256))
      errors.push("data/events.json changed after the snapshot was frozen");
    if (m.decisions.pairs !== vehicles.length * (events?.length ?? 0)) errors.push("the frozen pair count does not match the snapshot");
    for (const [name, sha] of Object.entries(m.decisions.files))
      if (input.decisionFiles[name] !== sha) errors.push(`data/decisions/${name} changed after the snapshot was frozen`);
    for (const name of Object.keys(input.decisionFiles))
      if (!(name in m.decisions.files)) errors.push(`data/decisions/${name} is not part of the frozen snapshot`);
    for (const [type, n] of Object.entries(m.events.byType)) if ((types[type] ?? 0) !== n) errors.push(`the count of ${type} notices changed`);
    if (m.provenance.attested > 0 && !m.provenance.basis) errors.push("attested decisions need a stated basis in the manifest");
  }

  if (env.vercelEnv === "production" && !/^https:\/\/(?!localhost)/.test(env.siteUrl))
    errors.push(`the public address resolves to ${env.siteUrl}; set NEXT_PUBLIC_SITE_URL`);

  for (const [kind, n] of counts) if (n > MAX_LISTED) errors.push(`${kind}: ${n - MAX_LISTED} more not listed`);
  return { errors, selected, mode, provenance };
}
