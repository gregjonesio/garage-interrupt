import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventDecision } from "@/components/EventDecision";
import { Arrow, TypeMark } from "@/components/glyphs";
import { VEHICLES, vehicleTitle } from "@/data/vehicles";
import { allEventIds, buildEvent } from "@/lib/home";
import { appliesLines } from "@/lib/schema";
import { displayTitle, formatDate, TYPE_LABEL, TYPE_NOUN } from "@/lib/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return allEventIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/event/[id]">): Promise<Metadata> {
  const { id } = await params;
  const built = buildEvent(id);
  return { title: built ? displayTitle(built.event.type, built.event.title ?? "Notice") : "Notice" };
}

const SHOWN_MODELS = 14;

export default async function EventPage({ params }: PageProps<"/event/[id]">) {
  const { id } = await params;
  const built = buildEvent(id);
  if (!built) notFound();
  const { event, decisions, defaultVehicle } = built;
  const applies = appliesLines(event);
  const components = event.structuredApplicability?.components ?? [];

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-8 sm:px-6 sm:pt-10">
      <Link href="/" className="legend inline-flex min-h-[44px] items-center gap-2 text-[14px] text-ink-soft no-underline hover:text-ink">
        <Arrow turn={-90} size={16} />
        All notices
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-x-14 gap-y-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <article className="sign sign-fact self-start p-6 sm:p-9">
          <h1 className="text-[clamp(1.8rem,3.6vw,2.7rem)] font-extrabold leading-[1.06]">{displayTitle(event.type, event.title ?? "")}</h1>
          <p className="mt-4 text-[16px] font-semibold leading-snug">
            <TypeMark type={event.type} className="mr-2 inline-block align-[-2px]" />
            {TYPE_LABEL[event.type]}, from {event.source}
          </p>

          <dl className="mt-7 grid gap-x-8 gap-y-5 text-[16px] sm:grid-cols-2">
            <div>
              <dt className="legend text-[12px] text-ink-soft">Published by NHTSA</dt>
              <dd className="mt-1 font-semibold">{formatDate(event.publishedAt)}</dd>
            </div>
            <div>
              <dt className="legend text-[12px] text-ink-soft">Manufacturer</dt>
              <dd className="mt-1 font-semibold">{event.manufacturer ?? "Not stated"}</dd>
            </div>
            <div>
              <dt className="legend text-[12px] text-ink-soft">NHTSA ID</dt>
              <dd className="mt-1 font-mono font-semibold">{event.sourceRecordId}</dd>
            </div>
            {event.subtype && (
              <div>
                <dt className="legend text-[12px] text-ink-soft">NHTSA category</dt>
                <dd className="mt-1 font-semibold">{event.subtype}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="legend text-[12px] text-ink-soft">Applies to, as stated by NHTSA</dt>
              <dd className="mt-1 leading-relaxed">
                {applies.length === 0
                  ? "No vehicle stated"
                  : applies.slice(0, SHOWN_MODELS).join("; ") +
                    (applies.length > SHOWN_MODELS ? `; and ${applies.length - SHOWN_MODELS} more models` : "")}
              </dd>
            </div>
            {components.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="legend text-[12px] text-ink-soft">Component, as stated by NHTSA</dt>
                <dd className="mt-1 leading-relaxed">{components.slice(0, 6).join("; ")}</dd>
              </div>
            )}
          </dl>

          <h2 className="legend mt-9 border-t-2 border-ink pt-5 text-[14px]">
            Text of the {TYPE_NOUN[event.type]}
          </h2>
          <blockquote className="mt-3 max-w-[70ch] text-[17px] leading-[1.65]">{event.text}</blockquote>

          {event.facts && Object.keys(event.facts).length > 0 && (
            <dl className="mt-8 space-y-4 border-t-2 border-ink pt-5 text-[16px]">
              {Object.entries(event.facts).map(([k, v]) => (
                <div key={k}>
                  <dt className="legend text-[12px] text-ink-soft">{k}</dt>
                  <dd className="mt-1 max-w-[70ch] leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sign sign-service sign-sm on-dark legend mt-9 inline-flex min-h-[44px] items-center gap-3 px-5 py-3 text-[15px] no-underline"
            >
              View original source on NHTSA.gov
              <Arrow turn={45} size={18} />
            </a>
          )}
          {(event.documents ?? []).length > 0 && (
            <div className="mt-7 text-[16px]">
              <h2 className="legend text-[12px] text-ink-soft">Documents filed with NHTSA (PDF)</h2>
              <ul className="mt-1">
                {(event.documents ?? []).slice(0, 3).map((doc) => (
                  <li key={doc.url}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 py-2 font-semibold text-service underline"
                    >
                      {doc.name}
                      <Arrow turn={45} size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-5 max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">
            NHTSA reuses some ID numbers across record types. If its page lists more than one record, this one is the{" "}
            {TYPE_NOUN[event.type]} dated {formatDate(event.publishedAt)}.
          </p>
        </article>

        <EventDecision
          type={event.type}
          decisions={decisions}
          defaultVehicle={defaultVehicle}
          vehicles={VEHICLES.map((v) => ({ id: v.id, title: vehicleTitle(v), trim: v.state.trim, year: v.state.year }))}
        />
      </div>
    </div>
  );
}
