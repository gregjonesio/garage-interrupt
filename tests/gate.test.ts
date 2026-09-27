import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRelease } from "../src/lib/gate";
import { goodInput, notice, record, answers } from "./helpers";

const has = (errors: string[], text: string) => errors.some((e) => e.includes(text));

test("a complete, consistent snapshot passes", () => {
  const r = checkRelease(goodInput());
  assert.deepEqual(r.errors, []);
  assert.equal(r.selected.size, 4);
  assert.equal(r.mode, "jev");
});

test("a missing events file fails, and so does an empty one", () => {
  const missing = goodInput();
  missing.events = null;
  assert.ok(has(checkRelease(missing).errors, "events.json is missing"));
  const empty = goodInput();
  empty.events = [];
  assert.ok(has(checkRelease(empty).errors, "holds no notices"));
});

test("an empty snapshot cannot pass by having nothing to cover", () => {
  const input = goodInput();
  input.events = [];
  input.records = [];
  assert.notDeepEqual(checkRelease(input).errors, []);
});

test("a pair with no decision fails", () => {
  const input = goodInput();
  input.records = input.records.slice(1);
  assert.ok(has(checkRelease(input).errors, "missing decision"));
});

test("notice text edited after hashing fails, so an old decision cannot show for new text", () => {
  const input = goodInput();
  input.events![0] = { ...input.events![0], text: "Different text." };
  assert.ok(has(checkRelease(input).errors, "notice hash"));
});

test("an answer missing from a stored response fails", () => {
  const input = goodInput();
  const raw = answers();
  delete (raw.answers as Record<string, unknown>).interrupt;
  input.records[0] = { ...input.records[0], raw };
  assert.ok(has(checkRelease(input).errors, "interrupt: missing"));
});

test("a stand-in record among Jev records fails", () => {
  const input = goodInput();
  input.records[0] = { ...input.records[0], mode: "mock", model: "mock", raw: { ...answers(), model: "mock" } };
  const errors = checkRelease(input).errors;
  assert.ok(has(errors, "mixes stand-in records"));
});

test("a store of only stand-in records fails unless allowed, and always fails on Vercel", () => {
  const input = goodInput();
  input.records = input.records.map((r) => ({ ...r, mode: "mock" as const, model: "mock", raw: { ...answers(), model: "mock" } }));
  assert.ok(has(checkRelease(input).errors, "no Jev decisions"));
  input.env.allowMock = true;
  assert.ok(!has(checkRelease(input).errors, "no Jev decisions"));
  input.env.onVercel = true;
  assert.ok(has(checkRelease(input).errors, "refused on Vercel"));
});

test("a record answered by another model fails", () => {
  const input = goodInput();
  input.records[0] = { ...input.records[0], raw: { ...answers(), model: "jev-9.9.9" } };
  assert.ok(has(checkRelease(input).errors, "model"));
});

test("a pair stored twice with different answers fails", () => {
  const input = goodInput();
  input.conflicts = [input.records[0].key];
  assert.ok(has(checkRelease(input).errors, "conflicting decisions"));
});

test("a record filed under the wrong vehicle fails", () => {
  const input = goodInput();
  input.records[0] = { ...input.records[0], vehicleId: "toyota-camry" };
  assert.ok(has(checkRelease(input).errors, "misfiled decision"));
});

test("two notices with identical content share one decision", () => {
  const input = goodInput();
  const twin = { ...input.events![0], id: "26V009000" };
  input.events!.push(twin);
  input.manifest!.events = { count: 3, sha256: "eventsha", byType: { recall: 3 } };
  input.manifest!.decisions.pairs = 6;
  const r = checkRelease(input);
  assert.deepEqual(r.errors, []);
  assert.equal(r.selected.size, 6);
});

test("an unfrozen snapshot fails, and a changed one fails against its manifest", () => {
  const unfrozen = goodInput();
  unfrozen.manifest = null;
  assert.ok(has(checkRelease(unfrozen).errors, "has not been frozen"));

  const changedEvents = goodInput();
  changedEvents.eventsSha256 = "different";
  assert.ok(has(checkRelease(changedEvents).errors, "events.json changed"));

  const changedQuestions = goodInput();
  changedQuestions.manifest!.contract = "othercontract";
  assert.ok(has(checkRelease(changedQuestions).errors, "questions or the model changed"));

  const changedFile = goodInput();
  changedFile.decisionFiles["ford-f150.jsonl"] = "zzz";
  assert.ok(has(checkRelease(changedFile).errors, "ford-f150.jsonl changed"));
});

test("attested decisions need a stated basis", () => {
  const input = goodInput();
  input.manifest!.provenance = { recorded: 0, attested: 4, basis: null };
  assert.ok(has(checkRelease(input).errors, "stated basis"));
});

test("links must go to NHTSA", () => {
  const badSource = goodInput();
  badSource.events![0] = notice("26V001000", { sourceUrl: "https://example.com/x" });
  badSource.records = badSource.vehicles.flatMap((v) => badSource.events!.map((e) => record(v, e)));
  assert.ok(has(checkRelease(badSource).errors, "source link"));

  const badDoc = goodInput();
  badDoc.events![0] = { ...badDoc.events![0], documents: [{ name: "x", url: "javascript:alert(1)" }] };
  assert.ok(has(checkRelease(badDoc).errors, "document link"));
});

test("a complaint carrying a personal detail fails", () => {
  const input = goodInput();
  input.events![0] = notice("11760000", { type: "complaint", text: "Call me at 555-867-5309 about my truck." });
  input.records = input.vehicles.flatMap((v) => input.events!.map((e) => record(v, e)));
  input.manifest!.events.byType = { complaint: 1, recall: 1 };
  assert.ok(has(checkRelease(input).errors, "personal detail"));
});

test("a production deploy with a localhost address fails", () => {
  const input = goodInput();
  input.env = { ...input.env, vercelEnv: "production", siteUrl: "http://localhost:3217" };
  assert.ok(has(checkRelease(input).errors, "public address"));
});

test("a systemic fault is reported with a count, not one line per pair", () => {
  const input = goodInput();
  input.events = Array.from({ length: 40 }, (_, i) => notice(`26V${String(100 + i)}000`));
  input.records = [];
  const errors = checkRelease(input).errors;
  assert.ok(errors.length < 40);
  assert.ok(has(errors, "more not listed"));
});
