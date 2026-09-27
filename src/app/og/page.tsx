import type { Metadata } from "next";
import { buildHome } from "@/lib/home";
import { formatCount } from "@/lib/view";

// The social card is a capture of this page at 1200 by 630, saved as
// src/app/opengraph-image.png. Re-capture it after the data changes.
export const metadata: Metadata = { title: "Card", robots: { index: false } };

export default function Card() {
  const data = buildHome();
  const v = [...data.vehicles].sort((a, b) => b.counts.interrupt - a.counts.interrupt || a.exit - b.exit)[0];
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-sky p-10">
      <div className="sign sign-flat on-dark flex h-full w-full flex-col justify-between p-14">
        <div>
          <p className="text-[96px] font-extrabold leading-[0.97]">
            Your car has
            <br />
            patch notes.
          </p>
          <p className="mt-5 text-[40px] font-semibold leading-tight">We show you the ones that matter.</p>
        </div>
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="max-w-[600px] text-[26px] leading-snug">
              {formatCount(data.total)} NHTSA notices. For the {v.title}, {formatCount(v.counts.ignore)} kept going.
            </p>
            <p className="sign sign-fact sign-sm sign-flat legend mt-5 inline-block px-4 pb-1.5 pt-2 text-[22px] leading-none">
              Garage Interrupt
            </p>
          </div>
          <div className="sign sign-exit sign-flat flex items-center gap-4 px-7 py-4">
            <span className="text-[76px] font-extrabold leading-none">{v.counts.interrupt}</span>
            <span className="legend text-[26px] leading-tight">{v.counts.interrupt === 1 ? "Interrupt" : "Interrupts"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
