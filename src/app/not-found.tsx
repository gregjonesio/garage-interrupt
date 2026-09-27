import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/glyphs";

export const metadata: Metadata = { title: "No such exit" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="sign sign-fact max-w-[720px] p-6 sm:p-10">
        <h1 className="text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[0.98]">No such exit</h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed">
          There is no page at this address. A notice may have left the current snapshot, or the link may be mistyped.
        </p>
        <Link
          href="/"
          className="sign sign-sm on-dark legend mt-8 inline-flex min-h-[44px] items-center gap-3 px-5 py-3 text-[15px] no-underline"
        >
          Back to the road
          <Arrow turn={90} size={18} />
        </Link>
      </div>
    </div>
  );
}
