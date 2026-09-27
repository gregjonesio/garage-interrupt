"use client";

import { useMemo } from "react";
import type { HomeData } from "@/lib/view";
import { Exits } from "./Exits";
import { HeroSign, SUPPORT } from "./HeroSign";
import { Matrix } from "./Matrix";
import { Road } from "./Road";
import { useVehicle } from "./useVehicle";
import { VehiclePicker } from "./VehiclePicker";

export function Interchange({ data, fallback }: { data: HomeData; fallback: string }) {
  const ids = useMemo(() => data.vehicles.map((v) => v.id), [data.vehicles]);
  const [selected, select] = useVehicle(ids, fallback);
  const index = Math.max(0, ids.indexOf(selected));
  const vehicle = data.vehicles[index];
  const step = (by: number) => select(ids[(index + by + ids.length) % ids.length]);

  return (
    <>
      <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 sm:pt-10">
        {data.mode !== "jev" && (
          <p className="sign sign-work sign-sm legend mb-8 px-4 py-3 text-[14px]">
            {data.mode === "mock"
              ? "Work zone. These figures come from a keyword stand-in used for development, not from Jev."
              : "Work zone. No notices have been judged yet."}
          </p>
        )}
        <HeroSign
          total={data.total}
          days={data.days.length}
          vehicle={vehicle}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
        <div className="mt-5 sm:mt-7">
          <VehiclePicker vehicles={data.vehicles} selected={vehicle.id} onSelect={select} />
        </div>
        <p className="mt-8 max-w-[60ch] text-[17px] leading-relaxed text-ink-soft lg:hidden">{SUPPORT}</p>
      </div>
      <Road data={data} vehicle={vehicle} />
      <Exits vehicle={vehicle} total={data.total} />
      <Matrix rows={data.matrix} vehicles={data.vehicles} selected={vehicle.id} onSelect={select} />
    </>
  );
}
