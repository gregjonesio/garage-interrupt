// Jev client. Scripts only: this file reads the API key and must never be
// imported from a page or a component. The deployed site makes no calls.
import fs from "node:fs";
import { buildState, JEV_MODEL, QUESTIONS } from "./schema";
import type { AutomotiveEvent, JevRaw, VehicleState } from "./types";
import { answerProblems } from "./validate";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const ATTEMPTS = 5;

export type JevMode = "jev" | "mock";

let cachedKey: string | null = null;

// Key order: TYPESAFE_API_KEY in the environment, else a local KEY=VALUE file
// named by JEV_KEY_FILE. The value is never logged.
function loadKey(): string {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env.TYPESAFE_API_KEY;
  if (fromEnv) return (cachedKey = fromEnv.trim());
  const file = process.env.JEV_KEY_FILE;
  if (!file) throw new Error("No Jev key: set TYPESAFE_API_KEY or JEV_KEY_FILE");
  const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const m = raw.match(/^\s*(?:API_KEY|TYPESAFE_API_KEY)\s*=\s*(.+?)\s*$/m);
  if (!m) throw new Error("No API_KEY line in the file named by JEV_KEY_FILE");
  return (cachedKey = m[1]);
}

export type AskResult =
  | { ok: true; raw: JevRaw; ms: number; mode: JevMode; attempts: number }
  // fatal: the whole run should stop, because every further call would fail the same way.
  | { ok: false; error: string; ms: number; mode: JevMode; attempts: number; fatal: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Exponential backoff with jitter, or what the server asked for, capped at 30 s.
function waitFor(attempt: number, retryAfter: string | null): number {
  const asked = Number(retryAfter);
  if (retryAfter && Number.isFinite(asked) && asked > 0) return Math.min(asked * 1000, 30000);
  return Math.min(800 * 2 ** attempt, 30000) * (0.75 + Math.random() * 0.5);
}

type Fetch = typeof fetch;

export async function askJev(
  vehicle: VehicleState,
  event: AutomotiveEvent,
  mode: JevMode,
  transport: Fetch = fetch,
): Promise<AskResult> {
  if (mode === "mock") return mockAsk(vehicle, event);
  const body = JSON.stringify({ state: buildState(vehicle, event), questions: QUESTIONS, model: JEV_MODEL });
  let lastError = "unknown";
  const started = Date.now();
  let attempt = 0;
  for (; attempt < ATTEMPTS; attempt++) {
    const t0 = Date.now();
    try {
      const res = await transport(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${loadKey()}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(15000),
      });
      const ms = Date.now() - t0;
      if (res.status === 401 || res.status === 403)
        return { ok: false, error: `HTTP ${res.status}: the key was refused`, ms, mode, attempts: attempt + 1, fatal: true };
      if (res.status === 429 || res.status === 529 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        await sleep(waitFor(attempt, res.headers.get("retry-after")));
        continue;
      }
      if (!res.ok) {
        const text = (await res.text()).slice(0, 300);
        return { ok: false, error: `HTTP ${res.status}: ${text}`, ms, mode, attempts: attempt + 1, fatal: res.status === 422 };
      }
      const raw = (await res.json()) as JevRaw;
      // A response that is missing an answer is a failure. Stored as it is, a
      // missing answer would later read as zero, which is a confident "ignore".
      const problems = answerProblems(raw);
      if (problems.length) return { ok: false, error: `unusable response: ${problems.join("; ")}`, ms, mode, attempts: attempt + 1, fatal: false };
      if (raw.model !== JEV_MODEL)
        return { ok: false, error: `answered by ${raw.model}, expected ${JEV_MODEL}`, ms, mode, attempts: attempt + 1, fatal: true };
      return { ok: true, raw, ms, mode, attempts: attempt + 1 };
    } catch (e) {
      lastError = String((e as Error).message ?? e).slice(0, 200);
      await sleep(waitFor(attempt, null));
    }
  }
  return { ok: false, error: lastError, ms: Date.now() - started, mode, attempts: attempt, fatal: false };
}

// Mock mode: a plain keyword heuristic that returns the same shape as Jev so the
// interface can be developed offline. Its output is labelled "mock" everywhere,
// is stored in its own directory, and must never be shown as a Jev decision.
function mockAsk(vehicle: VehicleState, event: AutomotiveEvent): AskResult {
  const hay = `${event.manufacturer ?? ""} ${event.title ?? ""} ${event.text}`.toLowerCase();
  const applies = event.structuredApplicability?.vehicles ?? [];
  const makeHit =
    hay.includes(vehicle.make.toLowerCase()) ||
    applies.some((v) => v.make.toLowerCase() === vehicle.make.toLowerCase());
  const modelHit =
    hay.includes(vehicle.model.toLowerCase()) ||
    applies.some((v) => v.model.toLowerCase() === vehicle.model.toLowerCase());
  const yearHit =
    hay.includes(String(vehicle.year)) || applies.some((v) => v.years.includes(vehicle.year));
  const relevance = makeHit && modelHit ? (yearHit ? 0.9 : 0.55) : makeHit ? 0.2 : 0.03;
  const priorityHit = vehicle.ownerPriorities.some((p) => hay.includes(p.toLowerCase()));
  const weight = event.type === "recall" ? 0.9 : event.type === "complaint" ? 0.45 : 0.65;
  const attention = +(relevance * (priorityHit ? 1 : 0.8) * weight).toFixed(3);
  const interrupt = +(attention * (event.type === "recall" ? 1 : 0.75)).toFixed(3);
  const level = Math.min(4, Math.round(attention * 4));
  const probabilities: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0 };
  probabilities[String(level)] = 1;
  const raw: JevRaw = {
    model: "mock",
    answers: {
      relevance: { type: "noul", noul: relevance },
      attention: { type: "noul", noul: attention },
      interrupt: { type: "noul", noul: interrupt },
      consequence: { type: "score", score: level, confidence: 1, probabilities },
      area: { type: "choice", choice: relevance > 0.5 ? "other" : "none", confidence: 0, probabilities: {} },
    },
    usage: { input_tokens: 0, output_tokens: 0 },
  };
  return { ok: true, raw, ms: 0, mode: "mock", attempts: 1 };
}
