import assert from "node:assert/strict";
import { test } from "node:test";
import { identifyingDetails } from "../src/ingest/privacy";
import { ApplicabilityBuilder } from "../src/ingest/source";
import { cleanText, isoDate, LayoutCheck, modelYear } from "../src/ingest/nhtsa/flatfile";
import { LAYOUTS } from "../src/ingest/nhtsa";
import { CONTRACT } from "../src/lib/contract";
import { decisionKey, hashOf, stableStringify } from "../src/lib/hash";
import { fieldCheck } from "../src/lib/home";
import { eventContent, JEV_MODEL, QUESTIONS, STATE_SHAPE, yearRanges } from "../src/lib/schema";
import { answerProblems } from "../src/lib/validate";
import { derive, verdictFor } from "../src/lib/verdict";
import { displayTitle, ruleSentence, verdictSentence } from "../src/lib/view";
import { answers, notice, record, vehicle } from "./helpers";

test("verdict: relevance under one half is always ignored", () => {
  assert.equal(verdictFor(0.49, 0.99, 0.99), "IGNORE");
});

test("verdict: thresholds are inclusive at exactly one half", () => {
  assert.equal(verdictFor(0.5, 0.5, 0.5), "INTERRUPT");
  assert.equal(verdictFor(0.5, 0.5, 0.49), "WATCH");
  assert.equal(verdictFor(0.5, 0.49, 0.49), "IGNORE");
  assert.equal(verdictFor(0.9, 0.2, 0.6), "INTERRUPT");
});

test("derive reads the five answers", () => {
  const v = vehicle("ford-f150", "Ford", "F-150", 2022);
  const d = derive(record(v, notice("26V001000")));
  assert.equal(d.verdict, "INTERRUPT");
  assert.equal(d.area, "brakes");
  assert.equal(d.consequence, 3.2);
});

test("answers: a complete response has no problems", () => {
  assert.deepEqual(answerProblems(answers()), []);
});

test("answers: missing, out of range and unknown values are all caught", () => {
  assert.deepEqual(answerProblems(null), ["no answers object"]);
  assert.deepEqual(answerProblems({ answers: {} }).length, 5);
  const bad = answers();
  const a = bad.answers as Record<string, Record<string, unknown>>;
  a.relevance.noul = 1.2;
  a.attention.noul = "0.5";
  a.consequence.score = 5;
  a.area.choice = "windscreen";
  const problems = answerProblems(bad).join(" | ");
  for (const word of ["relevance", "attention", "consequence", "area"]) assert.ok(problems.includes(word), word);
});

test("answers: a fractional score is accepted, since Jev returns a weighted score", () => {
  const ok = answers();
  (ok.answers as Record<string, Record<string, unknown>>).consequence.score = 1.43;
  assert.deepEqual(answerProblems(ok), []);
});

test("hash: key order does not change the hash, content does", () => {
  assert.equal(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] }), stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }));
  assert.equal(hashOf({ a: 1, b: 2 }), hashOf({ b: 2, a: 1 }));
  assert.notEqual(hashOf({ a: 1 }), hashOf({ a: 2 }));
  assert.equal(decisionKey("v", "e", "c"), "v:e:c");
});

test("contract: covers the questions, the model and the state shape", () => {
  assert.equal(CONTRACT, hashOf({ model: JEV_MODEL, questions: QUESTIONS, stateShape: STATE_SHAPE }));
  const edited = { ...QUESTIONS, attention: { ...QUESTIONS.attention, instructions: "Different wording?" } };
  assert.notEqual(CONTRACT, hashOf({ model: JEV_MODEL, questions: edited, stateShape: STATE_SHAPE }));
  assert.notEqual(CONTRACT, hashOf({ model: "jev-2.0.0", questions: QUESTIONS, stateShape: STATE_SHAPE }));
});

test("notice hash: follows what the model reads, not links added later", () => {
  const e = notice("26V001000");
  assert.equal(hashOf(eventContent({ ...e, documents: [{ name: "x", url: "https://static.nhtsa.gov/x.pdf" }] })), e.hash);
  assert.equal(hashOf(eventContent({ ...e, sourceUrl: "https://www.nhtsa.gov/other" })), e.hash);
  assert.notEqual(hashOf(eventContent({ ...e, text: "Changed." })), e.hash);
  assert.notEqual(hashOf(eventContent({ ...e, title: "Changed" })), e.hash);
});

test("yearRanges joins runs and keeps gaps", () => {
  assert.equal(yearRanges([2023, 2021, 2022, 2025, 2022]), "2021-2023, 2025");
  assert.equal(yearRanges([2020]), "2020");
  assert.equal(yearRanges([]), "");
});

test("dates: only real calendar dates in the expected form", () => {
  assert.equal(isoDate("20260903"), "2026-09-03");
  assert.equal(isoDate("20260231"), null);
  assert.equal(isoDate("2026-09-03"), null);
  assert.equal(isoDate(""), null);
  assert.equal(isoDate("FORD"), null);
});

test("model year: 9999 means unknown", () => {
  assert.equal(modelYear("2022"), 2022);
  assert.equal(modelYear("9999"), null);
  assert.equal(modelYear(""), null);
});

