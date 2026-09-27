// Benchmark arithmetic. Compares Jev's stored answers with a person's labels
// and weights the sample back to the full set of decisions. Pure: no file
// system, no clock, no network, so every figure the site shows can be tested.
import { verdictWith, type Rule } from "../verdict";

export type Answer = "yes" | "no" | "unclear";

export type Label = {
  itemId: string;
  // Does this notice meaningfully apply to or matter for this vehicle?
  primary: Answer;
  // Would you want the owner interrupted about this? Asked only when primary is yes.
  secondary: Answer | null;
  labeller: string;
  at: string;
  ms?: number; // time the labeller spent on the pair
};

export type Split = "tune" | "holdout";

export type Stratum = { id: string; rule: string; population: number; sampled: number };

// Jev's three probabilities for the pair, 0 to 1, as stored when the set was drawn.
export type Scores = { relevance: number; attention: number; interrupt: number };

export type Judged = {
  id: string;
  stratum: string;
  split: Split;
  scores: Scores;
  primary: Answer;
  secondary: Answer | null;
};

export type Confusion = { tp: number; fp: number; fn: number; tn: number };

export type Metrics = {
  n: number; // labelled yes or no
  counts: Confusion; // pairs in the sample
  weighted: Confusion; // estimated pairs in the full set of decisions
  precision: number | null;
  recall: number | null;
  f1: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
  noiseSuppression: number | null;
  interrupt: { n: number; precision: number | null; recall: number | null; counts: Confusion };
};

export type Interval = { low: number; high: number } | null;

export const MIN_LABELS = 200; // below this the figures are too loose to publish
export const MIN_PER_STRATUM = 5;
export const SWEEP = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const zero = (): Confusion => ({ tp: 0, fp: 0, fn: 0, tn: 0 });

// Weight of one labelled pair: how many pairs of the full set it stands for.
// Pairs labelled unclear are left out, so the remaining labels in a stratum
// stand for the whole stratum.
export function weights(items: Judged[], strata: Stratum[]): Map<string, number> {
  const decided = new Map<string, number>();
  for (const i of items) if (i.primary !== "unclear") decided.set(i.stratum, (decided.get(i.stratum) ?? 0) + 1);
  const out = new Map<string, number>();
  for (const s of strata) {
    const n = decided.get(s.id) ?? 0;
    if (n > 0) out.set(s.id, s.population / n);
  }
  return out;
}

export function evaluate(items: Judged[], strata: Stratum[], rule: Rule): Metrics {
  const w = weights(items, strata);
  const counts = zero();
  const weighted = zero();
  const ic = zero();
  const iw = zero();
  let n = 0;
  let inter = 0;
  for (const i of items) {
    if (i.primary === "unclear") continue;
    const weight = w.get(i.stratum) ?? 0;
    const verdict = verdictWith(rule, i.scores.relevance, i.scores.attention, i.scores.interrupt);
    const kept = verdict !== "IGNORE";
    const cell = i.primary === "yes" ? (kept ? "tp" : "fn") : kept ? "fp" : "tn";
    counts[cell]++;
    weighted[cell] += weight;
    n++;

    // A notice that does not matter to the vehicle is taken as one the owner
    // would not want to be interrupted about. A relevant one counts only when
    // the second question was answered yes or no.
    const want = i.primary === "no" ? false : i.secondary === "yes" ? true : i.secondary === "no" ? false : null;
    if (want === null) continue;
    const fired = verdict === "INTERRUPT";
    const icell = want ? (fired ? "tp" : "fn") : fired ? "fp" : "tn";
    ic[icell]++;
    iw[icell] += weight;
    inter++;
  }
  const precision = ratio(weighted.tp, weighted.tp + weighted.fp);
  const recall = ratio(weighted.tp, weighted.tp + weighted.fn);
  return {
    n,
    counts,
    weighted,
    precision,
    recall,
    f1: precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null,
    falsePositiveRate: ratio(weighted.fp, weighted.fp + weighted.tn),
    falseNegativeRate: ratio(weighted.fn, weighted.fn + weighted.tp),
    noiseSuppression: ratio(weighted.tn, weighted.tn + weighted.fp),
    interrupt: { n: inter, precision: ratio(iw.tp, iw.tp + iw.fp), recall: ratio(iw.tp, iw.tp + iw.fn), counts: ic },
  };
}

// Small seeded generator, so the same labels always give the same intervals.
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// 95% intervals by resampling the labelled pairs within each stratum. Strata
// that were labelled in full are resampled too, which makes the intervals a
// little wider than they need to be, never narrower.
export function intervals(
  items: Judged[],
  strata: Stratum[],
  rule: Rule,
  rounds = 1000,
  seed = 20260927,
): Record<"precision" | "recall" | "noiseSuppression", Interval> {
  const by = new Map<string, Judged[]>();
  for (const i of items) {
    if (i.primary === "unclear") continue;
    if (!by.has(i.stratum)) by.set(i.stratum, []);
    by.get(i.stratum)!.push(i);
  }
  const rand = rng(seed);
  const seen: Record<string, number[]> = { precision: [], recall: [], noiseSuppression: [] };
  for (let r = 0; r < rounds; r++) {
    const draw: Judged[] = [];
    for (const group of by.values()) for (let k = 0; k < group.length; k++) draw.push(group[Math.floor(rand() * group.length)]);
    const m = evaluate(draw, strata, rule);
    for (const key of ["precision", "recall", "noiseSuppression"] as const) if (m[key] !== null) seen[key].push(m[key]!);
  }
  const span = (values: number[]): Interval => {
    if (values.length < rounds / 2) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return { low: sorted[Math.floor(0.025 * sorted.length)], high: sorted[Math.min(sorted.length - 1, Math.floor(0.975 * sorted.length))] };
  };
  return { precision: span(seen.precision), recall: span(seen.recall), noiseSuppression: span(seen.noiseSuppression) };
}

