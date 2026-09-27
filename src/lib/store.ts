// File-backed decision cache. One JSONL file per vehicle, append-only.
// Key = vehicle state hash + event hash + inference contract, so a changed
// vehicle, a changed notice, or a changed question is a cache miss, never a
// stale hit. The interface is small on purpose: Postgres can replace it.
import fs from "node:fs";
import path from "node:path";
import { stableStringify } from "./hash";
import type { AutomotiveEvent, DecisionRecord } from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");
const DECISIONS_DIR = path.join(DATA_DIR, "decisions");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");

export interface DecisionStore {
  get(key: string): DecisionRecord | undefined;
  put(record: DecisionRecord): void;
  all(): DecisionRecord[];
}

// A cache file that cannot be read in full is never partly trusted. Skipping a
// damaged line could let an older record for the same pair show through.
export class CacheCorrupt extends Error {}

export class FileDecisionStore implements DecisionStore {
  private byKey = new Map<string, DecisionRecord>();
  // Pairs stored more than once with different answers. Identical repeats are harmless.
  readonly conflicts: string[] = [];

  constructor(private dir = DECISIONS_DIR) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".jsonl")) continue;
      const file = path.join(dir, name);
      const text = fs.readFileSync(file, "utf8");
      if (text.length && !text.endsWith("\n"))
        throw new CacheCorrupt(`${file} does not end with a newline: the last write was cut short. Run scripts/repair-cache.ts.`);
      text.split("\n").forEach((line, i) => {
        if (!line.trim()) return;
        let rec: DecisionRecord;
        try {
          rec = JSON.parse(line) as DecisionRecord;
        } catch {
          throw new CacheCorrupt(`${file} line ${i + 1} is not valid JSON. Run scripts/repair-cache.ts.`);
        }
        if (typeof rec.key !== "string" || !rec.raw || `${rec.vehicleId}.jsonl` !== name)
          throw new CacheCorrupt(`${file} line ${i + 1} is not a decision record for this file.`);
        const before = this.byKey.get(rec.key);
        if (before && stableStringify(before.raw.answers) !== stableStringify(rec.raw.answers)) this.conflicts.push(rec.key);
        this.byKey.set(rec.key, rec);
      });
    }
  }

  get(key: string) {
    return this.byKey.get(key);
  }

  put(record: DecisionRecord) {
    if (!/^[a-z0-9-]+$/.test(record.vehicleId)) throw new Error(`unsafe vehicle id: ${record.vehicleId}`);
    fs.mkdirSync(this.dir, { recursive: true });
    fs.appendFileSync(path.join(this.dir, `${record.vehicleId}.jsonl`), JSON.stringify(record) + "\n");
    this.byKey.set(record.key, record);
  }

  all() {
    return [...this.byKey.values()];
  }
}

export function eventsFileExists(): boolean {
  return fs.existsSync(EVENTS_FILE);
}

export function loadEvents(): AutomotiveEvent[] {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8")) as AutomotiveEvent[];
}

export function saveEvents(events: AutomotiveEvent[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${EVENTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(events, null, 1));
  fs.renameSync(tmp, EVENTS_FILE);
}
