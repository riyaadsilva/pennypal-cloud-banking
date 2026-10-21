import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import Penny from "./Penny.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";

export const Coin = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="inline-block shrink-0 align-[-0.15em]">
    <circle cx="12" cy="12" r="11" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="7" fill="none" stroke="#CA8A04" strokeWidth="1.2" opacity=".6" />
    <path d="M12 7.5v9M9.6 10c0-1 1-1.6 2.4-1.6s2.4.6 2.4 1.6-1 1.4-2.4 1.8-2.4.8-2.4 1.8 1 1.6 2.4 1.6 2.4-.6 2.4-1.6" fill="none" stroke="#92400E" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
export const Money = ({ value, className = "" }) => (
  <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}><Coin size={Number(className.match(/text-(\d)xl/)?.[1] || 1) > 2 ? 28 : 18} />{Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
);

export const Card = ({ className = "", children, ...p }) => (
  <div className={`rounded-card bg-white p-5 shadow-lift dark:bg-slate-800 ${className}`} {...p}>{children}</div>
);

const VARIANTS = {
  primary: "bg-lavender text-white hover:bg-violet-600 shadow-[0_6px_16px_-6px_rgba(139,92,246,.7)]",
  mint: "bg-mint text-emerald-950 hover:bg-emerald-400",
  sun: "bg-sun text-yellow-950 hover:bg-yellow-300",
  soft: "bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200",
  ghost: "bg-transparent text-ink hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-700",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
};
export function Button({ variant = "primary", loading, className = "", children, ...p }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} disabled={loading || p.disabled}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-5 py-2.5 font-display text-[15px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`} {...p}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}
    </motion.button>
  );
}

export function Field({ label, hint, error, className = "", ...p }) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{label}</span>
      <input className="min-h-[44px] w-full rounded-control border border-slate-200 bg-white px-4 py-2.5 text-base text-ink outline-none transition focus:border-lavender focus:ring-4 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-500/30" {...p} />
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
export const Select = ({ label, children, className = "", ...p }) => (
  <label className={`block text-sm font-medium ${className}`}>
    <span className="mb-1.5 block text-slate-600 dark:text-slate-300">{label}</span>
    <select className="min-h-[44px] w-full rounded-control border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-lavender focus:ring-4 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900" {...p}>{children}</select>
  </label>
);

export function Modal({ open, onClose, title, children }) {
  const ok = useMotionOk();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            initial={ok ? { y: 40, scale: 0.96, opacity: 0 } : false} animate={{ y: 0, scale: 1, opacity: 1 }} exit={ok ? { y: 30, opacity: 0 } : {}} transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Skeleton = ({ className = "h-24" }) => <div className={`animate-pulse rounded-card bg-slate-200/70 dark:bg-slate-700/60 ${className}`} aria-hidden />;
export const PageLoading = () => (<div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton /><Skeleton /></div></div>);

export function Empty({ title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Penny mood="sleep" size={120} />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
      {action}
    </div>
  );
}

export function Progress({ value, color = "bg-lavender", label }) {
  const ok = useMotionOk();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <motion.div className={`h-full rounded-full ${color}`} initial={ok ? { width: 0 } : false} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }} />
    </div>
  );
}

export function Ring({ value, size = 72, stroke = 8, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, ok = useMotionOk();
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-violet-100 dark:stroke-slate-700" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke="#8B5CF6" strokeDasharray={c}
          initial={ok ? { strokeDashoffset: c } : false} animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }} transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }} />
      </svg>
      <div className="absolute text-center font-display font-semibold">{children}</div>
    </div>
  );
}
export const PageTitle = ({ title, sub, right }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-4xl font-semibold tracking-tight">{title}</h1>{sub && <p className="mt-1 text-slate-500 dark:text-slate-400">{sub}</p>}</div>{right}
  </div>
);
