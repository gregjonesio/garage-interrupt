import { createHash } from "node:crypto";

// Stable JSON: object keys sorted, so the same state always hashes the same.
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .filter((k) => obj[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
      .join(",") +
    "}"
  );
}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

export function decisionKey(vehicleHash: string, eventHash: string, schemaVersion: string): string {
  return `${vehicleHash}:${eventHash}:${schemaVersion}`;
}
