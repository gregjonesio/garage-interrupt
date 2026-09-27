"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

// The selected vehicle lives in the address (?v=) so a link carries it.
// The first render always uses the fallback, which keeps static HTML and
// hydration identical; the address is read right after.
export function useVehicle(ids: string[], fallback: string) {
  const [vehicle, setVehicle] = useState(fallback);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    // Reading the address after hydration is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v && ids.includes(v)) setVehicle(v);
  }, [ids]);

  const select = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", id);
    window.history.replaceState(null, "", url);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !reduce) doc.startViewTransition(() => flushSync(() => setVehicle(id)));
    else setVehicle(id);
  }, []);

  return [vehicle, select] as const;
}
