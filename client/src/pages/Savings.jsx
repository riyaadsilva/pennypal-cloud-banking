import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, fmt, uuid } from "../services/api.js";
import { Button, Card, Empty, Field, Modal, PageLoading, PageTitle, Progress } from "../components/ui.jsx";
import Jar, { GOAL_ICONS } from "../components/Jar.jsx";
import Penny from "../components/Penny.jsx";
import { useFx } from "../components/Fx.jsx";

const IDEAS = [["New Bicycle", "bike", 5000], ["Gaming Headphones", "headphones", 2000], ["Art Supplies", "palette", 800], ["Dream Vacation", "plane", 10000]];

export default function Savings() {
  const fx = useFx();
  const [params, setParams] = useSearchParams();
  const [goals, setGoals] = useState(null);
  const [edit, setEdit] = useState(null);       // null | {} (new) | goal
  const [fund, setFund] = useState(null);       // goal to contribute to
  const [del, setDel] = useState(null);
  const [form, setForm] = useState({ name: "", icon: "jar", target: "" });
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [party, setParty] = useState(null);
  const load = useCallback(async () => setGoals((await api.get("/savings")).goals), []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  useEffect(() => { if (params.get("new") === "1") { openEdit({}); setParams({}, { replace: true }); } }, []); // eslint-disable-line

  const openEdit = (g) => { setError(""); setForm({ name: g.name || "", icon: g.icon || "jar", target: g.target ? Number(g.target) : "" }); setEdit(g); };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const body = { name: form.name, icon: form.icon, target: Number(form.target) };
      if (edit.id) await api.patch(`/savings/${edit.id}`, body); else await api.post("/savings", body);
      toast.success(edit.id ? "Goal updated" : "New goal created!"); setEdit(null); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const contribute = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.post(`/savings/${fund.id}/contribute`, { amount: Number(amount), idempotencyKey: uuid() });
      fx.coinFx("out"); fx.reward(r.rewards); setFund(null); setAmount(""); load();
      if (r.completed) { fx.burst(); setParty(r.goal); } else toast.success("Coins saved!");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const r = await api.del(`/savings/${del.id}`); toast.success(Number(r.refunded) > 0 ? `Goal deleted. ${r.refunded} coins went back to your wallet.` : "Goal deleted."); setDel(null); load(); fx.reward({ xp: 0 }); }
    catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  if (!goals) return <PageLoading />;
  return (
    <div>
      <PageTitle title="Savings Goals" sub="Dream big, save a little at a time." right={<Button onClick={() => openEdit({})}><Plus className="h-5 w-5" />New goal</Button>} />
      {goals.length === 0 ? (
        <Card><Empty title="Your first jar is waiting" text="Pick an idea or make your own." action={<div className="mt-3 flex flex-wrap justify-center gap-2">{IDEAS.map(([name, icon, target]) => <Button key={name} variant="soft" onClick={() => { setForm({ name, icon, target }); setError(""); setEdit({}); }}>{name}</Button>)}</div>} /></Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {goals.map((g, i) => { const pct = (Number(g.saved) / Number(g.target)) * 100; const done = !!g.completed_at; return (
            <Card key={g.id} className={done ? "ring-2 ring-mint" : ""}>
              <div className="flex items-center gap-4">
                <Jar pct={pct} icon={g.icon} seed={i} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h3 className="truncate text-xl font-semibold">{g.name}</h3>
                    <div className="flex shrink-0"><button aria-label={`Edit ${g.name}`} onClick={() => openEdit(g)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="h-4 w-4" /></button><button aria-label={`Delete ${g.name}`} onClick={() => { setDel(g); }} className="rounded-full p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div>
                  <p className="text-sm text-slate-500">{fmt(g.saved)} of {fmt(g.target)} coins</p>
                  <div className="my-2"><Progress value={pct} color={done ? "bg-mint" : "bg-lavender"} label={`${g.name} progress`} /></div>
                  <p className="text-sm font-semibold">{done ? "Goal reached! 🎉" : `${Math.round(pct)}% complete`}</p>
                </div>
              </div>
              {!done && <Button variant="mint" className="mt-4 w-full" onClick={() => { setError(""); setAmount(""); setFund(g); }}>Add coins to this jar</Button>}
            </Card>); })}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit goal" : "New savings goal"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="What are you saving for?" value={form.name} maxLength={60} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Target (coins)" type="number" min="1" step="1" required value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          <fieldset><legend className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">Pick an icon</legend>
            <div className="grid grid-cols-4 gap-2">{Object.entries(GOAL_ICONS).map(([k, Icon]) => <button type="button" key={k} aria-label={k} aria-pressed={form.icon === k} onClick={() => setForm({ ...form, icon: k })} className={`grid h-14 place-items-center rounded-2xl border-2 transition ${form.icon === k ? "border-lavender bg-violet-50 text-lavender dark:bg-violet-500/20" : "border-slate-200 text-slate-500 dark:border-slate-600"}`}><Icon className="h-6 w-6" /></button>)}</div></fieldset>
          {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">{edit?.id ? "Save changes" : "Create goal"}</Button>
        </form>
      </Modal>
      <Modal open={!!fund} onClose={() => setFund(null)} title={`Save for ${fund?.name ?? ""}`}>
        <form onSubmit={contribute} className="space-y-4">
          <p className="text-sm text-slate-500">Coins move from your wallet into this jar. Nothing new is created.</p>
          <Field label="How many coins?" type="number" min="0.01" step="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
          {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <Button type="submit" loading={busy} variant="mint" className="w-full">Save coins</Button>
        </form>
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this goal?">
        <p className="text-slate-600 dark:text-slate-300">Any coins saved in <b>{del?.name}</b> go back to your wallet.</p>
        <div className="mt-5 flex gap-3"><Button variant="ghost" className="flex-1" onClick={() => setDel(null)}>Keep it</Button><Button variant="danger" className="flex-1" loading={busy} onClick={remove}>Delete</Button></div>
      </Modal>
      <Modal open={!!party} onClose={() => setParty(null)} title="Goal complete!">
        <div className="text-center"><Penny mood="celebrate" size={190} className="mx-auto" /><p className="font-display text-2xl font-semibold">You did it!</p><p className="mt-1 text-slate-600 dark:text-slate-300">You reached your goal: <b>{party?.name}</b>. That takes patience. Be proud!</p><Button className="mt-5 w-full" onClick={() => setParty(null)}>Hooray!</Button></div>
      </Modal>
    </div>
  );
}
