import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Gamepad2, GraduationCap, Gift, HelpCircle, PiggyBank, Search, ShoppingBag, Utensils } from "lucide-react";
import toast from "react-hot-toast";
import { api, dateShort } from "../services/api.js";
import { Button, Card, Empty, Modal, Money, PageLoading, PageTitle, Select } from "../components/ui.jsx";
import MoneyModal from "../components/MoneyModal.jsx";

const CAT_ICON = { Food: [Utensils, "bg-orange-100 text-orange-600"], Games: [Gamepad2, "bg-sky-100 text-sky-600"], Education: [GraduationCap, "bg-violet-100 text-violet-600"], Shopping: [ShoppingBag, "bg-pink-100 text-pink-600"], Savings: [PiggyBank, "bg-emerald-100 text-emerald-600"], Allowance: [ArrowDownCircle, "bg-emerald-100 text-emerald-600"], Chores: [ArrowDownCircle, "bg-emerald-100 text-emerald-600"], Gift: [Gift, "bg-yellow-100 text-yellow-700"] };

export function TxRow({ t, onClick }) {
  const [Icon, cls] = CAT_ICON[t.category] || [HelpCircle, "bg-slate-100 text-slate-600"];
  const plus = t.type === "deposit";
  return (
    <button onClick={onClick} disabled={!onClick} className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${cls}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.description || t.category}</span><span className="block text-xs text-slate-500">{dateShort(t.created_at)} · {t.category} · {t.type === "goal_contribution" ? "saved" : t.type === "deposit" ? "added" : "spent"}</span></span>
      <Money value={t.amount} className={`font-display text-lg font-semibold ${plus ? "text-emerald-600" : "text-ink dark:text-slate-100"}`} />
    </button>
  );
}

export default function Banking() {
  const [account, setAccount] = useState(null);
  const [tx, setTx] = useState(null);
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [category, setCategory] = useState("");
  const [modal, setModal] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const loadTx = useCallback(async () => {
    const p = new URLSearchParams({ limit: "100" }); if (q) p.set("q", q); if (type) p.set("type", type); if (category) p.set("category", category);
    setTx((await api.get(`/transactions?${p}`)).transactions);
  }, [q, type, category]);
  const loadAll = useCallback(async () => { setAccount((await api.get("/accounts/me")).account); await loadTx(); }, [loadTx]);
  useEffect(() => { const t = setTimeout(() => loadAll().catch((e) => toast.error(e.message)), 250); return () => clearTimeout(t); }, [loadAll]);
  const open = async (id) => { try { setReceipt((await api.get(`/transactions/${id}`)).receipt); } catch (e) { toast.error(e.message); } };
  if (!account || !tx) return <PageLoading />;
  return (
    <div>
      <PageTitle title="Virtual Bank" sub="Every coin here is pretend, but the habits are real." />
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-slate-500">Current balance</p><Money value={account.balance} className="font-display text-5xl font-bold" /></div>
        <div className="flex gap-3"><Button variant="mint" onClick={() => setModal("deposit")}><ArrowDownCircle className="h-5 w-5" />Deposit</Button><Button variant="soft" onClick={() => setModal("withdraw")}><ArrowUpCircle className="h-5 w-5" />Withdraw</Button></div>
      </Card>
      <Card>
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <label className="relative block text-sm font-medium sm:col-span-1"><span className="mb-1.5 block text-slate-600 dark:text-slate-300">Search</span><Search className="absolute left-3 top-[38px] h-4 w-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ice cream..." className="min-h-[44px] w-full rounded-control border border-slate-200 bg-white py-2.5 pl-9 pr-3 outline-none focus:border-lavender focus:ring-4 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900" /></label>
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option><option value="deposit">Added</option><option value="withdraw">Spent</option><option value="goal_contribution">Saved to goals</option></Select>
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{["Food", "Games", "Education", "Shopping", "Savings", "Allowance", "Chores", "Gift", "Other"].map((c) => <option key={c}>{c}</option>)}</Select>
        </div>
        {tx.length === 0 ? <Empty title="No matches" text="Try a different search, or make a new transaction." /> : <div className="divide-y divide-slate-100 dark:divide-slate-700">{tx.map((t) => <TxRow key={t.id} t={t} onClick={() => open(t.id)} />)}</div>}
      </Card>
      <MoneyModal type="deposit" open={modal === "deposit"} onClose={() => setModal(null)} onDone={loadAll} />
      <MoneyModal type="withdraw" open={modal === "withdraw"} onClose={() => setModal(null)} onDone={loadAll} />
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        {receipt && (
          <dl className="space-y-3 rounded-control border-2 border-dashed border-slate-200 p-4 text-sm dark:border-slate-600">
            {[["Receipt #", receipt.id], ["Date", new Date(receipt.created_at).toLocaleString()], ["Type", receipt.type === "goal_contribution" ? "Saved to a goal" : receipt.type === "deposit" ? "Added coins" : "Spent coins"], ["Category", receipt.category], ["Note", receipt.description || "None"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            <div className="flex justify-between border-t border-slate-200 pt-3 dark:border-slate-600"><dt className="font-semibold">Amount</dt><dd><Money value={receipt.amount} className="font-display text-lg font-bold" /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Balance after</dt><dd><Money value={receipt.balance_after} className="font-semibold" /></dd></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
