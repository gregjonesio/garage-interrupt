// Reads a snapshot from disk and runs the gate on it. Scripts and build only.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { VEHICLES } from "../data/vehicles";
import { CONTRACT } from "./contract";
import { checkRelease, type GateResult, type ReleaseManifest } from "./gate";
import { DATA_DIR, eventsFileExists, FileDecisionStore, loadEvents } from "./store";
import type { AutomotiveEvent } from "./types";

export const MANIFEST_FILE = path.join(DATA_DIR, "release.json");

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3217");

const sha256 = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

export function decisionsDir(): { dir: string; name: string } {
  const real = path.join(DATA_DIR, "decisions");
  const hasReal = fs.existsSync(real) && fs.readdirSync(real).some((n) => n.endsWith(".jsonl"));
  return hasReal ? { dir: real, name: "decisions" } : { dir: path.join(DATA_DIR, "decisions-mock"), name: "decisions-mock" };
}

export function fileHashes(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) if (name.endsWith(".jsonl")) out[name] = sha256(path.join(dir, name));
  return out;
}

export function loadManifest(): ReleaseManifest | null {
  return fs.existsSync(MANIFEST_FILE) ? (JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) as ReleaseManifest) : null;
}

export type Release = GateResult & { events: AutomotiveEvent[]; manifest: ReleaseManifest | null };

// ignoreManifest: check everything except agreement with a frozen manifest. Used only when freezing.
export function readRelease(opts: { ignoreManifest?: boolean } = {}): Release {
  const events = eventsFileExists() ? loadEvents() : null;
  const { dir } = decisionsDir();
  const store = new FileDecisionStore(dir); // throws CacheCorrupt on a damaged file
  const manifest = loadManifest();
  const result = checkRelease({
    contract: CONTRACT,
    vehicles: VEHICLES,
    events,
    eventsSha256: events ? sha256(path.join(DATA_DIR, "events.json")) : null,
    records: store.all(),
    conflicts: store.conflicts,
    decisionFiles: fileHashes(dir),
    manifest,
    requireManifest: !opts.ignoreManifest,
    env: {
      siteUrl: siteUrl(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      onVercel: !!process.env.VERCEL,
      allowMock: process.env.ALLOW_MOCK_BUILD === "1",
    },
  });
  return { ...result, events: events ?? [], manifest };
}
