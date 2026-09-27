// The owner's wording rules, checked against the site's own words. Notice text
// from NHTSA is data and is not covered here; this reads only source files.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.join(process.cwd(), "src");

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Things the site must never say in its own voice.
const FORBIDDEN: [string, RegExp][] = [
  ["a vehicle is unsafe", /\b(?:is|are) unsafe\b/i],
  ["a component will fail", /\bwill fail\b/i],
  ["stop driving", /\bstop driving\b/i],
  ["a detected defect", /\bdetected a defect\b/i],
  ["a predicted recall", /\bpredicted (?:the|a) recall\b/i],
  ["a probability of failure", /\bprobability of (?:a )?failure\b/i],
  ["urgency", /\bwarrants attention now\b|\bimmediately\b/i],
  ["an accuracy claim", /\b\d{1,3}(?:\.\d+)?% (?:accurate|accuracy|recall|precision)\b/i],
];

// The one place a forbidden phrase appears, as a denial.
const ALLOWED = ["It does not tell anyone to stop driving."];

test("the site's own words stay inside the product boundary", () => {
  const found: string[] = [];
  for (const file of sources(ROOT)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (ALLOWED.some((a) => line.includes(a))) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments are not shown to anyone
      for (const [name, re] of FORBIDDEN)
        if (re.test(line)) found.push(`${path.relative(process.cwd(), file)}:${i + 1} says ${name}: ${line.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(found, []);
});

test("pages and components never import the Jev client or read a key", () => {
  const found: string[] = [];
  for (const file of sources(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (rel === "lib/jev.ts") continue;
    const text = fs.readFileSync(file, "utf8");
    if (/from ["'][^"']*\/jev["']/.test(text)) found.push(`${rel} imports the Jev client`);
    if (/TYPESAFE_API_KEY|JEV_KEY_FILE/.test(text)) found.push(`${rel} refers to the key`);
  }
  assert.deepEqual(found, []);
});

test("client components import nothing that touches the file system", () => {
  const found: string[] = [];
  const serverOnly = /from ["']@\/lib\/(site|store|release|home|home-window|contract|jev|gate|hash)["']/;
  for (const file of sources(path.join(ROOT, "components"))) {
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      if (/^import type /.test(line)) continue;
      if (serverOnly.test(line)) found.push(`${path.basename(file)}: ${line.trim()}`);
    }
  }
  assert.deepEqual(found, []);
});
