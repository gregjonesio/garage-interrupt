// The ingestion contract. A source turns whatever it publishes into
// AutomotiveEvent records for a date window. NHTSA is the first source;
// manufacturer release-note feeds can be added by implementing this interface.
import { hashOf } from "../lib/hash";
import { eventContent } from "../lib/schema";
import type { AutomotiveEvent } from "../lib/types";

export type Window = { from: string; to: string }; // inclusive ISO dates

export type Collected = {
  events: AutomotiveEvent[];
  // Where the records were read from, so a snapshot can be traced to its input.
  file: { url: string; bytes: number; sha256: string; retrievedAt: string };
  rowsRead: number;
  // Reasons a record in the window was left out, with counts.
  leftOut: Record<string, number>;
  // Anything that means the source's layout cannot be trusted. Not empty means do not publish.
  problems: string[];
};

export interface EventSource {
  id: string;
  name: string;
  // A plain description of what is taken and what is left out, shown on the site.
  rule: string;
  collect(window: Window): Promise<Collected>;
}

export const inWindow = (date: string | null, w: Window) => !!date && date >= w.from && date <= w.to;

export function finalize(event: Omit<AutomotiveEvent, "hash">): AutomotiveEvent {
  const e = { ...event, hash: "" } as AutomotiveEvent;
  e.hash = hashOf(eventContent(e));
  return e;
}

// Collects the vehicles and components a multi-row record applies to.
// NHTSA repeats a record once per product and per component; every row counts.
export class ApplicabilityBuilder {
  private models = new Map<string, { make: string; model: string; years: Set<number> }>();
  private components = new Set<string>();

  addVehicle(make: string, model: string, year: number | null) {
    if (!make && !model) return;
    const key = `${make}|${model}`;
    if (!this.models.has(key)) this.models.set(key, { make, model, years: new Set() });
    if (year !== null) this.models.get(key)!.years.add(year);
  }

  addComponent(name: string) {
    if (name) this.components.add(name);
  }

  build() {
    return {
      vehicles: [...this.models.values()]
        .map((m) => ({ make: m.make, model: m.model, years: [...m.years].sort((a, b) => a - b) }))
        .sort((a, b) => (a.make + a.model).localeCompare(b.make + b.model)),
      components: [...this.components].sort(),
    };
  }
}
