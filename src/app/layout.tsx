import type { Metadata } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const overpass = Overpass({ variable: "--font-overpass", subsets: ["latin"] });
const overpassMono = Overpass_Mono({ variable: "--font-overpass-mono", subsets: ["latin"] });

// Set NEXT_PUBLIC_SITE_URL to the public address once there is one, so the
// social card resolves to an absolute link. On Vercel the deployment address is used.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3217");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Garage Interrupt", template: "%s | Garage Interrupt" },
  description:
    "Your car has patch notes. Garage Interrupt uses Jev to decide which automotive notices matter to one specific vehicle.",
};

const CONTRACT = `<!--
THESIS: An interchange for notices. Every notice travels the same road; only the few that matter to one vehicle take its exit. Refuses the dark AI dashboard of metric cards.
OWN-WORLD: The interstate guide sign system under an overcast sky: green guide panels with inset white borders, yellow EXIT ONLY panels, white fact plates, blue service signs, orange work-zone signs, an asphalt band of painted ticks. Overpass lettering.
STORY: The visitor reads the counts for one vehicle, switches vehicle, sees different ticks light on the same road, opens a notice, reaches NHTSA.
FIRST VIEWPORT: One guide sign spanning the page. Headline left. Right: a white fork arrow with thru, worth-knowing and exit counts for the named vehicle. Vehicle plaques beneath.
FORM: Highway guide signage, candidate 6 of 7, seed b8ce2738.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${overpass.variable} ${overpassMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-plate focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 pt-5 sm:px-6">
          <Link
            href="/"
            className="sign sign-fact sign-sm legend inline-flex min-h-[44px] items-center px-3 pt-0.5 text-[15px] leading-none no-underline sm:text-[17px]"
          >
            Garage Interrupt
          </Link>
          <nav aria-label="Site" className="flex items-center gap-3 text-[14px] sm:gap-4 sm:text-[15px]">
            <Link
              href="/method"
              className="sign sign-sm legend inline-flex min-h-[44px] items-center px-3 pt-0.5 leading-none no-underline"
            >
              Method
            </Link>
            <Link
              href="/garage"
              className="sign sign-sm legend inline-flex min-h-[44px] items-center px-3 pt-0.5 leading-none no-underline"
            >
              Garage
            </Link>
          </nav>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-[1240px] px-4 pb-10 pt-20 sm:px-6">
          <div className="sign sign-service on-dark grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
            <div>
              <p className="legend text-[15px]">Source of every notice</p>
              <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-white/90">
                National Highway Traffic Safety Administration, Office of Defects Investigation public data. Each notice
                links to its NHTSA record.
              </p>
            </div>
            <div>
              <p className="legend text-[15px]">Who decides</p>
              <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-white/90">
                Jev, the System One decision model from TypeSafe AI, returns probabilities. Code turns them into
                Ignored, Worth knowing or Interrupt.
              </p>
            </div>
            <div>
              <p className="legend text-[15px]">What this is</p>
              <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-white/90">
                An attention filter over public information. It does not diagnose vehicles or predict failures. The
                vehicles are fictional. Not affiliated with NHTSA or any manufacturer.
              </p>
              <p className="mt-3 max-w-[38ch] text-[15px] leading-relaxed text-white/90">
                It is not a recall check. An ignored notice says nothing about any real vehicle. To check one, use{" "}
                <a href="https://www.nhtsa.gov/recalls" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  NHTSA&apos;s lookup
                </a>
                .
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
