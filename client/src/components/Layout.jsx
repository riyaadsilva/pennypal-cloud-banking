import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Home, Landmark, LogOut, MoreHorizontal, PieChart, Shield, Target, User } from "lucide-react";
import Penny from "./Penny.jsx";
import { Modal } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";

const MAIN = [["/dashboard", "Home", Home], ["/bank", "Bank", Landmark], ["/goals", "Goals", Target], ["/learn", "Learn", BookOpen], ["/rewards", "Rewards", Award]];
const MORE = [["/budget", "Budget", PieChart], ["/profile", "Profile", User]];

const linkCls = ({ isActive }) => `flex items-center gap-3 rounded-control px-4 py-3 font-display text-[15px] font-semibold transition-colors ${isActive ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`;

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const ok = useMotionOk();
  const [more, setMore] = useState(false);
  const items = [...MAIN, ...MORE, ...(user.role === "admin" ? [["/admin", "Admin", Shield]] : [])];
  const out = async () => { await logout(); nav("/"); };
  return (
    <div className={`min-h-screen md:flex ${ok ? "" : "no-motion"}`}>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 p-4 md:flex dark:border-slate-800">
        <button onClick={() => nav("/dashboard")} className="mb-6 flex items-center gap-2 px-2 text-left"><Penny size={44} /><span className="font-display text-2xl font-bold text-lavender">PennyPal</span></button>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">{items.map(([to, label, Icon]) => <NavLink key={to} to={to} className={linkCls}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav>
        <button onClick={out} className="flex items-center gap-3 rounded-control px-4 py-3 font-display font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut className="h-5 w-5" />Log out</button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 px-4 py-3 md:hidden dark:border-slate-800">
          <span className="flex items-center gap-2 font-display text-xl font-bold text-lavender"><Penny size={34} />PennyPal</span>
          <span className="rounded-full bg-violet-100 px-3 py-1 font-display text-sm font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">Lv {user.level}</span>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={ok ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} exit={ok ? { opacity: 0 } : {}} transition={{ duration: 0.22 }}><Outlet /></motion.div>
          </AnimatePresence>
        </main>
      </div>
      <nav aria-label="Main" className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-200/60 px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden dark:border-slate-800">
        {MAIN.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${isActive ? "text-lavender" : "text-slate-500"}`}><Icon className="h-6 w-6" />{label}</NavLink>
        ))}
        <button onClick={() => setMore(true)} className="flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500"><MoreHorizontal className="h-6 w-6" />More</button>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="More">
        <div className="space-y-1">
          {[...MORE, ...(user.role === "admin" ? [["/admin", "Admin", Shield]] : [])].map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setMore(false)} className={linkCls}><Icon className="h-5 w-5" />{label}</NavLink>)}
          <button onClick={out} className="flex w-full items-center gap-3 rounded-control px-4 py-3 font-display font-semibold text-rose-600"><LogOut className="h-5 w-5" />Log out</button>
        </div>
      </Modal>
    </div>
  );
}
