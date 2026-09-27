// Runs the release gate and prints the result. The same gate runs inside the
// build, so this is for checking before a build, and for CI.
//   npx tsx scripts/verify-data.ts
import { readRelease } from "../src/lib/release";

const release = readRelease();
if (release.errors.length) {
  console.error(`Release gate: ${release.errors.length} problems`);
  for (const e of release.errors) console.error("  " + e);
  process.exit(1);
}
console.log(
  `Release gate passed: ${release.events.length} notices, ${release.selected.size} decisions ` +
    `(${release.provenance.recorded} recorded, ${release.provenance.attested} attested), frozen ${release.manifest?.frozenAt}`,
);
