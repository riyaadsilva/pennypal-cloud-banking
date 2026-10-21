import { useEffect, useState } from "react";
import { Bot, Cat, LogOut, Rabbit, Rocket, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api, fmt } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card, Field, PageLoading, PageTitle } from "../components/ui.jsx";
import Penny from "../components/Penny.jsx";

const AVATARS = { penny: [Sparkles, "bg-pink-100 text-pink-600"], star: [Star, "bg-yellow-100 text-yellow-600"], rocket: [Rocket, "bg-sky-100 text-sky-600"], cat: [Cat, "bg-orange-100 text-orange-600"], bear: [Rabbit, "bg-emerald-100 text-emerald-600"], robot: [Bot, "bg-violet-100 text-violet-600"] };
export const Avatar = ({ name, size = 56 }) => { const [Icon, cls] = AVATARS[name] || AVATARS.penny; return <span className={`grid place-items-center rounded-full ${cls}`} style={{ width: size, height: size }}><Icon style={{ width: size * 0.5, height: size * 0.5 }} /></span>; };

const Toggle = ({ label, hint, on, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3"><div><p className="font-medium">{label}</p><p className="text-sm text-slate-500">{hint}</p></div>
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? "bg-lavender" : "bg-slate-300 dark:bg-slate-600"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`} /></button></div>
);

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(0);
  const [nick, setNick] = useState(user.nickname);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [busy, setBusy] = useState("");
  useEffect(() => { api.get("/accounts/me").then((r) => { setStats(r.stats); setBalance(r.account.balance); }).catch((e) => toast.error(e.message)); }, []);
  const patch = async (body, msg) => { try { const r = await api.patch("/auth/me", body); setUser(r.user); if (msg) toast.success(msg); } catch (e) { toast.error(e.message); } };
  const toggleDark = (v) => { setDark(v); document.documentElement.classList.toggle("dark", v); localStorage.setItem("pp-dark", v ? "1" : "0"); };
  const changePw = async (e) => { e.preventDefault(); setBusy("pw"); try { await api.post("/auth/password", pw); toast.success("Password changed!"); setPw({ current: "", next: "" }); } catch (err) { toast.error(err.message); } finally { setBusy(""); } };
  if (!stats) return <PageLoading />;
  return (
    <div>
      <PageTitle title="Profile" sub="Make PennyPal yours." />
      <div className="grid gap-5 md:grid-cols-2">
        <Card><div className="flex items-center gap-4"><Avatar name={user.avatar} size={72} /><div><p className="font-display text-2xl font-semibold">{user.nickname}</p><p className="text-sm text-slate-500">Level {user.level} · {user.xp} XP</p></div></div>
          <p className="mb-2 mt-5 text-sm font-medium text-slate-600 dark:text-slate-300">Choose your avatar</p>
          <div className="flex flex-wrap gap-2">{Object.keys(AVATARS).map((a) => <button key={a} aria-label={`${a} avatar`} aria-pressed={user.avatar === a} onClick={() => patch({ avatar: a }, "Avatar updated")} className={`rounded-full p-1 ring-4 transition ${user.avatar === a ? "ring-lavender" : "ring-transparent"}`}><Avatar name={a} size={52} /></button>)}</div>
          <form className="mt-5 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); patch({ nickname: nick }, "Nickname saved"); }}><Field className="flex-1" label="Nickname" value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)} /><Button type="submit" disabled={nick === user.nickname}>Save</Button></form>
        </Card>
        <Card><h2 className="mb-3 text-2xl font-semibold">My stats</h2>
          <dl className="grid grid-cols-2 gap-3">{[["Balance", `${fmt(balance)} coins`], ["Transactions", stats.txCount], ["Goals done", `${stats.goalsDone}/${stats.goalsTotal}`], ["Quizzes played", stats.quizAttempts], ["Badges", stats.badges], ["Day streak", user.streak]].map(([k, v]) => <div key={k} className="rounded-2xl bg-violet-50 p-3 dark:bg-slate-700/50"><dt className="text-xs text-slate-500">{k}</dt><dd className="font-display text-xl font-semibold">{v}</dd></div>)}</dl>
          <Button variant="soft" className="mt-4 w-full" onClick={() => nav("/rewards")}>View my achievements</Button></Card>
        <Card><h2 className="text-2xl font-semibold">Settings</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-700"><Toggle label="Animations" hint="Turn off for a calmer screen" on={user.animationsOn} onChange={(v) => patch({ animationsOn: v })} /><Toggle label="Dark mode" hint="Easier on the eyes at night" on={dark} onChange={toggleDark} /></div></Card>
        <Card><h2 className="mb-3 text-2xl font-semibold">Change password</h2>
          <form className="space-y-3" onSubmit={changePw}><Field label="Current password" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /><Field label="New password" type="password" autoComplete="new-password" required hint="8+ characters with a letter and a number" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /><Button type="submit" loading={busy === "pw"}>Update password</Button></form></Card>
      </div>
      <Button variant="ghost" className="mt-6 text-rose-600" onClick={async () => { await logout(); nav("/"); }}><LogOut className="h-5 w-5" />Log out</Button>
    </div>
  );
}
