import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { askJev } from "../src/lib/jev";
import { JEV_MODEL } from "../src/lib/schema";
import { CacheCorrupt, FileDecisionStore } from "../src/lib/store";
import { answers, notice, record, vehicle } from "./helpers";

const v = vehicle("ford-f150", "Ford", "F-150", 2022);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "gi-store-"));

test("store: what is put can be read back by a new store", () => {
  const dir = tmp();
  const rec = record(v, notice("26V001000"));
  new FileDecisionStore(dir).put(rec);
  assert.deepEqual(new FileDecisionStore(dir).get(rec.key), rec);
});

test("store: a cut-off last line stops the load instead of being skipped", () => {
  const dir = tmp();
  const rec = record(v, notice("26V001000"));
  const line = JSON.stringify(rec);
  fs.writeFileSync(path.join(dir, "ford-f150.jsonl"), line + "\n" + line.slice(0, 80));
  assert.throws(() => new FileDecisionStore(dir), CacheCorrupt);
});

test("store: a damaged line in the middle stops the load", () => {
  const dir = tmp();
  const line = JSON.stringify(record(v, notice("26V001000")));
  fs.writeFileSync(path.join(dir, "ford-f150.jsonl"), `${line}\n{"key": broken\n${line}\n`);
  assert.throws(() => new FileDecisionStore(dir), /line 2/);
});

test("store: a record in another vehicle's file stops the load", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, "toyota-camry.jsonl"), JSON.stringify(record(v, notice("26V001000"))) + "\n");
  assert.throws(() => new FileDecisionStore(dir), CacheCorrupt);
});

test("store: the same pair with different answers is reported, identical repeats are not", () => {
  const dir = tmp();
  const a = record(v, notice("26V001000"));
  const same = JSON.stringify(a);
  fs.writeFileSync(path.join(dir, "ford-f150.jsonl"), `${same}\n${same}\n`);
  assert.deepEqual(new FileDecisionStore(dir).conflicts, []);
  const b = { ...a, raw: answers(0.1, 0.1, 0.1) };
  fs.writeFileSync(path.join(dir, "ford-f150.jsonl"), `${same}\n${JSON.stringify(b)}\n`);
  assert.deepEqual(new FileDecisionStore(dir).conflicts, [a.key]);
});

test("store: a vehicle id that is not a safe file name is refused", () => {
  const rec = { ...record(v, notice("26V001000")), vehicleId: "../escape" };
  assert.throws(() => new FileDecisionStore(tmp()).put(rec), /unsafe vehicle id/);
});

// The client is tested against a stand-in transport. No call leaves the machine.
process.env.TYPESAFE_API_KEY = "not-a-key";
const e = notice("26V001000");
const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });

test("client: a complete response is accepted", async () => {
  const r = await askJev(v.state, e, "jev", (async () => reply(200, answers())) as typeof fetch);
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 1);
});

test("client: the key is sent as a bearer token and the model is pinned", async () => {
  let seen: RequestInit | undefined;
  await askJev(v.state, e, "jev", (async (_url: unknown, init?: RequestInit) => {
    seen = init;
    return reply(200, answers());
  }) as typeof fetch);
  assert.equal((seen!.headers as Record<string, string>).Authorization, "Bearer not-a-key");
  assert.equal(JSON.parse(String(seen!.body)).model, JEV_MODEL);
});

test("client: a response missing an answer is a failure, not a stored zero", async () => {
  const partial = answers();
  delete (partial.answers as Record<string, unknown>).attention;
  const r = await askJev(v.state, e, "jev", (async () => reply(200, partial)) as typeof fetch);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.error.includes("attention"));
});

test("client: a refused key stops the run", async () => {
  let calls = 0;
  const r = await askJev(v.state, e, "jev", (async () => {
    calls++;
    return reply(401, "no");
  }) as typeof fetch);
  assert.ok(!r.ok && r.fatal);
  assert.equal(calls, 1);
});

test("client: an answer from another model stops the run", async () => {
  const r = await askJev(v.state, e, "jev", (async () => reply(200, { ...answers(), model: "jev-9.9.9" })) as typeof fetch);
  assert.ok(!r.ok && r.fatal);
});

test("client: a rate limit is retried after the wait the server asked for", async () => {
  let calls = 0;
  const r = await askJev(v.state, e, "jev", (async () => {
    calls++;
    return calls === 1 ? reply(429, "slow down", { "retry-after": "0.01" }) : reply(200, answers());
  }) as typeof fetch);
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 2);
});

test("client: stand-in mode makes no call", async () => {
  let calls = 0;
  const r = await askJev(v.state, e, "mock", (async () => {
    calls++;
    return reply(500, "");
  }) as typeof fetch);
  assert.equal(calls, 0);
  assert.ok(r.ok && r.mode === "mock" && r.raw.model === "mock");
});
