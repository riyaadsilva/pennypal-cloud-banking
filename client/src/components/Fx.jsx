import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { Trophy, Sparkles } from "lucide-react";
import { Coin } from "./ui.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";
import { useAuth } from "../context/AuthContext.jsx";

const Ctx = createContext(null);
export const useFx = () => useContext(Ctx);

export function FxProvider({ children }) {
  const ok = useMotionOk();
  const { refresh } = useAuth();
  const [coins, setCoins] = useState(null); // { dir: "in" | "out", id }
  const [badge, setBadge] = useState(null);

  const burst = useCallback(() => { if (ok) confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors: ["#8B5CF6", "#60A5FA", "#FACC15", "#34D399", "#F9A8D4"] }); }, [ok]);
  const coinFx = useCallback((dir) => { if (!ok) return; const id = Date.now(); setCoins({ dir, id }); setTimeout(() => setCoins((c) => (c?.id === id ? null : c)), 1500); }, [ok]);

  // Call with the `rewards` object from any API response.
  const reward = useCallback((r) => {
    if (!r) return;
    if (r.xp > 0) toast(`+${r.xp} XP`, { icon: "⭐" });
    if (r.unlocked?.length) { setBadge(r.unlocked[0]); burst(); setTimeout(() => setBadge(null), 3200); }
    refresh();
  }, [burst, refresh]);

  return (
    <Ctx.Provider value={{ burst, coinFx, reward }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
        <AnimatePresence>
          {coins && Array.from({ length: 9 }, (_, i) => (
            <motion.div key={`${coins.id}-${i}`} className="absolute" style={{ left: `${30 + i * 5}%` }}
              initial={coins.dir === "in" ? { top: "-6%", opacity: 1, rotate: 0 } : { top: "60%", opacity: 1, scale: 1 }}
              animate={coins.dir === "in" ? { top: "62%", opacity: [1, 1, 0], rotate: 360 } : { top: "-8%", opacity: [1, 1, 0], scale: 0.6, x: (i - 4) * 14 }}
              transition={{ duration: 0.9, delay: i * 0.06, ease: "easeIn" }}><Coin size={28} /></motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {badge && (
          <motion.div role="status" initial={{ y: 80, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed inset-x-4 bottom-24 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-3xl bg-ink p-4 text-white shadow-2xl md:bottom-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sun text-yellow-950"><Trophy /></div>
            <div><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sun"><Sparkles className="h-3 w-3" />Badge unlocked</p><p className="font-display text-lg font-semibold">{badge.name}</p><p className="text-xs text-slate-300">{badge.description}</p></div>
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