export type StratumReport = Stratum & { labelled: number; yes: number; no: number; unclear: number };

export type Report = {
  setId: string;
  model: string;
  contract: string;
  drawnAt: string;
  population: number;
  sampled: number;
  labelled: { total: number; yes: number; no: number; unclear: number; withSecondary: number };
  labellers: string[];
  firstLabelAt: string | null;
  lastLabelAt: string | null;
  strata: StratumReport[];
  publishable: boolean;
  notPublishableBecause: string[];
  thresholds: { version: string; tunedOn: string | null; rule: Rule };
  // Figures at the thresholds the site uses. "all labels" while the thresholds
  // have never been tuned against labels; "holdout" once they have.
  headline: { basis: "all labels" | "holdout"; metrics: Metrics; intervals: ReturnType<typeof intervals> };
  // Every threshold set to the same value, on the tuning split only. Exploratory.
  sweep: { basis: "tune"; rows: { threshold: number; metrics: Metrics }[] };
};

export type SetHeader = {
  id: string;
  model: string;
  contract: string;
  drawnAt: string;
  population: number;
  strata: Stratum[];
};

export function report(
  set: SetHeader,
  items: { id: string; stratum: string; split: Split; scores: Scores }[],
  labels: Label[],
  thresholds: Rule & { version: string; tunedOn: string | null },
): Report {
  // The last label a person gave a pair is the one that counts.
  const latest = new Map<string, Label>();
  for (const l of labels) latest.set(l.itemId, l);

  const judged: Judged[] = [];
  for (const i of items) {
    const l = latest.get(i.id);
    if (l) judged.push({ ...i, primary: l.primary, secondary: l.secondary });
  }

  const strata: StratumReport[] = set.strata.map((s) => {
    const mine = judged.filter((j) => j.stratum === s.id);
    return {
      ...s,
      labelled: mine.length,
      yes: mine.filter((j) => j.primary === "yes").length,
      no: mine.filter((j) => j.primary === "no").length,
      unclear: mine.filter((j) => j.primary === "unclear").length,
    };
  });

  const decided = judged.filter((j) => j.primary !== "unclear");
  const reasons: string[] = [];
  if (decided.length < MIN_LABELS) reasons.push(`${decided.length} of the ${MIN_LABELS} labels needed`);
  for (const s of strata) {
    const need = Math.min(MIN_PER_STRATUM, s.sampled);
    if (s.yes + s.no < need) reasons.push(`stratum ${s.id} has ${s.yes + s.no} of the ${need} labels needed`);
  }

  const rule: Rule = { relevanceFloor: thresholds.relevanceFloor, watchAttention: thresholds.watchAttention, interrupt: thresholds.interrupt };
  const tuned = thresholds.tunedOn !== null;
  const basis = tuned ? judged.filter((j) => j.split === "holdout") : judged;
  const tune = judged.filter((j) => j.split === "tune");
  const used = labels.filter((l) => latest.get(l.itemId) === l && items.some((i) => i.id === l.itemId));
  const times = used.map((l) => l.at).sort();

  return {
    setId: set.id,
    model: set.model,
    contract: set.contract,
    drawnAt: set.drawnAt,
    population: set.population,
    sampled: items.length,
    labelled: {
      total: judged.length,
      yes: judged.filter((j) => j.primary === "yes").length,
      no: judged.filter((j) => j.primary === "no").length,
      unclear: judged.filter((j) => j.primary === "unclear").length,
      withSecondary: judged.filter((j) => j.primary === "yes" && (j.secondary === "yes" || j.secondary === "no")).length,
    },
    labellers: [...new Set(used.map((l) => l.labeller).filter(Boolean))].sort(),
    firstLabelAt: times[0] ?? null,
    lastLabelAt: times.at(-1) ?? null,
    strata,
    publishable: reasons.length === 0,
    notPublishableBecause: reasons,
    thresholds: { version: thresholds.version, tunedOn: thresholds.tunedOn, rule },
    headline: { basis: tuned ? "holdout" : "all labels", metrics: evaluate(basis, set.strata, rule), intervals: intervals(basis, set.strata, rule) },
    sweep: {
      basis: "tune",
      rows: SWEEP.map((t) => ({ threshold: t, metrics: evaluate(tune, set.strata, { relevanceFloor: t, watchAttention: t, interrupt: t }) })),
    },
  };
}
