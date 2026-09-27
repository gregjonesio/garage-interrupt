import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/glyphs";
import { buildHome } from "@/lib/home";
import { VEHICLES } from "@/data/vehicles";
import { formatCount } from "@/lib/view";

export const metadata: Metadata = { title: "Garage" };

export default function Garage() {
  const data = buildHome();
  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="max-w-[18ch] text-[clamp(2.4rem,5.4vw,4.2rem)] font-extrabold leading-[0.98]">
        Sixteen vehicles, sixteen states
      </h1>
      <p className="mt-6 max-w-[64ch] text-[17px] leading-relaxed text-ink-soft">
        A vehicle here is a written state: what it is, how it is equipped, how it is used, what its owner cares about.
        That state is everything Jev knows about the vehicle. These sixteen are fictional and were written for this
        demonstration.
      </p>
      <ul className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {VEHICLES.map((v) => {
          const view = data.vehicles.find((x) => x.id === v.id)!;
          const s = v.state;
          return (
            <li key={v.id}>
              <Link href={`/garage/${v.id}`} className="group flex h-full flex-col no-underline">
                <span className="flex justify-end pr-6">
                  <span className="sign sign-sm sign-flat legend -mb-[3px] rounded-b-none px-3.5 pb-1 pt-2 text-[14px] leading-none">
                    Exit {v.exit}
                  </span>
                </span>
                <span className="sign on-dark flex flex-1 flex-col p-6 transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 sm:p-7">
                <h2 className="text-[28px] font-extrabold leading-[1.05]">
                  {s.year} {s.make} {s.model}
                </h2>
                <p className="mt-1 text-[16px]">{s.trim}</p>
                <dl className="mt-5 space-y-2.5 border-t-2 border-white/70 pt-4 text-[15px] leading-snug">
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
                    <dt className="legend text-[11px] leading-[1.7]">Powertrain</dt>
                    <dd>{s.powertrain}</dd>
                  </div>
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
                    <dt className="legend text-[11px] leading-[1.7]">Use</dt>
                    <dd>
                      {s.usage.type}, {formatCount(s.mileage)} miles
                    </dd>
                  </div>
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
                    <dt className="legend text-[11px] leading-[1.7]">Owner cares about</dt>
                    <dd>{s.ownerPriorities.join(", ")}</dd>
                  </div>
                </dl>
                <p className="legend mt-auto flex items-center gap-2 pt-6 text-[13px]">
                  {view.counts.interrupt} {view.counts.interrupt === 1 ? "interrupt" : "interrupts"},{" "}
                  {view.counts.watch} worth knowing
                  <Arrow turn={90} size={16} className="ml-auto transition-transform duration-200 group-hover:translate-x-1" />
                </p>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