test("cleanText collapses whitespace and drops control characters", () => {
  assert.equal(cleanText("  a\u0000b \n  c\u0092 "), "a b c");
});

test("layout check: a shifted or widened file is caught", () => {
  const l = LAYOUTS.recalls;
  const good = Array.from({ length: l.fields }, () => "x");
  good[l.id.index] = "26V001000";
  good[l.date.index] = "20260901";
  good[l.make] = "FORD";

  const ok = new LayoutCheck(l);
  for (let i = 0; i < 100; i++) ok.see(good);
  assert.deepEqual(ok.problems(), []);

  const wide = new LayoutCheck(l);
  wide.see([...good, "extra"]);
  assert.ok(wide.problems().join().includes("fields"));

  // Same width, columns moved one to the right: the id and date positions now hold other things.
  const shifted = new LayoutCheck(l);
  for (let i = 0; i < 100; i++) shifted.see(["", ...good.slice(0, -1)]);
  const problems = shifted.problems().join(" | ");
  assert.ok(problems.includes("id") && problems.includes("date"));

  assert.ok(new LayoutCheck(l).problems().join().includes("no rows"));
});

test("a record filed once per product keeps every product and year", () => {
  const b = new ApplicabilityBuilder();
  b.addVehicle("FORD", "F-150", 2021);
  b.addVehicle("FORD", "F-150", 2023);
  b.addVehicle("FORD", "F-150", 2022);
  b.addVehicle("FORD", "EXPLORER", null);
  b.addComponent("BRAKES");
  b.addComponent("BRAKES");
  assert.deepEqual(b.build(), {
    vehicles: [
      { make: "FORD", model: "EXPLORER", years: [] },
      { make: "FORD", model: "F-150", years: [2021, 2022, 2023] },
    ],
    components: ["BRAKES"],
  });
});

test("privacy: identifying details are found, ordinary text is not", () => {
  assert.deepEqual(identifyingDetails("The transmission failed at 40 mph after 12000 miles in 2022."), []);
  assert.deepEqual(identifyingDetails("write to jane.doe@example.com"), ["email"]);
  assert.deepEqual(identifyingDetails("my number is (555) 867-5309"), ["phone"]);
  assert.deepEqual(identifyingDetails("VIN 1FTFW1E80NFA00001 is affected"), ["vin"]);
  assert.deepEqual(identifyingDetails("Ford case number CAS-1234567 was opened"), ["case_number"]);
  assert.deepEqual(identifyingDetails("the license plate light failed"), []);
});

test("field check: make, model and year against NHTSA's fields", () => {
  const v = vehicle("ford-f150", "Ford", "F-150", 2022);
  const applies = (vehicles: { make: string; model: string; years: number[] }[]) =>
    notice("x", { structuredApplicability: { vehicles, components: [] } });
  assert.deepEqual(fieldCheck(v, applies([{ make: "FORD", model: "F-150", years: [2021, 2022] }])), { makeNamed: true, modelNamed: "F-150", year: "listed" });
  assert.deepEqual(fieldCheck(v, applies([{ make: "FORD", model: "F-150 HYBRID", years: [2023] }])), { makeNamed: true, modelNamed: "F-150 HYBRID", year: "not_listed" });
  assert.deepEqual(fieldCheck(v, applies([{ make: "FORD", model: "F-150", years: [] }])), { makeNamed: true, modelNamed: "F-150", year: "not_stated" });
  assert.deepEqual(fieldCheck(v, applies([{ make: "FORD", model: "F-150 LIGHTNING BEV", years: [2022] }])), { makeNamed: true, modelNamed: null, year: "n/a" });
  assert.deepEqual(fieldCheck(v, applies([{ make: "TOYOTA", model: "CAMRY", years: [2022] }])), { makeNamed: false, modelNamed: null, year: "n/a" });
});

test("display title shortens a recall's component path and nothing else", () => {
  assert.equal(displayTitle("recall", "Recall 26E063000: ELECTRICAL SYSTEM:PROPULSION SYSTEM:SOFTWARE"), "Recall 26E063000: ELECTRICAL SYSTEM");
  assert.equal(displayTitle("recall", "Recall 26V597000: BRAKES"), "Recall 26V597000: BRAKES");
  assert.equal(displayTitle("complaint", "Owner complaint 1: FORD F-150 2022"), "Owner complaint 1: FORD F-150 2022");
});

test("sentences: the words never say more than the figures", () => {
  assert.ok(verdictSentence("recall", "INTERRUPT", 96).includes("highly relevant"));
  assert.ok(!verdictSentence("recall", "INTERRUPT", 62).includes("highly"));
  assert.ok(verdictSentence("complaint", "WATCH", 70).endsWith("Owner complaints are unverified reports."));
  for (const verdict of ["IGNORE", "WATCH", "INTERRUPT"] as const)
    for (const s of [verdictSentence("recall", verdict, 90), ruleSentence(verdict, 90, 60, 60)])
      assert.ok(!/\b(now|immediately|urgent|unsafe|defect|fail)/i.test(s), s);
  assert.ok(ruleSentence("IGNORE", 12, 80, 80).includes("under one half"));
});
