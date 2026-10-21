import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Coins, Flame, GraduationCap, Lock, PiggyBank, Trophy, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { api, dateShort } from "../services/api.js";
import { Card, PageLoading, PageTitle, Progress, Ring } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";

const ICONS = { first_deposit: [Coins, "from-emerald-300 to-emerald-500"], smart_saver: [PiggyBank, "from-pink-300 to-pink-500"], budget_beginner: [Wallet, "from-sky-300 to-sky-500"], money_genius: [Brain, "from-violet-300 to-violet-600"], savings_champion: [Trophy, "from-yellow-300 to-orange-400"], quiz_master: [GraduationCap, "from-indigo-300 to-indigo-500"] };

export default function Achievements() {
  const { user } = useAuth(); const ok = useMotionOk();
  const [all, setAll] = useState(null); const [me, setMe] = useState(null);
  useEffect(() => { Promise.all([api.get("/achievements"), api.get("/achievements/me")]).then(([a, m]) => { setAll(a.achievements); setMe(m); }).catch((e) => toast.error(e.message)); }, []);
  if (!all || !me) return <PageLoading />;
  const got = new Map(me.earned.map((e) => [e.code, e]));
  return (
    <div>
      <PageTitle title="Rewards" sub="XP, levels, streaks and badges." />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4"><Ring value={user.xpIntoLevel} size={84}><span className="text-xl">{user.level}</span></Ring><div><p className="font-display text-lg font-semibold">Level {user.level}</p><p className="text-sm text-slate-500">{user.xpPerLevel - user.xpIntoLevel} XP to level {user.level + 1}</p></div></Card>
        <Card className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-3xl bg-orange-100 text-orange-500"><Flame className="h-9 w-9" /></span><div><p className="font-display text-3xl font-bold">{user.streak}</p><p className="text-sm text-slate-500">day streak</p></div></Card>
        <Card className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-3xl bg-yellow-100 text-yellow-600"><Trophy className="h-9 w-9" /></span><div><p className="font-display text-3xl font-bold">{me.earned.length}/{all.length}</p><p className="text-sm text-slate-500">badges earned</p></div></Card>
      </div>
      <h2 className="mb-3 text-2xl font-semibold">Badges</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {all.map((a, i) => { const [Icon, grad] = ICONS[a.code] || [Trophy, "from-slate-300 to-slate-500"]; const e = got.get(a.code); return (
          <motion.div key={a.code} initial={ok ? { opacity: 0, scale: 0.85 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 22 }}>
            <Card className={`flex h-full flex-col items-center text-center ${e ? "" : "opacity-70"}`}>
              <div className={`relative grid h-20 w-20 place-items-center rounded-full ${e ? `bg-gradient-to-br ${grad} text-white shadow-lg` : "bg-slate-200 text-slate-400 dark:bg-slate-700"}`}>
                {e ? <Icon className="h-9 w-9" /> : <Lock className="h-7 w-7" />}
                {e && ok && <motion.span className="absolute inset-0 rounded-full border-4 border-white/60" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ repeat: 2, duration: 1.2 }} />}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{a.name}</h3><p className="text-xs text-slate-500">{a.description}</p>
              {e && <p className="mt-2 text-xs font-semibold text-emerald-600">Earned {dateShort(e.earned_at)}</p>}
            </Card></motion.div>); })}
      </div>
      <Card className="mt-6"><h2 className="mb-2 text-2xl font-semibold">Recent XP</h2>
        {me.history.length === 0 ? <p className="text-sm text-slate-500">Add coins, save or take a quiz to earn XP.</p> : <ul className="divide-y divide-slate-100 dark:divide-slate-700">{me.history.map((h, i) => <li key={i} className="flex justify-between py-2.5"><span>{h.reason}<span className="ml-2 text-xs text-slate-500">{dateShort(h.created_at)}</span></span><span className="font-display font-semibold text-yellow-700 dark:text-yellow-400">+{h.amount} XP</span></li>)}</ul>}</Card>
    </div>
  );
}
