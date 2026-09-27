"use client";

import { useMemo } from "react";
import type { EventDecisionView } from "@/lib/home";
import type { EventType } from "@/lib/types";
import { formatCount, IMPORTANCE_SHORT, ruleSentence, VERDICT_LABEL, verdictSentence } from "@/lib/view";
import { Arrow } from "./glyphs";
import { useVehicle } from "./useVehicle";

type VehicleMeta = { id: string; title: string; trim: string; year: number };

type Props = {
  type: EventType;
  decisions: EventDecisionView[];
  vehicles: VehicleMeta[];
  defaultVehicle: string;
};

function Check({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-3 border-t border-ink/25 py-2.5">
      <span className="legend w-[38px] shrink-0 text-[12px]">{ok === null ? "n/a" : ok ? "Yes" : "No"}</span>
      <span>{children}</span>
    </li>
  );
}

function Probability({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="legend text-[12px] leading-tight">{label}</dt>
      <dd className="mt-1.5 text-[clamp(1.9rem,4.4vw,2.6rem)] font-extrabold leading-none">{value}%</dd>
    </div>
  );
}

export function StateWord({ verdict, className = "" }: { verdict: EventDecisionView["verdict"]; className?: string }) {
  if (verdict === "INTERRUPT")
    return (
      <span className={`legend inline-block rounded border-2 border-ink bg-exit px-2 pb-0.5 pt-1 leading-none text-ink ${className}`}>
        Interrupt
      </span>
    );
  if (verdict === "WATCH")
    return (
      <span className={`legend inline-block rounded border-2 border-white px-2 pb-0.5 pt-1 leading-none text-white ${className}`}>
        Worth knowing
      </span>
    );
  return <span className={`legend inline-block px-0 pb-0.5 pt-1 leading-none text-white/85 ${className}`}>Ignored</span>;
}

export function EventDecision({ type, decisions, vehicles, defaultVehicle }: Props) {
  const ids = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const [selected, select] = useVehicle(ids, defaultVehicle);
  const vehicle = vehicles.find((v) => v.id === selected) ?? vehicles[0];
  const d = decisions.find((x) => x.vehicleId === vehicle.id);
  const ranked = useMemo(() => [...decisions].sort((a, b) => b.relevance - a.relevance), [decisions]);

  return (
    <div>
      <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05]" aria-live="polite">
        For the {vehicle.title}
      </h2>
      <p className="mt-1 text-[16px] text-ink-soft">{vehicle.trim}</p>

      {!d ? (
        <p className="sign sign-work sign-sm mt-6 px-5 py-4 text-[16px]">
          This notice has not been judged for this vehicle yet.
        </p>
      ) : (
        <>
          {/* A guide sign. The state leads; an interrupt adds the yellow panel along the bottom, as EXIT ONLY does. */}
          <div className={`sign ${d.verdict === "IGNORE" ? "sign-thru" : ""} on-dark mt-6 overflow-hidden`}>
            <div className="p-6 sm:p-7">
              {d.mode === "mock" && <p className="legend mb-4 text-[13px]">Development stand-in. Not a Jev decision.</p>}
              <p className="text-[clamp(2rem,5vw,2.9rem)] font-extrabold leading-none">{VERDICT_LABEL[d.verdict]}</p>
              <p className="mt-3 text-[16px] leading-snug text-white/90">
                {ruleSentence(d.verdict, d.relevance, d.attention, d.interrupt)}
              </p>
              <dl className="mt-7 grid grid-cols-3 gap-x-4 border-t-2 border-white/70 pt-5">
                <Probability label="Vehicle relevance" value={d.relevance} />
                <Probability label="Attention" value={d.attention} />
                <Probability label="Interrupt probability" value={d.interrupt} />
              </dl>
              <dl className="mt-6 grid grid-cols-2 gap-x-4 border-t-2 border-white/70 pt-5 text-[16px]">
                <div>
                  <dt className="legend text-[12px] leading-tight">Importance to this owner</dt>
                  <dd className="mt-1.5 font-bold">
                    {d.consequence.toFixed(1)} of 4, {IMPORTANCE_SHORT[Math.round(d.consequence)].toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt className="legend text-[12px] leading-tight">Vehicle area the notice is about</dt>
                  <dd className="mt-1.5 font-bold">{d.area}</dd>
                </div>
              </dl>
            </div>
            {d.verdict === "INTERRUPT" && (
              <p className="legend flex items-center justify-between gap-4 border-t-4 border-white bg-exit px-6 py-3 text-[15px] text-ink sm:px-7">
                Interrupt the owner
                <Arrow turn={135} size={22} />
              </p>
            )}
          </div>

          <p className="mt-6 text-[17px] leading-relaxed">{verdictSentence(type, d.verdict, d.relevance)}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            {d.mode === "jev"
              ? `Decided by ${d.model} in ${d.ms} ms from ${formatCount(d.inputTokens ?? 0)} input tokens. `
              : ""}
            Jev returns these figures and nothing else. It gives no reasons, and none are written for it here. The
            figures describe how relevant the notice is, not the condition of any vehicle.
          </p>

          <h3 className="legend mt-10 text-[14px]">Checked by code against NHTSA&apos;s fields</h3>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            A plain comparison with the structured fields NHTSA filled in. Separate from Jev&apos;s decision.
          </p>
          <ul className="mt-3 border-b border-ink/25 text-[16px]">
            <Check ok={d.check.makeNamed}>NHTSA names this make</Check>
            <Check ok={d.check.modelNamed !== null}>
              NHTSA names this model{d.check.modelNamed ? ` (listed as ${d.check.modelNamed})` : ""}
            </Check>
            <Check ok={d.check.year === "listed" ? true : d.check.year === "not_listed" ? false : null}>
              {d.check.year === "not_stated"
                ? "NHTSA gave no model year for this model"
                : `NHTSA lists model year ${vehicle.year} for this model`}
            </Check>
          </ul>
        </>
      )}

      <h3 className="legend mt-12 text-[14px]">The same notice, every vehicle</h3>
      <div className="sign on-dark mt-4 p-2 sm:p-3">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr className="legend text-[11px]">
              <th scope="col" className="px-2 py-2 text-left">Vehicle</th>
              <th scope="col" className="px-2 py-2 text-right">Relevance</th>
              <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">Attention</th>
              <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">Interrupt</th>
              <th scope="col" className="px-2 py-2 text-right">State</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const v = vehicles.find((x) => x.id === r.vehicleId)!;
              const on = r.vehicleId === vehicle.id;
              return (
                <tr key={r.vehicleId} className={`border-t border-white/35 ${on ? "bg-white/15" : ""}`}>
                  <th scope="row" className="px-2 py-0 text-left font-bold">
                    <button
                      type="button"
                      onClick={() => select(r.vehicleId)}
                      aria-pressed={on}
                      className="min-h-[44px] w-full py-2 text-left hover:underline"
                    >
                      {v.title}
                    </button>
                  </th>
                  <td className="px-2 py-2.5 text-right font-extrabold">{r.relevance}%</td>
                  <td className="hidden px-2 py-2.5 text-right sm:table-cell">{r.attention}%</td>
                  <td className="hidden px-2 py-2.5 text-right sm:table-cell">{r.interrupt}%</td>
                  <td className="px-2 py-2.5 text-right">
                    <StateWord verdict={r.verdict} className="text-[11px]" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[14px] text-ink-soft sm:hidden">
        Select a vehicle to see its attention and interrupt figures above.
      </p>
    </div>
  );
}
