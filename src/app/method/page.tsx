import type { Metadata } from "next";
import { VEHICLES, vehicleTitle } from "@/data/vehicles";
import Link from "next/link";
import { buildHome, loadBenchmark, loadRerun, loadWindow, lookupComparison } from "@/lib/home";
import { loadManifest } from "@/lib/release";
import { buildState, JEV_MODEL, QUESTIONS, SCHEMA_VERSION } from "@/lib/schema";
import { load } from "@/lib/site";
import { THRESHOLDS } from "@/lib/verdict";
import { formatCount, formatDate, TYPE_LABEL, VERDICT_LABEL } from "@/lib/view";

export const metadata: Metadata = { title: "Method" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-x-14 gap-y-5 border-t-4 border-ink pt-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <h2 id={id} className="text-[clamp(1.5rem,2.6vw,2rem)] font-extrabold leading-[1.08]">
        {title}
      </h2>
      <div className="max-w-[72ch] space-y-5 text-[17px] leading-relaxed">{children}</div>
    </section>
  );
}

const Code = ({ children }: { children: string }) => (
  <pre className="sign sign-fact sign-sm max-h-[460px] overflow-auto p-5 font-mono text-[13px] leading-relaxed">{children}</pre>
);

export default function Method() {
  const { site, events } = load();
  const window = loadWindow();
  const home = buildHome();
  const lookup = lookupComparison();
  const benchmark = loadBenchmark();
  const manifest = loadManifest();
  const rerun = loadRerun();
  const leftOut = (window?.sources ?? []).reduce((n, s) => n + (s.leftOut?.["text contains a personal detail"] ?? 0), 0);

  // A real pair for the example: the first row of the front-page table and the vehicle it scored highest for.
  const row = home.matrix[0];
  const exampleEvent = row ? events.find((e) => e.id === row.id) : events[0];
  const exampleVehicle = row
    ? VEHICLES[row.cells.reduce((best, c, i) => (c[0] > row.cells[best][0] ? i : best), 0)]
    : VEHICLES[0];
  const state = exampleEvent ? buildState(exampleVehicle.state, exampleEvent) : null;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.2rem)] font-extrabold leading-[0.98]">
        How a notice becomes an interrupt
      </h1>
      <p className="mt-6 max-w-[64ch] text-[19px] leading-relaxed text-ink-soft">
        Ordinary software detects that something happened. A semantic interrupt asks a narrower question: did something
        happen that matters enough to change what this particular state should pay attention to?
      </p>

      <div className="mt-14 space-y-14">
        <Section id="m-primitive" title="One primitive">
          <p>
            A state, plus an incoming event, gives an attention decision. Here the state is a vehicle and the event is a
            public notice. Every vehicle is judged against every notice, one call each, with no filtering beforehand:{" "}
            {formatCount(site.stats.vehicles)} vehicles, {formatCount(site.stats.events)} notices,{" "}
            {formatCount(site.stats.scored)} decisions.
          </p>
        </Section>

        <Section id="m-sources" title="Where the notices come from">
          <p>
            All four kinds come from the flat files the National Highway Traffic Safety Administration publishes for
            public use. Nothing is scraped from a third party.
            {window ? ` This build covers ${formatDate(window.from)} to ${formatDate(window.to)}.` : ""}
          </p>
          <ul className="space-y-3">
            {(window?.sources ?? []).map((s) => (
              <li key={s.id} className="border-t border-ink/25 pt-3">
                <span className="font-extrabold">
                  {s.name}: {formatCount(s.events)}
                </span>
                <span className="block text-ink-soft">{s.rule}</span>
              </li>
            ))}
          </ul>
          <p>
            Owner complaints are sampled because there are about fifteen hundred a week. The sample is fixed by
            complaint number, so nobody chose which complaints appear, but it was not drawn to represent all
            complaints. Location, VIN and dealer fields in the complaint file are not carried into this site.
            {leftOut > 0
              ? ` ${formatCount(leftOut)} sampled complaints were left out because their text still held a personal detail.`
              : ""}
          </p>
          <p>
            This is a fixed snapshot, not a live feed. Notices published after{" "}
            {window ? formatDate(window.to) : "the snapshot"} are not in it.
          </p>
        </Section>

        <Section id="m-state" title="What Jev is given">
          <p>
            Jev knows only what is in the state. This is the complete state for one real pair: the{" "}
            {vehicleTitle(exampleVehicle)} and the notice titled &ldquo;{exampleEvent?.title}&rdquo;.
          </p>
          {state && <Code>{JSON.stringify(state, null, 2)}</Code>}
        </Section>

        <Section id="m-questions" title="What Jev is asked">
          <p>
            Five typed questions, sent together in one call. A noul returns a probability of yes. A score returns a
            position on an ordered scale. A choice returns one option from a fixed list.
          </p>
          <Code>{JSON.stringify(QUESTIONS, null, 2)}</Code>
          <p>
            Model <span className="font-mono text-[15px]">{JEV_MODEL}</span>, pinned. Question schema{" "}
            <span className="font-mono text-[15px]">{SCHEMA_VERSION}</span>.
          </p>
        </Section>

        <Section id="m-states" title="From numbers to a state">
          <p>Code, not the model, names the result. The rule is short and every threshold is one half.</p>
          <ol className="space-y-3">
            <li className="border-t border-ink/25 pt-3">
              Relevance below {THRESHOLDS.relevanceFloor * 100}%: <span className="font-extrabold">Ignored</span>.
            </li>
            <li className="border-t border-ink/25 pt-3">
              Otherwise, interrupt probability of {THRESHOLDS.interrupt * 100}% or more:{" "}
              <span className="font-extrabold">Interrupt</span>.
            </li>
            <li className="border-t border-ink/25 pt-3">
              Otherwise, attention of {THRESHOLDS.watchAttention * 100}% or more:{" "}
              <span className="font-extrabold">Worth knowing</span>.
            </li>
            <li className="border-t border-ink/25 pt-3">
              Otherwise: <span className="font-extrabold">Ignored</span>.
            </li>
          </ol>
          <p>
            One half is the point where Jev considers yes more likely than no. The thresholds were not adjusted to
            improve how the results look. They will be tuned only against human labels.
          </p>
        </Section>

        <Section id="m-cache" title="Decide once">
          <p>
            A decision is stored under three things: a hash of the vehicle state, a hash of the notice content, and a
            hash of the questions, the model and the shape of the state. If any of the three changes, the pair is
            decided again. Otherwise the stored answer is used and the raw response from Jev is kept beside it. Serving
            this site makes no calls to Jev.
          </p>
          <p>
            Before a build, every notice and every decision is checked: the notice is the text that was judged, the
            vehicle is the state that was judged, all five answers are present and in range, and the files match the
            snapshot that was frozen. A build that fails any check does not complete.
          </p>
          {manifest && (
            <p>
              This snapshot was frozen on {formatDate(manifest.frozenAt)} under contract{" "}
              <span className="font-mono text-[15px]">{manifest.contract}</span>.
              {manifest.provenance.attested > 0
                ? ` ${formatCount(manifest.provenance.attested)} of its decisions were made before the contract was written into each record. For those, the vehicle, the notice, the model and the answers were verified, and the question text is the operator's statement that it had not changed.`
                : ""}
            </p>
          )}
        </Section>

        <Section id="m-measured" title="What has been measured">
          {benchmark ? (
            <>
              <p>
                {formatCount(benchmark.labels)} decisions were labelled by {benchmark.labellers || 1}{" "}
                {benchmark.labellers > 1 ? "people" : "person"} without sight of Jev&apos;s figures, on{" "}
                {formatDate(benchmark.computedAt)}.
              </p>
              <ul className="space-y-3">
                <li className="border-t border-ink/25 pt-3">
                  Relevant notices Jev kept:{" "}
                  <span className="font-extrabold">{((benchmark.recallOfRelevant ?? 0) * 100).toFixed(1)}%</span>
                </li>
                <li className="border-t border-ink/25 pt-3">
                  Irrelevant notices Jev suppressed:{" "}
                  <span className="font-extrabold">{((benchmark.noiseSuppressed ?? 0) * 100).toFixed(1)}%</span>
                </li>
                <li className="border-t border-ink/25 pt-3">
                  Irrelevant notices Jev let through:{" "}
                  <span className="font-extrabold">{((benchmark.falsePositiveRate ?? 0) * 100).toFixed(1)}%</span>
                </li>
              </ul>
            </>
          ) : (
            <p>
              Accuracy has not been measured. No person has labelled these decisions yet, so this site makes no claim
              about how often Jev is right. The labelling sheet and the scoring script are in the repository; figures
              appear here only once at least two hundred labels exist.
            </p>
          )}
          <p>Measured so far, from the run that produced this build:</p>
          <ul className="space-y-3">
            <li className="border-t border-ink/25 pt-3">
              Median response {site.stats.medianMs ?? "n/a"} ms, 95th percentile {site.stats.p95Ms ?? "n/a"} ms.
            </li>
            <li className="border-t border-ink/25 pt-3">
              {formatCount(site.stats.inputTokens)} input tokens, ${site.stats.estCostUsd.toFixed(2)} at the published
              price of $0.042 per million.
            </li>
          </ul>
        </Section>

        <Section id="m-lookup" title="Beside a plain lookup">
          <p>
            A search of NHTSA&apos;s structured fields by make, model and model year returns{" "}
            {formatCount(lookup.matched)} of the {formatCount(lookup.pairs)} pairs. Jev let{" "}
            {formatCount(lookup.matchedPassed)} of them through and ignored {formatCount(lookup.matchedHeld)}. It let
            through {formatCount(lookup.unmatchedPassed)} pairs the search does not return.
          </p>
          <p>
            Every one of those pairs is listed here, none left out. No person has checked them, so the list shows where
            the two differ and says nothing about which is right.
          </p>
          <div className="sign sign-fact relative overflow-x-auto p-2 sm:p-3">
            <table className="w-full min-w-[640px] border-collapse text-[14px] leading-snug">
              <thead>
                <tr className="legend text-[11px] text-ink-soft">
                  <th scope="col" className="px-2 py-2 text-left">Vehicle</th>
                  <th scope="col" className="px-2 py-2 text-left">Notice</th>
                  <th scope="col" className="px-2 py-2 text-left">Lookup</th>
                  <th scope="col" className="px-2 py-2 text-left">Jev</th>
                  <th scope="col" className="px-2 py-2 text-right">Relevance</th>
                </tr>
              </thead>
              <tbody>
                {lookup.rows.map((r) => (
                  <tr key={r.vehicleId + r.id} className="border-t border-ink/20">
                    <td className="px-2 py-2">{r.vehicle}</td>
                    <td className="px-2 py-2">
                      <Link href={`/event/${r.id}?v=${r.vehicleId}`} className="font-semibold text-service underline">
                        {r.title}
                      </Link>
                      <span className="block text-[13px] text-ink-soft">{TYPE_LABEL[r.type]}</span>
                    </td>
                    <td className="px-2 py-2">{r.matched ? "Returned" : "Not returned"}</td>
                    <td className="px-2 py-2">{VERDICT_LABEL[r.verdict]}</td>
                    <td className="px-2 py-2 text-right">{r.relevance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="m-limits" title="Known limits">
          <ul className="space-y-3">
            {rerun && (
              <li className="border-t border-ink/25 pt-3">
                Jev does not give the same numbers twice. {formatCount(rerun.pairs)} pairs were judged a second time
                with nothing changed: {formatCount(rerun.identical)} came back identical, {formatCount(rerun.changeOver10)}{" "}
                moved by more than ten points, and {formatCount(rerun.stateChanged)} changed state. A pair that sits
                near one half can land on either side.
              </li>
            )}
            <li className="border-t border-ink/25 pt-3">
              Jev reads the notice text NHTSA publishes, which for a service bulletin is a summary, not the bulletin.
            </li>
            <li className="border-t border-ink/25 pt-3">
              A notice that names no model year, or names an equipment part number, leaves Jev to judge from the text
              alone.
            </li>
            <li className="border-t border-ink/25 pt-3">
              The vehicles are invented. A real owner&apos;s state would be richer and would change over time.
            </li>
            <li className="border-t border-ink/25 pt-3">
              Relevance of information is all that is judged. Nothing here is a statement about the condition of any
              vehicle.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
