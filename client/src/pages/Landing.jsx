import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PiggyBank, PieChart, GraduationCap, Star } from "lucide-react";
import Penny from "../components/Penny.jsx";
import { Button, Coin } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";
import toast from "react-hot-toast";

function Floaters() {
  const ok = useMotionOk();
  if (!ok) return null;
  const items = Array.from({ length: 12 }, (_, i) => ({ i, left: (i * 83) % 96, delay: (i % 6) * 0.7, star: i % 3 === 0, dur: 6 + (i % 4) }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((f) => (
        <motion.div key={f.i} className="absolute" style={{ left: `${f.left}%`, top: `${10 + (f.i * 37) % 70}%` }} animate={{ y: [0, -22, 0], rotate: [0, 12, 0] }} transition={{ repeat: Infinity, duration: f.dur, delay: f.delay, ease: "easeInOut" }}>
          {f.star ? <Star className="h-5 w-5 fill-sun text-sun" /> : <Coin size={22 + (f.i % 3) * 6} />}
        </motion.div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: PiggyBank, title: "Save for big dreams", text: "Fill colorful jars and watch your goals grow, one coin at a time.", color: "bg-violet-100 text-violet-600" },
  { icon: PieChart, title: "Plan a budget", text: "Decide where your coins go: snacks, games, learning and savings.", color: "bg-sky-100 text-sky-600" },
  { icon: GraduationCap, title: "Learn money skills", text: "Play quizzes, earn XP and collect badges on the way to superstar.", color: "bg-emerald-100 text-emerald-600" },
];

export default function Landing() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const tryDemo = async () => { setBusy(true); try { await demo(); nav("/dashboard"); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-display text-2xl font-bold text-lavender"><Penny size={40} />PennyPal</span>
        <Link to="/login" className="rounded-control px-4 py-2 font-display font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Log in</Link>
      </header>
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 text-center">
        <Floaters />
        <div className="relative">
          <div className="mx-auto w-fit"><Penny mood="wave" size={220} /></div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">Little Money, <span className="text-lavender">Big Dreams!</span></motion.h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">Learn to save, spend smart, and become a money superstar!</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">A pretend-money banking game for kids 7 to 14. No real money, no real names.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={() => nav("/register")} className="px-8 py-3.5 text-lg">Get Started</Button>
            <Button variant="soft" onClick={tryDemo} loading={busy} className="px-8 py-3.5 text-lg">Explore Demo</Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-20 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -6 }} className="rounded-card bg-white p-7 shadow-lift dark:bg-slate-800">
            <div className={`mb-4 grid h-14 w-14 place-items-center rounded-2xl ${f.color}`}><f.icon className="h-7 w-7" /></div>
            <h3 className="text-2xl font-semibold">{f.title}</h3><p className="mt-2 text-slate-600 dark:text-slate-300">{f.text}</p>
          </motion.div>
        ))}
      </section>
      <section className="mx-auto max-w-4xl px-5 pb-24 text-center">
        <h2 className="text-4xl font-semibold">Three steps to superstar</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {["Add coins to your wallet", "Save some for a dream", "Quiz your way to new levels"].map((t, i) => (
            <div key={t} className="rounded-card bg-violet-50 p-6 dark:bg-slate-800"><span className="font-display text-5xl font-bold text-lavender">{i + 1}</span><p className="mt-2 font-medium">{t}</p></div>
          ))}
        </div>
      </section>
      <footer className="pb-10 text-center text-sm text-slate-500">PennyPal is a learning simulator. All coins are virtual.</footer>
    </div>
  );
}
