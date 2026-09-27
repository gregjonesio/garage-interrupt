// Freezes the snapshot: checks everything the release gate checks, then writes
// data/release.json, which binds the notices, the vehicles, the questions, the
// model and the decision files together. The build refuses any snapshot that
// does not match its manifest.
//   npx tsx scripts/freeze.ts
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { VEHICLES } from "../src/data/vehicles";
import { CONTRACT } from "../src/lib/contract";
import type { ReleaseManifest } from "../src/lib/gate";
import { hashOf } from "../src/lib/hash";
import { loadWindow } from "../src/lib/home-window";
import { decisionsDir, fileHashes, MANIFEST_FILE, readRelease } from "../src/lib/release";
import { JEV_MODEL, SCHEMA_VERSION } from "../src/lib/schema";
import { DATA_DIR } from "../src/lib/store";
import { THRESHOLDS } from "../src/lib/verdict";

// Attested decisions can only be frozen with a written basis, given on the command line:
//   npx tsx scripts/freeze.ts --attest "why these decisions are taken to belong to the contract"
const at = process.argv.indexOf("--attest");
const ATTESTATION = at >= 0 ? (process.argv[at + 1] ?? "").trim() : "";

const release = readRelease({ ignoreManifest: true });
if (release.provenance.attested > 0 && ATTESTATION.length < 40) {
  console.error(`Not frozen. ${release.provenance.attested} decisions are attested and no basis was given. Rescore, or pass --attest with the reason.`);
  process.exit(1);
}
if (release.errors.length) {
  console.error(`Not frozen. ${release.errors.length} problems:`);
  for (const e of release.errors) console.error("  " + e);
  process.exit(1);
}
if (release.mode !== "jev") {
  console.error("Not frozen. Only a snapshot of Jev decisions can be frozen.");
  process.exit(1);
}

const byType: Record<string, number> = {};
for (const e of release.events) byType[e.type] = (byType[e.type] ?? 0) + 1;
const window = loadWindow();

const manifest: ReleaseManifest = {
  frozenAt: new Date().toISOString(),
  window: window ? { from: window.from, to: window.to } : null,
  contract: CONTRACT,
  model: JEV_MODEL,
  schemaVersion: SCHEMA_VERSION,
  thresholds: THRESHOLDS.version,
  vehicles: { count: VEHICLES.length, hash: hashOf(VEHICLES.map((v) => v.state)) },
  events: {
    count: release.events.length,
    sha256: createHash("sha256").update(fs.readFileSync(path.join(DATA_DIR, "events.json"))).digest("hex"),
    byType,
  },
  decisions: { pairs: release.selected.size, files: fileHashes(decisionsDir().dir) },
  provenance: { ...release.provenance, basis: release.provenance.attested ? ATTESTATION : null },
};

fs.writeFileSync(`${MANIFEST_FILE}.tmp`, JSON.stringify(manifest, null, 1));
fs.renameSync(`${MANIFEST_FILE}.tmp`, MANIFEST_FILE);
console.log(`Frozen: ${manifest.events.count} notices x ${manifest.vehicles.count} vehicles = ${manifest.decisions.pairs} decisions`);
console.log(`contract ${manifest.contract}, ${manifest.provenance.recorded} recorded, ${manifest.provenance.attested} attested`);
