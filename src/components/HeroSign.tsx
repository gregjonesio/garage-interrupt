"use client";

import { formatCount, type VehicleView } from "@/lib/view";
import { Arrow } from "./glyphs";

type Props = {
  total: number;
  days: number;
  vehicle: VehicleView;
  onPrev: () => void;
  onNext: () => void;
};

// The fork: one road in from the bottom, the through route straight up,
// two exits to the right. Traffic is a dashed centerline that keeps moving.
function Fork() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 300"
      className="h-[228px] w-[91px] shrink-0 sm:h-[300px] sm:w-[120px]"
    >
      <g fill="none" stroke="#fff" strokeLinecap="butt">
        <path d="M34 300V38" strokeWidth="24" />
        <path d="M34 232C34 184 50 150 86 150" strokeWidth="18" />
        <path d="M34 292C34 264 52 246 86 246" strokeWidth="18" />
      </g>
      <g fill="#fff">
        <path d="M34 2 64 40H4z" />
        <path d="M118 150 84 126v48z" />
        <path d="M118 246 84 222v48z" />
      </g>
      <g fill="none" stroke="var(--guide)" strokeWidth="4">
        <path className="traffic" d="M34 300V44" />
        <path className="traffic" style={{ animationDuration: "2.6s" }} d="M34 232C34 184 50 150 86 150" />
        <path className="traffic" style={{ animationDuration: "3.4s" }} d="M34 292C34 264 52 246 86 246" />
      </g>
    </svg>
  );
}

export const SUPPORT =
  "Manufacturers and regulators publish thousands of notices, bulletins, investigations, recalls and owner reports. Garage Interrupt uses Jev to decide which ones matter to one specific vehicle.";

export function HeroSign({ total, days, vehicle, onPrev, onNext }: Props) {
  const c = vehicle.counts;
  return (
    <section aria-labelledby="hero-title" className="relative">
      {/* Exit plaque, mounted on the top edge at the right as on the road. */}
      <div className="flex justify-end pr-6 sm:pr-10">
        <div className="sign sign-sm sign-flat legend -mb-[3px] rounded-b-none px-4 pb-1 pt-2 text-[15px] leading-none sm:text-[17px]">
          Exit {vehicle.exit}
        </div>
      </div>
      <div className="sign on-dark grid grid-cols-1 gap-x-12 gap-y-6 p-5 sm:gap-y-10 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-14">
        <div className="flex flex-col justify-center">
          <h1 id="hero-title" className="text-[clamp(2.5rem,6.4vw,5rem)] font-extrabold leading-[0.98]">
            Your car has patch notes.
          </h1>
          <p className="mt-3 text-[clamp(1.35rem,3vw,2.2rem)] font-semibold leading-[1.12] sm:mt-4">
            We show you the ones that matter.
          </p>
          <p className="mt-7 hidden max-w-[52ch] text-[17px] leading-relaxed text-white/90 lg:block">{SUPPORT}</p>
        </div>

        <div>
          <div className="flex items-start justify-between gap-4 border-b-2 border-white/70 pb-3 sm:pb-4">
            <div aria-live="polite">
              <p className="text-[clamp(1.35rem,3vw,2.1rem)] font-extrabold leading-tight">{vehicle.title}</p>
              <p className="mt-1 text-[15px] leading-snug text-white/90 sm:text-[16px]">
                {vehicle.trim}. {vehicle.traits.slice(1).join(". ")}.
              </p>
            </div>
            <div className="flex shrink-0 gap-2 pt-1">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous vehicle"
                className="grid size-11 place-items-center rounded-lg border-2 border-white transition-colors duration-150 hover:bg-white hover:text-guide"
              >
                <Arrow turn={-90} size={22} />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next vehicle"
                className="grid size-11 place-items-center rounded-lg border-2 border-white transition-colors duration-150 hover:bg-white hover:text-guide"
              >
                <Arrow turn={90} size={22} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-4 sm:mt-6 sm:gap-6">
            <Fork />
            <dl className="relative h-[228px] min-w-0 flex-1 sm:h-[300px]">
              <div className="absolute inset-x-0 top-[1%]">
                <dd className="text-[clamp(2.4rem,6vw,3.9rem)] font-extrabold leading-none">{formatCount(c.ignore)}</dd>
                <dt className="legend mt-1 text-[14px] sm:text-[15px]">Kept going. Ignored.</dt>
              </div>
              <div className="absolute inset-x-0 top-[50%] -translate-y-1/2">
                <dd className="text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-none">{formatCount(c.watch)}</dd>
                <dt className="legend mt-1 text-[14px] sm:text-[15px]">Worth knowing</dt>
              </div>
              <div className="absolute left-0 top-[82%] -translate-y-1/2">
                <div className="sign sign-exit sign-sm sign-flat flex items-center gap-3 px-4 py-1.5 sm:py-2">
                  <dd className="text-[clamp(2rem,5vw,3.1rem)] font-extrabold leading-none">{formatCount(c.interrupt)}</dd>
                  <dt className="legend text-[14px] leading-tight sm:text-[15px]">
                    {c.interrupt === 1 ? "Interrupt" : "Interrupts"}
                  </dt>
                </div>
              </div>
            </dl>
          </div>
          <p className="mt-4 text-[15px] leading-snug text-white/90 sm:mt-5">
            {formatCount(total)} notices from NHTSA over {days} days, each judged against this vehicle. An interrupt is
            a notice the owner should be told about, not left to find later.
            {c.missing > 0 ? ` ${formatCount(c.missing)} not yet judged.` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
