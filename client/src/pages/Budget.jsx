import { useCallback, useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { api, fmt } from "../services/api.js";
import { Button, Card, Field, PageLoading, PageTitle, Progress } from "../components/ui.jsx";
import Penny from "../components/Penny.jsx";
import { useFx } from "../components/Fx.jsx";

const CATS = ["Food", "Games", "Education", "Shopping", "Savings", "Other"];
const COLORS = { Food: "#FB923C", Games: "#60A5FA", Education: "#8B5CF6", Shopping: "#F472B6", Savings: "#34D399", Other: "#94A3B8" };
const TIPS = ["Try the 50-30-20 idea: 50% needs, 30% wants, 20% savings.", "Keep a little in Other for surprises.", "If a category runs out, wait for next month instead of borrowing from Savings.", "Check your budget once a week. It takes one minute!"];

export default function Budget() {
  const fx = useFx();
  const [budget, setBudget] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [total, setTotal] = useState(400);
  const [alloc, setAlloc] = useState(Object.fromEntries(CATS.map((c) => [c, 0])));
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { budget: b } = await api.get("/budgets"); setBudget(b); if (b) { setTotal(Number(b.total)); setAlloc(Object.fromEntries(b.categories.map((c) => [c.category, Number(c.allocated)]))); } else setEditing(true); }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const used = Object.values(alloc).reduce((s, v) => s + v, 0);
  const left = total - used;
  const save = async () => {
    setBusy(true); setError("");
    try {
      const body = { total: Number(total), categories: alloc };
      if (budget) await api.patch(`/budgets/${budget.id}`, body); else { const r = await api.post("/budgets", body); fx.reward(r.rewards); }
      toast.success("Budget saved!"); setEditing(false); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (budget === undefined) return <PageLoading />;
  const over = budget?.categories.filter((c) => Number(c.spent) > Number(c.allocated)) ?? [];
  return (
    <div>
      <PageTitle title="Budget Planner" sub={`Your plan for ${new Date().toLocaleDateString(undefined, { month: "long" })}`} right={!editing && <Button variant="soft" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit plan</Button>} />
      {editing ? (
        <Card className="space-y-5">
          <Field label="Total coins to plan" type="number" min="0" step="1" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
          <div className="space-y-4">{CATS.map((c) => (
            <div key={c}><div className="flex justify-between text-sm font-medium"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COLORS[c] }} />{c}</span><span className="tabular-nums">{fmt(alloc[c])}</span></div>
              <input type="range" aria-label={`${c} allocation`} className="mt-1 w-full" min="0" max={Math.max(total, 1)} step="5" value={alloc[c]} onChange={(e) => setAlloc({ ...alloc, [c]: Number(e.target.value) })} /></div>))}</div>
          <p className={`rounded-control p-3 text-sm font-medium ${left < 0 ? "bg-rose-50 text-rose-700" : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"}`}>{left < 0 ? `You planned ${fmt(-left)} too many coins. Lower a slider.` : `${fmt(left)} coins not planned yet.`}</p>
          {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-3"><Button onClick={save} loading={busy} disabled={left < 0 || total <= 0}>Save budget</Button>{budget && <Button variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>}</div>
        </Card>
      ) : (
        <div className="space-y-5">
          {over.length > 0 && <Card className="flex items-center gap-4 bg-orange-50 dark:bg-orange-500/10"><Penny mood="oops" size={80} /><div><p className="flex items-center gap-2 font-display text-lg font-semibold text-orange-800 dark:text-orange-200"><AlertTriangle className="h-5 w-5" />Oops, a little over!</p><p className="text-sm text-orange-900 dark:text-orange-100">{over.map((c) => `${c.category} by ${fmt(Number(c.spent) - Number(c.allocated))}`).join(", ")}. It happens. Try trimming another category next time.</p></div></Card>}
          <div className="grid gap-5 md:grid-cols-5">
            <Card className="md:col-span-2"><h2 className="text-2xl font-semibold">Where it goes</h2>
              <div className="h-56" role="img" aria-label="Pie chart of budget by category"><ResponsiveContainer><PieChart><Pie data={budget.categories.filter((c) => Number(c.allocated) > 0).map((c) => ({ name: c.category, value: Number(c.allocated) }))} dataKey="value" innerRadius={50} outerRadius={85} paddingAngle={3} cornerRadius={6}>{budget.categories.map((c) => <Cell key={c.category} fill={COLORS[c.category]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 14, border: "none" }} /></PieChart></ResponsiveContainer></div>
              <p className="text-center text-sm text-slate-500">Total plan: {fmt(budget.total)} coins</p></Card>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-3">{budget.categories.map((c) => { const pct = Number(c.allocated) ? (Number(c.spent) / Number(c.allocated)) * 100 : 0; const bad = Number(c.spent) > Number(c.allocated); return (
              <Card key={c.category} className="!p-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-display font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: COLORS[c.category] }} />{c.category}</span><span className="text-xs text-slate-500">{fmt(c.spent)} / {fmt(c.allocated)}</span></div>
                <div className="my-2"><Progress value={pct} color={bad ? "bg-rose-500" : pct > 80 ? "bg-orange-400" : "bg-mint"} label={`${c.category} spending`} /></div>
                <p className={`text-sm font-medium ${bad ? "text-rose-600" : "text-slate-600 dark:text-slate-300"}`}>{bad ? `Over by ${fmt(-Number(c.remaining))}` : `${fmt(c.remaining)} left`}</p></Card>); })}</div>
          </div>
          <Card className="bg-yellow-50 dark:bg-slate-800"><p className="font-display text-lg font-semibold">Budget tip</p><p className="text-slate-700 dark:text-slate-300">{TIPS[new Date().getDate() % TIPS.length]}</p></Card>
        </div>
      )}
    </div>
  );
}
