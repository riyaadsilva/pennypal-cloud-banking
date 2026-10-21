import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, dateShort, fmt } from "../services/api.js";
import { Button, Card, Field, PageLoading, PageTitle, Select } from "../components/ui.jsx";

const Stat = ({ k, v }) => <Card className="!p-4"><p className="text-xs text-slate-500">{k}</p><p className="font-display text-3xl font-bold">{v}</p></Card>;

export default function Admin() {
  const [d, setD] = useState(null);
  const [form, setForm] = useState({ quizId: "", prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" });
  const [quizzes, setQuizzes] = useState([]);
  const load = useCallback(async () => {
    const [s, u, t, q, qz] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users"), api.get("/admin/transactions"), api.get("/admin/questions"), api.get("/quizzes")]);
    setD({ stats: s.stats, users: u.users, tx: t, questions: q.questions }); setQuizzes(qz.quizzes);
    setForm((f) => ({ ...f, quizId: f.quizId || qz.quizzes[0]?.id || "" }));
  }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const add = async (e) => {
    e.preventDefault();
    try { await api.post("/admin/questions", { ...form, quizId: Number(form.quizId), explanation: form.explanation || undefined }); toast.success("Question added"); setForm({ ...form, prompt: "", options: ["", "", "", ""], explanation: "" }); load(); } catch (err) { toast.error(err.message); }
  };
  const remove = async (id) => { try { await api.del(`/admin/questions/${id}`); load(); } catch (e) { toast.error(e.message); } };
  if (!d) return <PageLoading />;
  const s = d.stats;
  return (
    <div className="space-y-6">
      <PageTitle title="Admin Dashboard" sub="Aggregate activity. Passwords and secrets are never shown." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat k="Students" v={s.students} /><Stat k="Transactions" v={s.transactions} /><Stat k="Coins added" v={fmt(s.deposited)} /><Stat k="Coins spent" v={fmt(s.spent)} />
        <Stat k="Quiz attempts" v={s.quizAttempts} /><Stat k="Average quiz score" v={`${s.avgQuizPercent}%`} /><Stat k="Goals completed" v={`${s.goalsDone}/${s.goals}`} /><Stat k="Goal completion" v={`${s.goalCompletionPercent}%`} />
      </div>
      <Card><h2 className="mb-3 text-2xl font-semibold">Transactions, last 14 days</h2>
        <div className="h-56" role="img" aria-label="Bar chart of daily transaction counts"><ResponsiveContainer><BarChart data={d.tx.byDay.map((r) => ({ day: dateShort(r.day), Transactions: r.count }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="Transactions" fill="#8B5CF6" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="overflow-x-auto"><h2 className="mb-3 text-2xl font-semibold">Users</h2>
        <table className="w-full min-w-[560px] text-left text-sm"><thead className="text-slate-500"><tr>{["Nickname", "Role", "Balance", "XP", "Streak", "Goals", "Quizzes"].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.users.map((u) => <tr key={u.id} className="border-t border-slate-100 dark:border-slate-700"><td className="py-2 font-medium">{u.nickname}</td><td>{u.role}</td><td>{fmt(u.balance ?? 0)}</td><td>{u.xp}</td><td>{u.streak_days}</td><td>{u.goals}</td><td>{u.quizzes}</td></tr>)}</tbody></table></Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card><h2 className="mb-2 text-2xl font-semibold">Recent transactions</h2><ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">{d.tx.recent.map((t) => <li key={t.id} className="flex justify-between py-2"><span><b>{t.nickname}</b> · {t.type.replace("_", " ")} · {t.category}</span><span className="tabular-nums">{fmt(t.amount)}</span></li>)}</ul></Card>
        <Card><h2 className="mb-2 text-2xl font-semibold">Recent quiz activity</h2><ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">{d.tx.recentQuizzes.length === 0 ? <li className="py-2 text-slate-500">No attempts yet.</li> : d.tx.recentQuizzes.map((a) => <li key={a.id} className="flex justify-between py-2"><span><b>{a.nickname}</b> · {a.title}</span><span>{a.score}/{a.total}</span></li>)}</ul></Card>
      </div>
      <Card><h2 className="mb-3 text-2xl font-semibold">Manage quiz questions ({d.questions.length})</h2>
        <form onSubmit={add} className="mb-5 grid gap-3 rounded-2xl bg-violet-50 p-4 dark:bg-slate-700/40">
          <Select label="Quiz" value={form.quizId} onChange={(e) => setForm({ ...form, quizId: e.target.value })}>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</Select>
          <Field label="Question" required minLength={5} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-2">{form.options.map((o, i) => <Field key={i} label={`Option ${"ABCD"[i]}`} required value={o} onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} />)}</div>
          <Select label="Correct answer" value={form.correctIndex} onChange={(e) => setForm({ ...form, correctIndex: Number(e.target.value) })}>{"ABCD".split("").map((l, i) => <option key={l} value={i}>{l}</option>)}</Select>
          <Field label="Explanation (optional)" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          <Button type="submit">Add question</Button></form>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">{d.questions.map((q) => <li key={q.id} className="flex items-center justify-between gap-3 py-2"><span><span className="text-xs text-slate-500">{q.quiz}</span><br />{q.prompt}</span><button aria-label="Delete question" onClick={() => remove(q.id)} className="rounded-full p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></li>)}</ul></Card>
    </div>
  );
}
