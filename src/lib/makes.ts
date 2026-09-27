// Does a notice name a vehicle's make? Used to ORDER work and to draw benchmark
// strata. It is never used to leave a notice out: measured on the published
// decisions, a make rule would have dropped one of the forty notices that
// reached a vehicle (scripts/measure-order.ts). No file system here.
import type { AutomotiveEvent } from "./types";

// NHTSA files a notice under the manufacturer's corporate name, which is often
// not the name on the vehicle.
const CORPORATE: Record<string, string[]> = {
  chevrolet: ["general motors"],
  gmc: ["general motors"],
  buick: ["general motors"],
  cadillac: ["general motors"],
  ram: ["chrysler", "fca us", "stellantis"],
  jeep: ["chrysler", "fca us", "stellantis"],
  dodge: ["chrysler", "fca us", "stellantis"],
  chrysler: ["fca us", "stellantis"],
  lincoln: ["ford motor"],
  lexus: ["toyota"],
  acura: ["honda"],
  infiniti: ["nissan"],
  genesis: ["hyundai"],
  audi: ["volkswagen"],
  mini: ["bmw"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function namesMake(make: string, e: AutomotiveEvent): boolean {
  const m = make.trim().toLowerCase();
  if (!m) return false;
  if ((e.structuredApplicability?.vehicles ?? []).some((a) => a.make.toLowerCase() === m)) return true;
  const word = new RegExp(`(?:^|[^a-z0-9])${escape(m)}(?:[^a-z0-9]|$)`, "i");
  const manufacturer = (e.manufacturer ?? "").toLowerCase();
  if (word.test(manufacturer)) return true;
  if ((CORPORATE[m] ?? []).some((c) => manufacturer.includes(c))) return true;
  return word.test(`${e.title ?? ""} ${e.text}`);
}
