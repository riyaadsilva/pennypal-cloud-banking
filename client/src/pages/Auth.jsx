import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Circle } from "lucide-react";
import Penny from "../components/Penny.jsx";
import { Button, Card, Field } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const rules = (pw) => [["At least 8 characters", pw.length >= 8], ["A letter", /[A-Za-z]/.test(pw)], ["A number", /\d/.test(pw)]];

export default function Auth({ mode }) {
  const reg = mode === "register";
  const { login, register, demo } = useAuth();
  const nav = useNavigate();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); setError(""); try { await fn(); nav("/dashboard"); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center"><Penny mood={error ? "oops" : "wave"} size={150} /></div>
        <Card className="mt-2">
          <h1 className="text-center text-3xl font-semibold">{reg ? "Join PennyPal" : "Welcome back!"}</h1>
          <p className="mb-5 mt-1 text-center text-sm text-slate-500">{reg ? "Pick a fun nickname. No real name needed." : "Log in with your nickname."}</p>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => (reg ? register(nickname, password) : login(nickname, password))); }}>
            <Field label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" maxLength={20} required placeholder="star_saver" />
            <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={reg ? "new-password" : "current-password"} required />
            {reg && <ul className="space-y-1 text-sm">{rules(password).map(([t, ok]) => <li key={t} className={`flex items-center gap-2 ${ok ? "text-emerald-600" : "text-slate-500"}`}>{ok ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}{t}</li>)}</ul>}
            {error && <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">{reg ? "Create my account" : "Log in"}</Button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>
          <Button variant="soft" className="w-full" onClick={() => run(demo)} disabled={busy}>Try the demo account</Button>
          <p className="mt-5 text-center text-sm text-slate-500">{reg ? "Already have an account?" : "New here?"} <Link className="font-semibold text-lavender" to={reg ? "/login" : "/register"}>{reg ? "Log in" : "Join now"}</Link></p>
        </Card>
      </div>
    </div>
  );
}
