import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, uuid } from "../services/api.js";
import { Button, Field, Modal, Select } from "./ui.jsx";
import Penny from "./Penny.jsx";
import { useFx } from "./Fx.jsx";

export const SPEND_CATS = ["Food", "Games", "Education", "Shopping", "Other"];
export const ADD_CATS = ["Allowance", "Chores", "Gift", "Other"];

// Used for both Add Money and Spend Money. A fresh idempotency key per open prevents double-submits.
export default function MoneyModal({ type, open, onClose, onDone }) {
  const fx = useFx();
  const key = useRef(uuid());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dep = type === "deposit";
  useEffect(() => { if (open) { key.current = uuid(); setAmount(""); setDescription(""); setError(""); setCategory(dep ? "Allowance" : "Food"); } }, [open, dep]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await api.post(`/transactions/${type}`, { amount: Number(amount), category, description: description || null, idempotencyKey: key.current });
      fx.coinFx(dep ? "in" : "out");
      toast.success(dep ? `Added! New balance: ${res.receipt.balance_after} coins` : `Spent! ${res.receipt.balance_after} coins left`);
      fx.reward(res.rewards);
      onDone?.(res.receipt); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={dep ? "Add Money" : "Spend Money"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex justify-center"><Penny mood={error ? "oops" : "happy"} size={96} /></div>
        <Field label="How many coins?" type="number" inputMode="decimal" min="0.01" step="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>{(dep ? ADD_CATS : SPEND_CATS).map((c) => <option key={c}>{c}</option>)}</Select>
        <Field label="Note (optional)" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={dep ? "Birthday money" : "Snack at school"} />
        {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <Button type="submit" loading={busy} variant={dep ? "mint" : "primary"} className="w-full">{dep ? "Add coins" : "Spend coins"}</Button>
      </form>
    </Modal>
  );
}
