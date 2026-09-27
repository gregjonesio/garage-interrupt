// Looks through everything that would be published for personal details and
// for secrets. Run before the first commit and after every ingest.
//   npx tsx scripts/audit-publication.ts
// Prints counts and masked samples. Exits non-zero when anything needs a decision.
import fs from "node:fs";
import path from "node:path";
import { identifyingDetails } from "../src/ingest/privacy";
import { loadEvents } from "../src/lib/store";

const mask = (s: string) => s.replace(/[A-Za-z0-9]/g, (c, i: number) => (i % 3 === 0 ? c : "*"));

// Counted, not judged: contact details in text written by companies and NHTSA.
const PERSONAL: Record<string, RegExp> = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  phone: /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g,
};

// Instructions aimed at a model, inside source text.
const INJECTION = /\b(?:ignore (?:all |any )?(?:previous|prior|above) instructions|disregard (?:the )?(?:previous|above)|you are an? (?:ai|assistant|language model)|system prompt|respond with|answer (?:yes|true) to)\b/i;

const SECRETS: Record<string, RegExp> = {
  typesafe_key: /apikey_[A-Za-z0-9]{8,}/,
  bearer: /Bearer\s+[A-Za-z0-9._-]{20,}/,
  key_assignment: /\b(?:API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*["']?[A-Za-z0-9._-]{12,}/,
  private_key: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  local_secret_path: /[\\/]secrets[\\/]/i,
  user_profile_path: /C:[\\/]+Users[\\/]+[A-Za-z0-9._-]+/i,
};

let decisionsNeeded = 0;

// 1. Personal details in notice text. Owner complaints are judged by the same
// rule the ingest uses. Other notice types are written by manufacturers and
// NHTSA; contact details in them are business contacts and are only counted.
const events = loadEvents();
const found: Record<string, Record<string, number>> = {};
const injected: string[] = [];
for (const e of events) {
  const hay = [e.title ?? "", e.text, ...Object.values(e.facts ?? {})].join(" | ");
  if (e.type === "complaint") {
    const kinds = identifyingDetails(e.text);
    if (kinds.length) {
      decisionsNeeded++;
      console.log(`complaint ${e.id} contains: ${kinds.join(", ")}`);
    }
  } else {
    for (const [name, re] of Object.entries(PERSONAL)) {
      const n = [...hay.matchAll(re)].length;
      if (n) ((found[name] ??= {})[e.type] = (found[name][e.type] ?? 0) + n);
    }
  }
  if (INJECTION.test(hay)) injected.push(e.id);
}
console.log(`notices scanned: ${events.length}`);
console.log(`owner complaints with a personal detail: ${decisionsNeeded}`);
console.log("contact details in manufacturer and NHTSA text (business contacts, counted only):", found);
console.log(`text that addresses a model: ${injected.length}`, injected.slice(0, 10));

// 2. Anything beyond answers in the stored model responses.
const decisionsDir = path.join(process.cwd(), "data", "decisions");
const rawKeys = new Set<string>();
const recordKeys = new Set<string>();
if (fs.existsSync(decisionsDir)) {
  for (const f of fs.readdirSync(decisionsDir)) {
    for (const line of fs.readFileSync(path.join(decisionsDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const rec = JSON.parse(line) as { raw: Record<string, unknown> } & Record<string, unknown>;
      Object.keys(rec).forEach((k) => recordKeys.add(k));
      Object.keys(rec.raw).forEach((k) => rawKeys.add(k));
    }
  }
}
console.log(`\nfields in stored decisions: ${[...recordKeys].join(", ")}`);
console.log(`fields in stored raw responses: ${[...rawKeys].join(", ")}`);

// 3. Secrets and local paths in the files that would be committed.
const SKIP = new Set(["node_modules", ".next", ".git", ".cache", "decisions", "decisions-mock"]);
const SKIP_FILES = new Set(["package-lock.json", "events.json", "audit-publication.ts"]);
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (!SKIP_FILES.has(entry.name) && !/\.(png|ico|woff2?)$/i.test(entry.name)) out.push(full);
  }
  return out;
}
let secretHits = 0;
for (const file of walk(process.cwd())) {
  if (file.includes(`${path.sep}.impeccable${path.sep}review`)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const [name, re] of Object.entries(SECRETS)) {
    const m = text.match(re);
    if (m) {
      secretHits++;
      console.log(`\n${name} in ${path.relative(process.cwd(), file)}: ${mask(m[0]).slice(0, 60)}`);
    }
  }
}
console.log(`\nsecret or local-path matches in files to be committed: ${secretHits}`);

if (decisionsNeeded || secretHits || injected.length) process.exitCode = 1;
