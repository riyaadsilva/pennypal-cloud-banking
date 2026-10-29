import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, BookOpen, Flame, Lightbulb, PiggyBank, Plus, Target, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, dateShort, fmt, uuid } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCountUp } from "../hooks/useCountUp.js";
import { Button, Card, Coin, Empty, Modal, Money, PageLoading, Progress, Ring, Select, Field } from "../components/ui.jsx";
import Penny from "../components/Penny.jsx";
import Jar from "../components/Jar.jsx";
import MoneyModal from "../components/MoneyModal.jsx";
import { TxRow } from "./Banking.jsx";
import { useFx } from "../components/Fx.jsx";
import toast from "react-hot-toast";

const TIPS = ["Pay yourself first: save a little the moment you get money.", "A need keeps you healthy or safe. A want is nice to have. Needs come first!", "Wait one day before buying something big. If you still want it, it is a better choice.", "Compare two prices before you buy. Small differences add up.", "Small savings grow big. 10 coins a week is 520 coins in a year.", "Write down what you spend. You will spot where coins go.", "Setting a goal makes saving feel exciting, not boring."];
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening"; };

function TransferModal({ open, onClose, goals, onDone }) {
  const fx = useFx();
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const open_ = goals.filter((g) => !g.completed_at);
  useEffect(() => { if (open) { setGoalId(open_[0]?.id ?? ""); setAmount(""); setError(""); } }, [open]); // eslint-disable-line
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post(`/savings/${goalId}/contribute`, { amount: Number(amount), idempotencyKey: uuid() });
      fx.coinFx("out"); if (r.completed) fx.burst(); toast.success(r.completed ? "Goal complete! Amazing!" : "Saved! Your jar is growing."); fx.reward(r.rewards); onDone(); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Transfer to Savings">
      {open_.length === 0 ? <p className="text-slate-500">Create a savings goal first, then you can move coins into it.</p> : (
        <form onSubmit={go} className="space-y-4">
          <Select label="Which goal?" value={goalId} onChange={(e) => setGoalId(e.target.value)}>{open_.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
          <Field label="How many coins?" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">Save coins</Button>
        </form>
      )}
    </Modal>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const load = useCallback(async () => {
    const [acc, tx, sv] = await Promise.all([api.get("/accounts/me"), api.get("/transactions?limit=200"), api.get("/savings")]);
    setData({ balance: acc.account.balance, tx: tx.transactions, goals: sv.goals });
  }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const balance = useCountUp(data?.balance ?? 0);

  const generateReport = async () => {
    setReportBusy(true);
    try {
      const result = await api.post("/reports/transactions", {});
      toast.success(`Report saved to S3! ${result.report.transactionCount} transactions included.`);
    } catch (error) {
      toast.error(error.message || "Failed to generate report.");
    } finally {
      setReportBusy(false);
    }
  };

  const monthly = useMemo(() => {
    const m = {};
    for (const t of data?.tx ?? []) {
      const k = new Date(t.created_at).toLocaleDateString(undefined, { month: "short" });
      m[k] ??= { month: k, Spent: 0, Saved: 0, order: new Date(t.created_at).getTime() };
      if (t.type === "withdraw") m[k].Spent += Number(t.amount);
      if (t.type === "goal_contribution") m[k].Saved += Number(t.amount);
      m[k].order = Math.min(m[k].order, new Date(t.created_at).getTime());
    }
    return Object.values(m).sort((a, b) => a.order - b.order).slice(-6);
  }, [data]);
  const activity = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return { key: d.toDateString(), day: dateShort(d), Transactions: 0 }; });
    for (const t of data?.tx ?? []) { const d = days.find((x) => x.key === new Date(t.created_at).toDateString()); if (d) d.Transactions += 1; }
    return days;
  }, [data]);

  if (!data) return <PageLoading />;
  const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];
  const actions = [
    ["Add Money", Plus, "bg-emerald-100 text-emerald-700", () => setModal("deposit")], ["Spend Money", ArrowUpCircle, "bg-rose-100 text-rose-700", () => setModal("withdraw")],
    ["Transfer to Savings", PiggyBank, "bg-violet-100 text-violet-700", () => setModal("transfer")], ["Set Savings Goal", Target, "bg-sky-100 text-sky-700", () => nav("/goals?new=1")],
    ["Take a Quiz", BookOpen, "bg-yellow-100 text-yellow-800", () => nav("/learn")],
  ];
  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-4 bg-gradient-to-br from-violet-500 to-violet-600 text-white dark:from-violet-600 dark:to-violet-700">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{greet()}, Money Superstar!</h1>
          <p className="mt-1 text-violet-100">Hi {user.nickname}! Keep going, you are doing great.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-white/20 px-3 py-1 font-display font-semibold">Level {user.level}</div>
            <div className="flex min-w-[140px] flex-1 items-center gap-2 text-sm"><Progress value={user.xpIntoLevel} color="bg-sun" label="XP to next level" /><span className="whitespace-nowrap">{user.xpIntoLevel}/{user.xpPerLevel} XP</span></div>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-300" />{user.streak}-day streak</span>
          </div>
        </div>
        <div className="hidden sm:block"><Penny mood="happy" size={150} /></div>
      </Card>

      <div className="grid gap-5 md:grid-cols-5">
        <Card className="md:col-span-3">
          <div className="flex items-start justify-between"><div><p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Wallet className="h-4 w-4" />My Wallet</p>
            <p className="mt-1 font-display text-6xl font-bold tracking-tight"><Coin size={44} /> {fmt(balance.toFixed(2))}</p><p className="text-sm text-slate-500">virtual coins</p></div>
            <motion.div animate={{ rotate: [0, -4, 4, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="grid h-16 w-16 place-items-center rounded-3xl bg-yellow-100 text-yellow-600"><Wallet className="h-9 w-9" /></motion.div></div>
          <div className="mt-5 flex flex-wrap gap-3"><Button variant="mint" onClick={() => setModal("deposit")}><ArrowDownCircle className="h-5 w-5" />Deposit</Button><Button variant="soft" onClick={() => setModal("withdraw")}><ArrowUpCircle className="h-5 w-5" />Withdraw</Button></div>
        </Card>
        <Card className="md:col-span-2">
          <p className="mb-3 font-display text-lg font-semibold">Quick Actions</p>
          <div className="grid grid-cols-1 gap-2">{actions.map(([label, Icon, cls, fn]) => (
            <button key={label} onClick={fn} className="flex min-h-[44px] items-center gap-3 rounded-control px-2 py-1.5 text-left font-medium transition hover:bg-slate-50 dark:hover:bg-slate-700"><span className={`grid h-9 w-9 place-items-center rounded-xl ${cls}`}><Icon className="h-5 w-5" /></span>{label}</button>))}</div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-semibold">Savings Jars</h2><Button variant="ghost" onClick={() => nav("/goals")}>See all</Button></div>
        {data.goals.length === 0 ? <Empty title="No goals yet" text="Pick something you dream about and start a jar for it." action={<Button onClick={() => nav("/goals?new=1")}>Set a goal</Button>} /> : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{data.goals.slice(0, 4).map((g, i) => { const pct = (Number(g.saved) / Number(g.target)) * 100; return (
            <div key={g.id} className="flex flex-col items-center text-center"><Jar pct={pct} icon={g.icon} seed={i} size={84} /><p className="mt-1 text-sm font-semibold">{g.name}</p><p className="text-xs text-slate-500">{Math.round(pct)}% of {fmt(g.target)}</p></div>); })}</div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-5">
        <Card className="md:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">Recent Transactions</h2>
            <Button variant="soft" onClick={generateReport} loading={reportBusy} disabled={reportBusy}>
              Generate Report
            </Button>
          </div>
          {data.tx.length === 0 ? <Empty title="Nothing yet" text="Add some coins to see your first transaction." /> : <div className="divide-y divide-slate-100 dark:divide-slate-700">{data.tx.slice(0, 5).map((t) => <TxRow key={t.id} t={t} />)}</div>}
        </Card>
        <Card className="md:col-span-2 bg-yellow-50 dark:bg-slate-800">
          <p className="flex items-center gap-2 font-display text-lg font-semibold"><Lightbulb className="h-5 w-5 text-yellow-500" />Daily Money Tip</p>
          <p className="mt-2 text-slate-700 dark:text-slate-300">{tip}</p>
          <div className="mt-4 flex items-center gap-3"><Button variant="sun" onClick={() => nav("/learn")}>Take a quiz</Button><span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Earn up to 70 XP</span></div>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card><h2 className="mb-3 text-2xl font-semibold">Savings vs Spending</h2>
          {monthly.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Your chart appears after your first spending.</p> :
          <div className="h-56" role="img" aria-label="Bar chart of saved and spent coins by month"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} width={36} /><Tooltip cursor={{ fill: "rgba(139,92,246,.08)" }} contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }} /><Bar dataKey="Saved" fill="#34D399" radius={[8, 8, 0, 0]} /><Bar dataKey="Spent" fill="#8B5CF6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
        <Card><h2 className="mb-3 text-2xl font-semibold">Monthly Activity</h2>
          <div className="h-56" role="img" aria-label="Line chart of transactions per day for 14 days"><ResponsiveContainer><LineChart data={activity}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="day" tickLine={false} axisLine={false} interval={3} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} /><Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }} /><Line type="monotone" dataKey="Transactions" stroke="#60A5FA" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
      </div>

      <MoneyModal type="deposit" open={modal === "deposit"} onClose={() => setModal(null)} onDone={load} />
      <MoneyModal type="withdraw" open={modal === "withdraw"} onClose={() => setModal(null)} onDone={load} />
      <TransferModal open={modal === "transfer"} onClose={() => setModal(null)} goals={data.goals} onDone={load} />
    </div>
  );
}
