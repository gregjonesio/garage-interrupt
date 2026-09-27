// NHTSA flat files: official bulk downloads from static.nhtsa.gov/odi/ffdd.
// Tab-delimited, no header row. Field layouts come from the definition files
// NHTSA publishes beside each download (TSBS.txt, RCL.txt, INV.txt, CMPL.txt).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

const BASE = "https://static.nhtsa.gov/odi/ffdd/";
export const CACHE_DIR = path.join(process.cwd(), ".cache", "nhtsa");
const MAX_ZIP_BYTES = 400 * 1024 * 1024; // the largest file today is about 110 MB

export type SourceFile = {
  path: string;
  url: string;
  bytes: number;
  sha256: string;
  retrievedAt: string; // when this copy was downloaded
};

function describe(local: string, relPath: string): SourceFile {
  const stat = fs.statSync(local);
  const sha256 = createHash("sha256").update(fs.readFileSync(local)).digest("hex");
  return { path: local, url: BASE + relPath, bytes: stat.size, sha256, retrievedAt: stat.mtime.toISOString() };
}

// relPath example: "tsbs/TSBS_RECEIVED_2025-2026.zip". A cached copy is used
// unless refresh is asked for; the manifest records which copy was read.
export async function fetchFlatFile(relPath: string, opts: { refresh?: boolean } = {}): Promise<SourceFile> {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const local = path.join(CACHE_DIR, relPath.replace(/\//g, "__"));
  if (fs.existsSync(local) && !opts.refresh) return describe(local, relPath);

  const res = await fetch(BASE + relPath, { signal: AbortSignal.timeout(10 * 60 * 1000) });
  if (!res.ok || !res.body) throw new Error(`NHTSA download failed: ${relPath} HTTP ${res.status}`);
  const tmp = local + ".part";
  await pipeline(Readable.fromWeb(res.body as never), fs.createWriteStream(tmp));
  const bytes = fs.statSync(tmp).size;
  if (bytes === 0 || bytes > MAX_ZIP_BYTES) {
    fs.rmSync(tmp);
    throw new Error(`NHTSA download has an implausible size: ${relPath} is ${bytes} bytes`);
  }
  // Opening the archive proves the download is complete: the index is at the end of a zip.
  await dataEntry(tmp).catch((e) => {
    fs.rmSync(tmp);
    throw new Error(`NHTSA download is not a readable archive: ${relPath}: ${(e as Error).message}`);
  });
  fs.renameSync(tmp, local);
  return describe(local, relPath);
}

// The one data file inside the archive, chosen by name, never by position.
function dataEntry(zipPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error("zip did not open"));
      const names: string[] = [];
      zip.on("entry", (entry) => {
        if (!/\/$/.test(entry.fileName) && /\.txt$/i.test(entry.fileName)) names.push(entry.fileName);
        zip.readEntry();
      });
      zip.on("end", () => {
        if (names.length === 1) resolve(names[0]);
        else reject(new Error(`expected one .txt file in ${path.basename(zipPath)}, found ${names.length}: ${names.join(", ")}`));
      });
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

function openEntry(zipPath: string, name: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error("zip did not open"));
      zip.on("entry", (entry) => {
        if (entry.fileName !== name) return zip.readEntry();
        zip.openReadStream(entry, (e, stream) => (e || !stream ? reject(e ?? new Error("no stream")) : resolve(stream)));
      });
      zip.on("end", () => reject(new Error(`${name} not found in ${zipPath}`)));
      zip.on("error", reject);
      zip.readEntry();
    });
  });
}

// What a file must look like for the fixed positions the adapters read to mean
// what they are taken to mean. Checked on every row of the file, not only the
// rows in the date window, so a shifted date column cannot hide itself.
export type Layout = {
  name: string;
  fields: number;
  id: { index: number; pattern: RegExp };
  date: { index: number; mayBeBlank: boolean };
  make: number;
};

export class LayoutCheck {
  rows = 0;
  wrongWidth = 0;
  badId = 0;
  badDate = 0;
  blankMake = 0;

  constructor(readonly layout: Layout) {}

  see(r: string[]) {
    this.rows++;
    const l = this.layout;
    if (r.length !== l.fields) {
      this.wrongWidth++;
      return;
    }
    if (!l.id.pattern.test(r[l.id.index])) this.badId++;
    const d = r[l.date.index];
    if (d ? !isoDate(d) : !l.date.mayBeBlank) this.badDate++;
    if (!r[l.make]) this.blankMake++;
  }

  // The files are regular today: every row has the documented width. Any row of
  // the wrong width, or more than one row in a thousand failing a field check,
  // means the layout moved and nothing read from it can be trusted.
  problems(): string[] {
    const out: string[] = [];
    const share = (n: number) => (this.rows ? n / this.rows : 1);
    if (this.rows === 0) out.push(`${this.layout.name}: the file has no rows`);
    if (this.wrongWidth) out.push(`${this.layout.name}: ${this.wrongWidth} rows do not have ${this.layout.fields} fields`);
    if (share(this.badId) > 0.001) out.push(`${this.layout.name}: ${this.badId} rows have an id that does not look like one`);
    if (share(this.badDate) > 0.001) out.push(`${this.layout.name}: ${this.badDate} rows have an unusable date`);
    if (share(this.blankMake) > 0.01) out.push(`${this.layout.name}: ${this.blankMake} rows have no make`);
    return out;
  }
}

// Yields each row as an array of trimmed fields, and feeds every row to the check.
export async function* rows(zipPath: string, check?: LayoutCheck): AsyncGenerator<string[]> {
  const stream = await openEntry(zipPath, await dataEntry(zipPath));
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const r = line.split("\t").map((f) => f.trim());
    check?.see(r);
    yield r;
  }
}

// YYYYMMDD -> YYYY-MM-DD, or null when the field is empty, malformed, or not a real date.
export function isoDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1960 || y > 2100) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function modelYear(field: string | undefined): number | null {
  const n = Number(field);
  return Number.isInteger(n) && n >= 1950 && n <= 2035 ? n : null; // 9999 means unknown
}

// Some flat-file text was written in Windows-1252 and arrives with stray
// control characters. Collapse whitespace and drop anything unprintable.
export function cleanText(s: string | undefined): string {
  return (s ?? "").replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim();
}
