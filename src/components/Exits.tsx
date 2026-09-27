"use client";

import Link from "next/link";
import { formatCount, formatDate, TYPE_LABEL, type Hit, type VehicleView } from "@/lib/view";
import { Arrow, TypeMark } from "./glyphs";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="legend text-[12px] leading-none">{label}</dt>
      <dd className="mt-1.5 text-[22px] font-extrabold leading-none">{value}</dd>
    </div>
  );
}

// Every notice that reached the vehicle is a green guide sign. An interrupt
// carries the yellow panel along its bottom edge, the way EXIT ONLY does.
function ExitSign({ hit, vehicleId }: { hit: Hit; vehicleId: string }) {
  const interrupt = hit.verdict === "INTERRUPT";
  return (
    <li>
      <Link
        href={`/event/${hit.id}?v=${vehicleId}`}
        className="sign on-dark group flex h-full flex-col overflow-hidden no-underline transition-transform duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-1"
      >
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <h3 className="text-[21px] font-extrabold leading-[1.15]">{hit.title}</h3>
          <p className="mt-2 text-[15px] leading-snug text-white/90">
            <TypeMark type={hit.type} size={14} className="mr-2 inline-block align-[-2px]" />
            {TYPE_LABEL[hit.type]}. {formatDate(hit.date)}. {hit.manufacturer}
          </p>
          <blockquote className="mt-4 border-t-2 border-white/60 pt-3 text-[15px] leading-relaxed">{hit.lede}</blockquote>
          <dl className="mt-auto grid grid-cols-3 gap-x-3 gap-y-5 pt-6 sm:grid-cols-[repeat(3,minmax(0,0.8fr))_minmax(0,1.4fr)]">
            <Figure label="Relevance" value={`${hit.relevance}%`} />
            <Figure label="Attention" value={`${hit.attention}%`} />
            <Figure label="Interrupt" value={`${hit.interrupt}%`} />
            <div className="col-span-3 sm:col-span-1">
              <dt className="legend text-[12px] leading-none">Area</dt>
              <dd className="mt-1.5 text-[19px] font-extrabold leading-[1.15]">{hit.area}</dd>
            </div>
          </dl>
        </div>
        <p
          className={`legend flex items-center justify-between gap-4 border-t-4 border-white px-5 py-3 text-[14px] sm:px-6 ${
            interrupt ? "bg-exit text-ink" : ""
          }`}
        >
          <span>{interrupt ? "Interrupt. Open the notice" : "Worth knowing. Open the notice"}</span>
          <Arrow turn={interrupt ? 135 : 90} size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
        </p>
      </Link>
    </li>
  );
}

export function Exits({ vehicle, total }: { vehicle: VehicleView; total: number }) {
  const interrupts = vehicle.hits.filter((h) => h.verdict === "INTERRUPT");
  const watch = vehicle.hits.filter((h) => h.verdict === "WATCH");
  return (
    <section aria-labelledby="exits-title" className="mx-auto max-w-[1240px] px-4 pt-20 sm:px-6">
      <h2 id="exits-title" className="max-w-[24ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
        What reached the {vehicle.title}
      </h2>
      {vehicle.hits.length === 0 ? (
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
          Nothing in this period asked for this vehicle&apos;s attention. All {formatCount(total)} notices passed
          through. That is the usual result, and it is the point.
        </p>
      ) : (
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft">
          Titles and excerpts are NHTSA&apos;s own text. The figures are Jev&apos;s. Nothing here says a vehicle has a
          fault; it says a notice is worth reading.
        </p>
      )}
      {vehicle.hits.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 gap-7 md:grid-cols-2">
          {[...interrupts, ...watch].map((h) => (
            <ExitSign key={h.id} hit={h} vehicleId={vehicle.id} />
          ))}
        </ul>
      )}
    </section>
  );
}
