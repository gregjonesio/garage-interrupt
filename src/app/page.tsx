import type { Metadata } from "next";
import Link from "next/link";
import { Interchange } from "@/components/Interchange";
import { Arrow } from "@/components/glyphs";
import { buildHome, loadBenchmark, lookupComparison } from "@/lib/home";
import { QUESTIONS } from "@/lib/schema";
import { load } from "@/lib/site";
import { formatCount, formatDate } from "@/lib/view";

const QUESTION_NAMES: Record<keyof typeof QUESTIONS, string> = {
  relevance: "Relevance",
  attention: "Attention",
  consequence: "Importance",
  area: "Area",
  interrupt: "Interrupt",
};

const ANSWER_SHAPE: Record<string, string> = {
  noul: "A probability from 0 to 1",
  score: "A score from 0 to 4",
  choice: "One of 18 vehicle areas",
};

// What a shared link shows. The figures are read from the build, as on the page.
export function generateMetadata(): Metadata {
  const data = buildHome();
  if (data.mode !== "jev") return {};
  const interrupts = data.vehicles.reduce((n, v) => n + v.counts.interrupt, 0);
  const title = "Garage Interrupt: your car has patch notes";
  const description =
    `Jev judged ${formatCount(data.total)} NHTSA notices against ${data.vehicles.length} vehicles: ` +
    `${formatCount(data.proof.decisions)} decisions` +
    (data.proof.medianMs === null ? "" : `, ${data.proof.medianMs} ms median`) +
    `, $${data.proof.costUsd.toFixed(2)} in total. ${formatCount(interrupts)} became interrupts.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: "Garage Interrupt", url: "/", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function Home() {
  const data = buildHome();
  const { stats } = load().site;
  const benchmark = loadBenchmark();
  const lookup = lookupComparison();
  const fallback =
    [...data.vehicles].sort((a, b) => b.counts.interrupt - a.counts.interrupt || a.exit - b.exit)[0]?.id ??
    data.vehicles[0].id;

  return (
    <>
      <Interchange data={data} fallback={fallback} />

      {data.mode === "jev" && (
        <section aria-labelledby="why-title" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6">
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div>
              <h2 id="why-title" className="max-w-[18ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
                Why use Jev?
              </h2>
              <p className="mt-6 max-w-[24ch] text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold leading-[1.12]">
                {formatCount(stats.scored)} vehicle and notice pairs, judged for ${stats.estCostUsd.toFixed(2)} in
                total.
              </p>
              <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
                A large reasoning model would be unnecessary for most of these decisions. Nearly every notice has
                nothing to do with a given vehicle, and saying so should be quick and cost almost nothing. Jev acts as
                a fast semantic gate that decides which information deserves attention.
              </p>
              <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                Cost is {formatCount(stats.inputTokens)} input tokens at the published price of $0.042 per million.
                No other model was run on these pairs, so nothing here compares Jev&apos;s cost or speed with one.
              </p>
            </div>
            <dl className="sign on-dark self-start p-6 sm:p-8">
              {[
                ["Median decision latency", stats.medianMs === null ? "n/a" : `${stats.medianMs} ms`],
                ["Decision type", `${Object.keys(QUESTIONS).length} typed probabilistic questions`],
                ["Output", "No generated prose"],
              ].map(([name, value]) => (
                <div key={name} className="border-t border-white/35 py-4 first:border-t-0 first:pt-0 last:pb-0">
                  <dt className="legend text-[12px] leading-tight">{name}</dt>
                  <dd className="mt-1.5 text-[clamp(1.35rem,2.4vw,1.75rem)] font-extrabold leading-[1.12]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section aria-labelledby="asked-title" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6">
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <h2 id="asked-title" className="max-w-[18ch] text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">
              Five questions. No prose.
            </h2>
            <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-ink-soft">
              Jev is a decision model. It is handed the vehicle, the notice, and these five questions, and it returns
              numbers. It cannot write, browse, or explain itself, and this site never invents an explanation for it.
            </p>
            <ol className="mt-9 space-y-4">
              {(Object.keys(QUESTIONS) as (keyof typeof QUESTIONS)[]).map((key) => (
                <li
                  key={key}
                  className="sign sign-fact sign-sm grid grid-cols-1 gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)]"
                >
                  <div>
                    <p className="legend text-[14px]">{QUESTION_NAMES[key]}</p>
                    <p className="mt-0.5 font-mono text-[13px] uppercase text-ink-soft">{QUESTIONS[key].type}</p>
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold leading-snug">{QUESTIONS[key].instructions}</p>
                    <p className="mt-1 text-[14px] text-ink-soft">{ANSWER_SHAPE[QUESTIONS[key].type]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05]">
              An attention filter, and only that
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
              The question is whether a piece of public information is worth one owner&apos;s time. Whether a part is
              sound is a question for the manufacturer, the regulator, and a mechanic.
            </p>
            <ul className="mt-7 space-y-3 text-[17px] leading-snug">
              {[
                "It does not diagnose a vehicle.",
                "It does not predict a failure or a recall.",
                "It does not tell anyone to stop driving.",
                "It does not summarize or rewrite a notice.",
                "It treats owner complaints as unverified reports.",
              ].map((line) => (
                <li key={line} className="border-t-2 border-ink/80 pt-3 font-semibold">
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/method"
              className="sign sign-service sign-sm on-dark legend mt-9 inline-flex min-h-[44px] items-center gap-3 px-5 py-3 text-[15px] no-underline"
            >
              How it is built
              <Arrow turn={90} size={18} />
            </Link>
          </div>
        </div>
      </section>

      {data.mode === "jev" && lookup.matched > 0 && (
        <section aria-labelledby="lookup-title" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6">
          <div className="sign sign-fact grid grid-cols-1 gap-x-14 gap-y-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <h2 id="lookup-title" className="text-[clamp(1.8rem,3.6vw,2.8rem)] font-extrabold leading-[1.03]">
              Beside a plain lookup
            </h2>
            <div className="max-w-[62ch] text-[17px] leading-relaxed">
              <p>
                Searching NHTSA&apos;s own fields by make, model and model year returns {formatCount(lookup.matched)} of
                the {formatCount(lookup.pairs)} pairs. Jev let {formatCount(lookup.matchedPassed)} of those through and
                ignored {formatCount(lookup.matchedHeld)}. It also let through {formatCount(lookup.unmatchedPassed)}{" "}
                pairs the search does not return.
              </p>
              <p className="mt-4">
                No person has checked either list, so this says the two differ, not which is right.{" "}
                <Link href="/method#m-lookup" className="font-bold text-service underline">
                  All {formatCount(lookup.rows.length)} pairs are listed on the method page.
                </Link>
              </p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="measured-title" className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-6">
        {/* Orange means not finished. Once a benchmark exists this becomes a white fact plate. */}
        <div
          className={`sign ${benchmark ? "sign-fact" : "sign-work"} grid grid-cols-1 gap-x-14 gap-y-6 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]`}
        >
          <h2 id="measured-title" className="text-[clamp(1.8rem,3.6vw,2.8rem)] font-extrabold leading-[1.03]">
            {benchmark ? `Checked against ${formatCount(benchmark.labels)} human labels` : "Accuracy: not measured yet"}
          </h2>
          <div className="max-w-[62ch] text-[17px] leading-relaxed">
            {benchmark ? (
              <p>
                Jev kept {((benchmark.recallOfRelevant ?? 0) * 100).toFixed(0)}% of the notices a person called
                relevant and suppressed {((benchmark.noiseSuppressed ?? 0) * 100).toFixed(0)}% of those a person called
                irrelevant. The method page has the detail.
              </p>
            ) : (
              <p>
                No person has labelled these decisions, so there is no accuracy, recall or false-alarm figure to show.
                When a labelled sample exists, the results go here.
              </p>
            )}
            <p className="mt-4">
              What was counted: {formatCount(stats.scored)} decisions, from {formatCount(stats.events)} notices and{" "}
              {stats.vehicles} vehicles
              {stats.medianMs === null ? "" : `, with a median response of ${stats.medianMs} milliseconds`}.
              {data.window
                ? ` The notices are those NHTSA published from ${formatDate(data.window.from)} to ${formatDate(data.window.to)}.`
                : ""}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
