"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatCount,
  formatDate,
  TYPE_LABEL,
  TYPE_ORDER,
  VERDICT_LABEL,
  type HomeData,
  type VehicleView,
} from "@/lib/view";
import type { Verdict } from "@/lib/types";

type Props = { data: HomeData; vehicle: VehicleView };

const VERDICT_BY_DIGIT: Record<string, Verdict | null> = { "0": "IGNORE", "1": "WATCH", "2": "INTERRUPT", "9": null };

// Marks differ by size and outline as well as by color.
const TICK: Record<string, string> = {
  "0": "bg-asphalt-line",
  "1": "bg-[oklch(0.74_0.16_158)] scale-[1.7] outline outline-1 outline-paint z-[1]",
  "2": "bg-exit scale-[1.7] lg:scale-[2.4] rounded-[1px] z-[2] shadow-[0_0_0_1px_var(--asphalt)]",
  "9": "border border-asphalt-line",
};

const MARKER: Record<string, string> = {
  "1": "border-2 border-paint bg-[oklch(0.74_0.16_158)]",
  "2": "border-[3px] border-ink bg-exit outline outline-2 outline-paint",
};

type Tip = { i: number; x: number; y: number; pinned: boolean };

// Every notice is one painted mark in the through lanes, in the order NHTSA
// published it. The marks never move. Choosing a vehicle changes which of them
// light, and the lit ones are repeated in the exit lane as links.
export function Road({ data, vehicle }: Props) {
  const router = useRouter();
  const [tip, setTip] = useState<Tip | null>(null);
  const days = useMemo(
    () =>
      data.days.map((d) => ({
        ...d,
        indexes: Array.from({ length: d.count }, (_, k) => d.start + k),
        labelled: new Date(d.date + "T00:00:00Z").getUTCDay() === 1,
      })),
    [data.days],
  );
  const dateOf = (i: number) => data.days.find((d) => i >= d.start && i < d.start + d.count)?.date ?? "";
  const mostExits = Math.max(
    1,
    ...days.map((d) => d.indexes.filter((i) => vehicle.lane[i] === "1" || vehicle.lane[i] === "2").length),
  );

  const indexFrom = (target: EventTarget) => {
    const i = (target as HTMLElement).dataset?.i;
    return i === undefined ? null : Number(i);
  };

  const tipType = tip ? TYPE_ORDER[Number(data.eventTypes[tip.i])] : null;
  const tipVerdict = tip ? VERDICT_BY_DIGIT[vehicle.lane[tip.i]] : null;
  const width = typeof window === "undefined" ? 1200 : window.innerWidth;

  return (
    <section aria-labelledby="road-title" className="on-dark mt-16 bg-asphalt py-16 text-paint sm:mt-20 sm:py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <h2 id="road-title" className="max-w-[20ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
          Same road. Different vehicle. Different exits.
        </h2>
        <p className="mt-5 max-w-[66ch] text-[17px] leading-relaxed text-paint-soft">
          Each mark is one notice, in the order NHTSA published it. The marks stay where they are. Pick another vehicle
          and different ones light up. For the {vehicle.title}, {formatCount(vehicle.counts.interrupt)} of{" "}
          {formatCount(data.total)} are interrupts.
        </p>

        <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-[15px]">
          <li className="flex items-center gap-3">
            <i className={`inline-block size-[16px] ${MARKER["2"]}`} />
            Interrupt: yellow, black border
          </li>
          <li className="flex items-center gap-3">
            <i className={`inline-block size-[16px] ${MARKER["1"]}`} />
            Worth knowing: green, white border
          </li>
          <li className="flex items-center gap-3">
            <i className="inline-block size-[9px] bg-asphalt-line" />
            Ignored: small, grey
          </li>
        </ul>

        {/* Yellow edge line, through lanes, dashed lane line, exit lane, white edge line.
            The road runs down the page on a phone and across it on a desktop, and the edge lines turn with it. */}
        <div className="mt-9 border-x-4 border-l-exit border-r-paint px-3 lg:border-x-0 lg:border-y-4 lg:border-b-paint lg:border-t-exit lg:px-0 lg:py-3">
          <div
            role="group"
            aria-label={`${formatCount(data.total)} notices over ${data.days.length} days. For the ${vehicle.title}: ${vehicle.counts.interrupt} interrupts, ${vehicle.counts.watch} worth knowing, ${formatCount(vehicle.counts.ignore)} ignored. The notices that reached the vehicle follow as links.`}
            className="grid cursor-pointer grid-cols-1 gap-y-[7px] lg:grid-cols-[repeat(var(--days),minmax(0,1fr))] lg:items-end lg:gap-x-[6px]"
            style={{ "--days": days.length, "--exit-lane": `${mostExits * 30 + 14}px` } as React.CSSProperties}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse" || tip?.pinned) return;
              const i = indexFrom(e.target);
              setTip(i === null ? null : { i, x: e.clientX, y: e.clientY, pinned: false });
            }}
            onPointerLeave={() => setTip((t) => (t?.pinned ? t : null))}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) return; // exit-lane links navigate on their own
              const i = indexFrom(e.target);
              if (i === null) return setTip(null);
              const native = e.nativeEvent as PointerEvent;
              // With a finger, show what the mark is first; the plate carries the link.
              if (native.pointerType && native.pointerType !== "mouse")
                setTip({ i, x: native.clientX, y: native.clientY, pinned: true });
              else router.push(`/event/${data.eventIds[i]}?v=${vehicle.id}`);
            }}
          >
            {days.map((d) => {
              const exits = d.indexes.filter((i) => vehicle.lane[i] === "1" || vehicle.lane[i] === "2");
              return (
                <div key={d.date} className="flex items-stretch gap-3 lg:block">
                  <span className="w-[44px] shrink-0 pt-px text-[12px] leading-[9px] text-paint-soft lg:hidden">
                    {formatDate(d.date, false)}
                  </span>
                  <div aria-hidden="true" className="flex min-w-0 flex-1 flex-wrap content-start gap-[2px] lg:flex-wrap-reverse lg:pb-2">
                    {d.indexes.map((i) => (
                      <i
                        key={i}
                        data-i={i}
                        className={`block size-[7px] transition-[background-color,transform] duration-500 ease-[var(--ease-out-expo)] lg:size-[5px] ${TICK[vehicle.lane[i]] ?? TICK["0"]}`}
                      />
                    ))}
                  </div>
                  <div className="flex w-[48px] shrink-0 flex-wrap content-start gap-[6px] border-l-4 border-dashed border-paint pl-3 lg:h-[var(--exit-lane)] lg:w-auto lg:flex-col lg:flex-nowrap lg:items-center lg:border-l-0 lg:border-t-4 lg:pl-0 lg:pt-[10px]">
                    {exits.map((i) => (
                      <Link
                        key={i}
                        href={`/event/${data.eventIds[i]}?v=${vehicle.id}`}
                        data-i={i}
                        aria-label={`${VERDICT_LABEL[VERDICT_BY_DIGIT[vehicle.lane[i]] ?? "IGNORE"]}: ${data.eventTitles[i]}, ${formatDate(d.date, false)}`}
                        className={`block size-[28px] rounded-[3px] transition-transform duration-200 ease-[var(--ease-out-expo)] hover:scale-110 lg:size-[24px] ${MARKER[vehicle.lane[i]]}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mt-2 hidden grid-cols-[repeat(var(--days),minmax(0,1fr))] gap-x-[6px] text-[12px] text-paint-soft lg:grid"
          style={{ "--days": days.length } as React.CSSProperties}
        >
          {days.map((d) => (
            <span key={d.date} className="whitespace-nowrap">
              {d.labelled ? formatDate(d.date, false) : ""}
            </span>
          ))}
        </div>

        <p className="mt-8 max-w-[66ch] text-[15px] leading-relaxed text-paint-soft">
          Through lanes hold every notice. The exit lane repeats the ones that reached this vehicle; select one to open
          it.{" "}
          <Link href={`/garage/${vehicle.id}`} className="text-paint underline">
            List all {formatCount(data.total)} for the {vehicle.title}
          </Link>
          , including everything that was ignored.
        </p>
      </div>

      {tip && tipType && (
        <div
          className={`sign sign-fact sign-sm fixed z-50 w-[280px] px-3 py-2 text-[13px] leading-snug ${tip.pinned ? "" : "pointer-events-none"}`}
          style={{ left: Math.max(8, Math.min(tip.x + 14, width - 296)), top: tip.y + 18 }}
        >
          <span className="block font-bold">{data.eventTitles[tip.i]}</span>
          <span className="mt-0.5 block">
            {TYPE_LABEL[tipType]}. {formatDate(dateOf(tip.i), false)}.
          </span>
          <span className="mt-0.5 block">
            {tipVerdict ? `${VERDICT_LABEL[tipVerdict]} for the ${vehicle.title}` : "Not judged yet"}
          </span>
          {tip.pinned && (
            <span className="mt-2 flex items-center justify-between gap-3 border-t border-ink/30 pt-2">
              <Link href={`/event/${data.eventIds[tip.i]}?v=${vehicle.id}`} className="legend py-2 text-[13px]">
                Open the notice
              </Link>
              <button type="button" onClick={() => setTip(null)} className="legend py-2 text-[13px] text-ink-soft">
                Close
              </button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
