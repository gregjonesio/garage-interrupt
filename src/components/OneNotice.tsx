"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDate, TYPE_LABEL, type MatrixRow, type VehicleView } from "@/lib/view";
import { Arrow, TypeMark } from "./glyphs";

type Props = { rows: MatrixRow[]; vehicles: VehicleView[]; selected: string };

const SHOWN = 6; // vehicles listed by name; the rest are counted
const EVERY_MS = 7000;

// The same three shapes the table uses, so a state reads without color.
const BOX = [
  "border-2 border-transparent text-white/85",
  "border-2 border-white text-white",
  "border-2 border-ink bg-exit text-ink outline outline-1 outline-white",
];
const BAR = ["bg-white/55", "bg-white", "bg-exit"];
const WORD = ["ignored", "worth knowing", "interrupt"];

// One real notice beside every vehicle, as a distance sign: the vehicle on the
// left, how relevant Jev found the notice on the right. Stepping to another
// notice reorders the vehicles. It advances on its own until the visitor takes
// over, and stays still when reduced motion is asked for.
export function OneNotice({ rows, vehicles, selected }: Props) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!auto || held || rows.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % rows.length);
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [auto, held, rows.length]);

  const row = rows[Math.min(index, rows.length - 1)];
  const ranked = useMemo(
    () =>
      row
        ? row.cells
            .map(([relevance, verdict], i) => ({ vehicle: vehicles[i], relevance, verdict }))
            .sort((a, b) => b.relevance - a.relevance || a.vehicle.exit - b.vehicle.exit)
        : [],
    [row, vehicles],
  );
  if (!row) return null;

  const shown = ranked.slice(0, SHOWN);
  const rest = ranked.slice(SHOWN);
  const restMax = rest.length ? rest[0].relevance : 0;
  const step = (by: number) => {
    setAuto(false);
    setIndex((i) => (i + by + rows.length) % rows.length);
  };

  return (
    <section id="compare" aria-labelledby="compare-title" className="mx-auto max-w-[1240px] scroll-mt-6 px-4 pt-20 sm:px-6">
      <h2 id="compare-title" className="max-w-[20ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
        One notice. {vehicles.length === 16 ? "Sixteen" : vehicles.length} vehicles. Very different answers.
      </h2>
      <p className="mt-5 max-w-[66ch] text-[17px] leading-relaxed text-ink-soft">
        Jev does not sort documents into topics. It is handed one vehicle and one notice together, and asked how
        relevant this notice is to this vehicle. The same notice gets a different answer for each one.
      </p>

      <div
        className="mt-9 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <div className="sign sign-fact flex flex-col p-6 sm:p-8">
          <div aria-live={auto ? "off" : "polite"}>
            <p className="text-[15px] font-semibold leading-snug">
              <TypeMark type={row.type} size={14} className="mr-2 inline-block align-[-2px]" />
              {TYPE_LABEL[row.type]}. {formatDate(row.date)}
            </p>
            <h3 className="mt-3 line-clamp-2 min-h-[2.3em] text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold leading-[1.15]">
              {row.title}
            </h3>
            <blockquote className="mt-4 line-clamp-3 min-h-[4.875em] border-t-2 border-ink pt-4 text-[16px] leading-[1.625]">
              {row.lede}
            </blockquote>
          </div>
          <Link
            href={`/event/${row.id}?v=${shown[0].vehicle.id}`}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 self-start font-bold text-service underline"
          >
            Open the notice
            <Arrow turn={90} size={15} />
          </Link>

          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink/25 pt-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous notice"
                className="grid size-11 place-items-center rounded-lg border-2 border-ink transition-colors duration-150 hover:bg-ink hover:text-plate"
              >
                <Arrow turn={-90} size={20} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next notice"
                className="grid size-11 place-items-center rounded-lg border-2 border-ink transition-colors duration-150 hover:bg-ink hover:text-plate"
              >
                <Arrow turn={90} size={20} />
              </button>
            </div>
            <p className="legend text-[13px] text-ink-soft">
              Notice {index + 1} of {rows.length}
            </p>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setAuto((a) => !a)}
                aria-pressed={!auto}
                className="legend ml-auto min-h-[44px] px-1 text-[13px] text-ink-soft underline hover:text-ink"
              >
                {auto ? "Stop changing" : "Change by itself"}
              </button>
            )}
          </div>
        </div>

        <div className="sign on-dark p-5 sm:p-7">
          <p className="legend flex items-baseline justify-between gap-4 text-[12px]">
            <span>Vehicle</span>
            <span>Relevance to it</span>
          </p>
          <ol className="mt-2">
            {shown.map((r, i) => (
              <li
                key={i}
                className={`relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-white/35 py-2.5 ${
                  r.vehicle.id === selected ? "bg-white/10" : ""
                }`}
              >
                <span className="truncate pl-1 text-[clamp(1rem,1.9vw,1.25rem)] font-bold leading-tight">{r.vehicle.title}</span>
                <span className={`min-w-[64px] rounded px-2 py-1.5 text-center text-[19px] font-extrabold leading-none ${BOX[r.verdict]}`}>
                  {r.relevance}%<span className="sr-only">, {WORD[r.verdict]}</span>
                </span>
                <i
                  aria-hidden="true"
                  className={`absolute bottom-0 left-0 h-[4px] transition-[width] duration-500 ease-[var(--ease-out-expo)] ${BAR[r.verdict]}`}
                  style={{ width: `${Math.max(r.relevance, 0.6)}%` }}
                />
              </li>
            ))}
            {rest.length > 0 && (
              <li className="border-t border-white/35 py-3 pl-1 text-[16px] leading-snug text-white/90">
                {rest.length} more vehicles, {restMax === 0 ? "all at 0%" : `none above ${restMax}%`}.
                {rest.every((r) => r.verdict === 0) ? " All ignored." : ""}
              </li>
            )}
          </ol>
        </div>
      </div>

      <p className="mt-6 max-w-[66ch] text-[15px] leading-relaxed text-ink-soft">
        {rows.length === 1 ? "A real notice" : `${rows.length} real notices`}, chosen by rule: the ones Jev scored most
        relevant to any single vehicle. A filled box is an interrupt, an empty box is worth knowing, no box is ignored.
      </p>
    </section>
  );
}
