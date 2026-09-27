import type { Metadata } from "next";
import { buildHome } from "@/lib/home";
import { formatCount } from "@/lib/view";

// The social card is a capture of this page at 1200 by 630, saved as
// src/app/opengraph-image.png. Re-capture it after the data changes.
export const metadata: Metadata = { title: "Card", robots: { index: false } };

function Fact({ name, value }: { name: string; value: string }) {
  return (
    <div className="border-l-2 border-ink/25 pl-6 first:border-l-0 first:pl-0">
      <p className="legend text-[15px] leading-none text-ink-soft">{name}</p>
      <p className="mt-2.5 whitespace-nowrap text-[40px] font-extrabold leading-none">{value}</p>
    </div>
  );
}

export default function Card() {
  const data = buildHome();
  const interrupts = data.vehicles.reduce((n, v) => n + v.counts.interrupt, 0);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-sky p-10">
      <div className="sign sign-flat on-dark flex h-full w-full flex-col justify-between px-14 pb-12 pt-11">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-[80px] font-extrabold leading-[0.97]">
              Your car has
              <br />
              patch notes.
            </p>
            <p className="mt-4 text-[34px] font-semibold leading-tight">We show you the ones that matter.</p>
          </div>
          <p className="sign sign-fact sign-sm sign-flat legend mt-2 shrink-0 px-4 pb-1.5 pt-2.5 text-[21px] leading-none">
            Garage Interrupt
          </p>
        </div>
        <div>
          <p className="text-[24px] leading-snug">
            {formatCount(data.total)} NHTSA notices, each judged against {data.vehicles.length} vehicles by Jev.
          </p>
          <div className="mt-5 flex items-stretch gap-8">
            <div className="sign sign-fact sign-sm sign-flat grid flex-1 grid-cols-[auto_auto_auto] items-center justify-between gap-x-6 px-7 py-5">
              <Fact name="Decisions by Jev" value={formatCount(data.proof.decisions)} />
              <Fact name="Median response" value={data.proof.medianMs === null ? "n/a" : `${data.proof.medianMs} ms`} />
              <Fact name="Jev cost" value={`$${data.proof.costUsd.toFixed(2)}`} />
            </div>
            <div className="sign sign-exit sign-sm sign-flat flex shrink-0 items-center gap-4 px-7">
              <span className="text-[68px] font-extrabold leading-none">{formatCount(interrupts)}</span>
              <span className="legend text-[23px] leading-tight">{interrupts === 1 ? "Interrupt" : "Interrupts"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
