"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatDate, TYPE_LABEL, type MatrixRow, type VehicleView } from "@/lib/view";
import { TypeMark } from "./glyphs";

type Props = { rows: MatrixRow[]; vehicles: VehicleView[]; selected: string; onSelect: (id: string) => void };

// Each state has its own box, so it reads without color: a filled box with a
// black border, an empty box with a white border, or no box at all.
const CELL = [
  "border-2 border-transparent text-white/80",
  "border-2 border-white text-white font-extrabold",
  "border-2 border-ink bg-exit text-ink font-extrabold outline outline-1 outline-white",
];
const CELL_WORD = ["ignored", "worth knowing", "interrupt"];

// Keep model names and document numbers such as F-150 on one line.
const unbroken = (s: string) => s.replace(/(\w)-(?=\w)/g, "$1‑");

// A distance sign read sideways: notices down the side, vehicles across the top,
// and in each cell how relevant Jev found that notice to that vehicle.
export function Matrix({ rows, vehicles, selected, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);

  // On a narrow screen the table scrolls sideways; bring the chosen vehicle's column into view.
  useEffect(() => {
    const el = box.current;
    const th = el?.querySelector<HTMLElement>('th[data-on="true"]');
    const first = el?.querySelector<HTMLElement>("thead th");
    if (!el || !th || !first || el.scrollWidth <= el.clientWidth) return;
    // Align to the column edge so no part of the previous column shows beside the pinned one.
    el.scrollTo({ left: Math.max(0, th.offsetLeft - first.offsetWidth), behavior: "auto" });
  }, [selected]);

  if (!rows.length) return null;
  return (
    <section aria-labelledby="matrix-title" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6">
      <h2 id="matrix-title" className="max-w-[22ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
        Every vehicle beside every other
      </h2>
      <p className="mt-5 max-w-[66ch] text-[17px] leading-relaxed text-ink-soft">
        The comparison above, in full. Each row is a real notice. Each number is the probability Jev gave that the
        notice is relevant to that vehicle. The rows were chosen by rule: for each vehicle, the notice Jev scored
        highest for it.
      </p>
      <p className="mt-4 text-[15px] text-ink-soft lg:hidden">Scroll the table sideways for all sixteen vehicles.</p>
      {/* No side padding on the scroller below the desktop width: scrolled columns would show through it beside the pinned column. */}
      <div ref={box} className="sign on-dark relative mt-6 overflow-x-auto py-2 sm:py-4 lg:mt-10 lg:px-4">
        <table className="w-full min-w-[1080px] table-fixed border-collapse text-[15px]">
          <caption className="sr-only">
            Relevance of selected notices to each vehicle, in percent, with the resulting state
          </caption>
          <thead>
            <tr>
              <th scope="col" className="legend sticky left-0 z-10 w-[176px] bg-guide px-3 py-3 text-left align-bottom text-[12px] sm:w-[264px]">
                Notice
              </th>
              {vehicles.map((v) => {
                const on = v.id === selected;
                return (
                  <th key={v.id} scope="col" data-on={on} className="px-0.5 py-2 align-bottom">
                    <button
                      type="button"
                      onClick={() => onSelect(v.id)}
                      aria-pressed={on}
                      aria-label={v.title}
                      className={`flex min-h-[48px] w-full flex-col items-center justify-center rounded px-0 py-1.5 transition-colors duration-150 ${
                        on ? "bg-white text-guide-deep" : "hover:bg-white/15"
                      }`}
                    >
                      {/* Model year over the name. Names are in mixed case, as destinations are on a guide sign, which also lets all sixteen fit upright. */}
                      <span className="text-[13px] font-bold leading-none">{v.title.slice(0, 4)}</span>
                      <span className="mt-1 whitespace-nowrap text-[11px] font-extrabold leading-none">{v.label}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/35">
                <th scope="row" className="sticky left-0 z-10 w-[176px] bg-guide px-3 py-3 text-left font-normal sm:w-[264px]">
                  <Link href={`/event/${r.id}?v=${selected}`} className="block no-underline hover:underline">
                    <span className="block text-[14px] font-bold leading-snug sm:text-[15px]">{unbroken(r.title)}</span>
                    <span className="mt-1 block whitespace-nowrap text-[13px] leading-snug text-white/90">
                      <TypeMark type={r.type} size={12} className="mr-1.5 inline-block align-[-1px]" />
                      <span className="sr-only">{TYPE_LABEL[r.type]}. </span>
                      {r.type === "complaint" ? "Unverified. " : ""}
                      {formatDate(r.date, false)}
                    </span>
                  </Link>
                </th>
                {r.cells.map(([rel, verdict], i) => (
                  <td key={vehicles[i].id} className={`px-0.5 py-1 text-center ${vehicles[i].id === selected ? "bg-white/10" : ""}`}>
                    <span className={`block rounded px-1 py-2 text-[16px] leading-none ${CELL[verdict]}`}>
                      {rel}
                      <span className="sr-only"> percent, {CELL_WORD[verdict]}</span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-ink-soft">
        <li className="flex items-center gap-2.5">
          <span className="rounded border-2 border-ink bg-exit px-2 py-0.5 text-[14px] font-extrabold leading-none text-ink">91</span>
          Filled box: interrupt
        </li>
        <li className="flex items-center gap-2.5">
          <span className="rounded border-2 border-guide px-2 py-0.5 text-[14px] font-extrabold leading-none text-guide-deep">86</span>
          Empty box: worth knowing
        </li>
        <li className="flex items-center gap-2.5">
          <span className="px-1 text-[14px] leading-none">2</span>
          No box: ignored
        </li>
      </ul>
    </section>
  );
}
