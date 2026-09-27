// The record the ingest writes about what it read. Scripts and build only.
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./store";

export type WindowInfo = {
  from: string;
  to: string;
  ingestedAt: string;
  sources: {
    id: string;
    name: string;
    rule: string;
    events: number;
    rowsRead?: number;
    leftOut?: Record<string, number>;
    file?: { url: string; bytes: number; sha256: string; retrievedAt: string };
  }[];
};

export function loadWindow(): WindowInfo | null {
  const file = path.join(DATA_DIR, "window.json");
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as WindowInfo) : null;
}
