"use client";

import { useEffect, useRef } from "react";
import type { VehicleView } from "@/lib/view";

type Props = { vehicles: VehicleView[]; selected: string; onSelect: (id: string) => void };

// One guide sign per vehicle, each with its exit number on a plaque above the
// top edge. The chosen one turns to a white plate. Yellow is kept for interrupts.
export function VehiclePicker({ vehicles, selected, onSelect }: Props) {
  const strip = useRef<HTMLDivElement>(null);

  // On a phone the signs are a sideways strip; keep the chosen one in view.
  useEffect(() => {
    const box = strip.current;
    const on = box?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!box || !on || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: on.offsetLeft - 16, behavior: "auto" });
  }, [selected]);

  return (
    <div>
      <div
        ref={strip}
        role="group"
        aria-label="Choose a vehicle"
        className="relative -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-x-3 sm:gap-y-2 sm:overflow-visible sm:px-0 lg:grid-cols-8"
      >
        {vehicles.map((v) => {
          const on = v.id === selected;
          const face = on ? "sign-fact" : "";
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              aria-label={`Exit ${v.exit}, ${v.title}, ${v.counts.interrupt} ${v.counts.interrupt === 1 ? "interrupt" : "interrupts"}`}
              onClick={() => onSelect(v.id)}
              className="group min-w-[136px] shrink-0 snap-start text-left sm:min-w-0"
            >
              <span className="flex justify-end pr-3">
                <span
                  className={`sign sign-sm sign-flat ${face} legend -mb-[3px] rounded-b-none px-2.5 pb-0.5 pt-1.5 text-[11px] leading-none`}
                >
                  Exit {v.exit}
                </span>
              </span>
              <span
                className={`sign sign-sm ${face} block px-3 pb-2.5 pt-3 transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5`}
              >
                <span className="block text-[17px] font-extrabold leading-tight">{v.label}</span>
                <span className="mt-1 block text-[13px] leading-tight">
                  {v.counts.interrupt} {v.counts.interrupt === 1 ? "interrupt" : "interrupts"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[14px] text-ink-soft sm:hidden">Sixteen vehicles. Swipe sideways for the rest.</p>
    </div>
  );
}
