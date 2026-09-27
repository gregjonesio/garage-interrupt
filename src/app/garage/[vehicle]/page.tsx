import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, TypeMark } from "@/components/glyphs";
import { VEHICLES, vehicleById, vehicleTitle } from "@/data/vehicles";
import { load, VERDICTS } from "@/lib/site";
import { formatCount, formatDate, TYPE_LABEL, VERDICT_LABEL } from "@/lib/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return VEHICLES.map((v) => ({ vehicle: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/garage/[vehicle]">): Promise<Metadata> {
  const { vehicle } = await params;
  const v = vehicleById(vehicle);
  return { title: v ? vehicleTitle(v) : "Vehicle" };
}

const NEAR_MISSES = 150;

export default async function VehiclePage({ params }: PageProps<"/garage/[vehicle]">) {
  const { vehicle } = await params;
  const v = vehicleById(vehicle);
  if (!v) notFound();
  const { site } = load();
  const rows = site.events
    .map((e, i) => ({ e, c: site.cells[v.id][i] }))
    .filter((r) => r.c !== null)
    .map((r) => ({ e: r.e, c: r.c! }))
    .sort((a, b) => b.c[5] - a.c[5] || b.c[0] - a.c[0] || b.c[1] - a.c[1]);
  const reached = rows.filter((r) => r.c[5] > 0);
  const ignored = rows.filter((r) => r.c[5] === 0);
  const shown = [...reached, ...ignored.slice(0, NEAR_MISSES)];
  const rest = ignored.slice(NEAR_MISSES);
  const restMax = rest.length ? Math.max(...rest.map((r) => r.c[0])) : 0;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 sm:pt-10">
      <Link href="/garage" className="legend inline-flex min-h-[44px] items-center gap-2 text-[14px] text-ink-soft no-underline hover:text-ink">
        <Arrow turn={-90} size={16} />
        Garage
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[0.98]">{vehicleTitle(v)}</h1>
          <p className="mt-2 text-[19px]">
            {v.state.trim}. Vehicle {v.exit} of {VEHICLES.length}.
          </p>
          <p className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">
            Of {formatCount(rows.length)} notices, {reached.filter((r) => r.c[5] === 2).length} were interrupts,{" "}
            {reached.filter((r) => r.c[5] === 1).length} were worth knowing, and {formatCount(ignored.length)} were
            ignored. This is a fictional vehicle.
          </p>
        </div>
        <div>
          <h2 className="legend text-[14px]">The state Jev was given, in full</h2>
          <pre className="sign sign-fact sign-sm mt-3 max-h-[420px] overflow-auto p-5 font-mono text-[13px] leading-relaxed">
            {JSON.stringify(v.state, null, 2)}
          </pre>
        </div>
      </div>

      <h2 className="mt-16 text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05]">
        Every notice, most relevant first
      </h2>
      <div className="sign sign-fact relative mt-6 overflow-x-auto p-2 sm:p-4">
        <table className="w-full min-w-[720px] border-collapse text-[15px]">
          <thead>
            <tr className="legend text-[11px] text-ink-soft">
              <th scope="col" className="px-2 py-2 text-left">State</th>
              <th scope="col" className="px-2 py-2 text-left">Notice</th>
              <th scope="col" className="px-2 py-2 text-left">Published</th>
              <th scope="col" className="px-2 py-2 text-right">Relevance</th>
              <th scope="col" className="px-2 py-2 text-right">Attention</th>
              <th scope="col" className="px-2 py-2 text-right">Interrupt</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ e, c }) => (
              <tr key={e.id} className="border-t border-ink/20">
                <td className="px-2 py-2.5">
                  <span
                    className={`legend inline-block whitespace-nowrap rounded border-2 px-2 pb-0.5 pt-1 text-[11px] leading-none ${
                      c[5] === 2
                        ? "border-ink bg-exit text-ink"
                        : c[5] === 1
                          ? "border-guide text-guide-deep"
                          : "border-transparent text-ink-soft"
                    }`}
                  >
                    {VERDICT_LABEL[VERDICTS[c[5]]]}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <Link href={`/event/${e.id}?v=${v.id}`} className="font-semibold text-service underline">
                    <TypeMark type={e.type} size={13} className="mr-2 inline-block align-[-1px]" />
                    {e.title}
                  </Link>
                  <span className="block text-[13px] text-ink-soft">
                    {TYPE_LABEL[e.type]}
                    {e.manufacturer ? `, ${e.manufacturer}` : ""}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5">{formatDate(e.date, false)}</td>
                <td className="px-2 py-2.5 text-right font-extrabold">{c[0]}%</td>
                <td className="px-2 py-2.5 text-right">{c[1]}%</td>
                <td className="px-2 py-2.5 text-right">{c[2]}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rest.length > 0 && (
        <p className="mt-5 max-w-[70ch] text-[15px] leading-relaxed text-ink-soft">
          {formatCount(rest.length)} more ignored notices are not listed. None of them scored above {restMax}%
          relevance for this vehicle. Each one can still be opened from the road on the{" "}
          <Link href={`/?v=${v.id}`} className="font-semibold text-service underline">
            front page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
