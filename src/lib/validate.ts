// One validator for a model response, used when a response arrives, when the
// cache is read, and by the release gate. A response that fails is never stored
// and never displayed. No file system or network here.
import { AREAS, CONSEQUENCE_LEVELS } from "./schema";

const isProbability = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);

// Returns what is wrong with the answers, empty when they are usable.
export function answerProblems(raw: unknown): string[] {
  const out: string[] = [];
  const answers = obj(obj(raw)?.answers);
  if (!answers) return ["no answers object"];

  for (const name of ["relevance", "attention", "interrupt"]) {
    const a = obj(answers[name]);
    if (!a) out.push(`${name}: missing`);
    else if (!isProbability(a.noul)) out.push(`${name}: noul is not a probability`);
  }

  const c = obj(answers.consequence);
  const top = CONSEQUENCE_LEVELS.length - 1;
  if (!c) out.push("consequence: missing");
  else if (typeof c.score !== "number" || !Number.isFinite(c.score) || c.score < 0 || c.score > top)
    out.push(`consequence: score is not a number from 0 to ${top}`);

  const area = obj(answers.area);
  if (!area) out.push("area: missing");
  else {
    if (typeof area.choice !== "string" || !(area.choice in AREAS)) out.push("area: choice is not one of the listed areas");
    if (!isProbability(area.confidence)) out.push("area: confidence is not a probability");
  }
  return out;
}
