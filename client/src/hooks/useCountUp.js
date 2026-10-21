import { useEffect, useRef, useState } from "react";
import { useMotionOk } from "./useMotionOk.js";
export function useCountUp(target, ms = 900) {
  const ok = useMotionOk();
  const [v, setV] = useState(ok ? 0 : Number(target));
  const from = useRef(ok ? 0 : Number(target));
  useEffect(() => {
    const to = Number(target);
    if (!ok) { setV(to); from.current = to; return; }
    const start = performance.now(); const a = from.current; let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms); const e = 1 - Math.pow(1 - p, 3);
      setV(a + (to - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ok, ms]);
  return v;
}
