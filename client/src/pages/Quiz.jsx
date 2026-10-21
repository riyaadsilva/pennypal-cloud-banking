import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import { Button, Card, Empty, PageLoading, PageTitle, Progress } from "../components/ui.jsx";
import Penny from "../components/Penny.jsx";
import { useFx } from "../components/Fx.jsx";
import { useMotionOk } from "../hooks/useMotionOk.js";

const COLORS = ["bg-violet-100 text-violet-700", "bg-yellow-100 text-yellow-800", "bg-sky-100 text-sky-700", "bg-emerald-100 text-emerald-700", "bg-pink-100 text-pink-700", "bg-orange-100 text-orange-700"];

function Player({ quizId, onExit }) {
  const fx = useFx(); const ok = useMotionOk();
  const [quiz, setQuiz] = useState(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [fb, setFb] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/quizzes/${quizId}`).then(setQuiz).catch((e) => { toast.error(e.message); onExit(); }); }, [quizId, onExit]);
  if (!quiz) return <PageLoading />;
  const qs = quiz.questions, q = qs[i];

  const choose = async (idx) => {
    if (picked !== null) return;
    setPicked(idx);
    try { setFb(await api.post(`/quizzes/${quizId}/answer`, { questionId: q.id, choice: idx })); } catch (e) { toast.error(e.message); setPicked(null); }
  };
  const next = async () => {
    const all = [...answers, picked];
    if (i + 1 < qs.length) { setAnswers(all); setI(i + 1); setPicked(null); setFb(null); return; }
    setBusy(true);
    try { const r = await api.post(`/quizzes/${quizId}/submit`, { answers: all }); setResult(r); fx.reward(r.rewards); if (r.score === r.total) fx.burst(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  if (result) {
    const pct = result.score / result.total;
    return (
      <Card className="mx-auto max-w-lg text-center">
        <Penny mood={pct >= 0.6 ? "celebrate" : "happy"} size={170} className="mx-auto" />
        <h2 className="text-4xl font-semibold">{result.score} / {result.total}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{pct === 1 ? "Perfect! You are a money superstar!" : pct >= 0.6 ? "Great job! You really know your coins." : "Good try! Every quiz makes you smarter. Try again!"}</p>
        <p className="mt-3 inline-block rounded-full bg-yellow-100 px-4 py-1.5 font-display font-semibold text-yellow-800">{result.xpAwarded > 0 ? `+${result.xpAwarded} XP earned` : "No new XP this time. Beat your best to earn more!"}</p>
        <div className="mt-5 flex gap-3"><Button variant="soft" className="flex-1" onClick={() => { setI(0); setPicked(null); setFb(null); setAnswers([]); setResult(null); }}>Try again</Button><Button className="flex-1" onClick={onExit}>All quizzes</Button></div>
      </Card>
    );
  }
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3"><button onClick={onExit} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Quit quiz"><X /></button><div className="flex-1"><Progress value={((i + (fb ? 1 : 0)) / qs.length) * 100} color="bg-mint" label="Quiz progress" /></div><span className="text-sm font-semibold tabular-nums">{i + 1}/{qs.length}</span></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={ok ? { opacity: 0, x: 40 } : false} animate={{ opacity: 1, x: 0 }} exit={ok ? { opacity: 0, x: -40 } : {}} transition={{ duration: 0.25 }}>
          <Card>
            <div className="flex items-start gap-3"><Penny mood={fb ? (fb.correct ? "celebrate" : "oops") : "think"} size={90} /><h2 className="pt-2 text-2xl font-semibold leading-snug">{q.prompt}</h2></div>
            <div className="mt-5 grid gap-3" role="group" aria-label="Answers">
              {q.options.map((o, idx) => {
                const state = fb ? (idx === fb.correctIndex ? "right" : idx === picked ? "wrong" : "idle") : "idle";
                return (
                  <motion.button key={idx} whileTap={{ scale: 0.98 }} animate={ok && state === "wrong" ? { x: [0, -8, 8, -4, 0] } : {}} disabled={picked !== null} onClick={() => choose(idx)}
                    className={`flex min-h-[56px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-medium transition ${state === "right" ? "border-mint bg-emerald-50 text-emerald-900" : state === "wrong" ? "border-rose-400 bg-rose-50 text-rose-900" : picked === idx ? "border-lavender" : "border-slate-200 hover:border-lavender hover:bg-violet-50 dark:border-slate-600 dark:hover:bg-slate-700"} disabled:cursor-default`}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 font-display font-semibold text-slate-600">{state === "right" ? <Check className="h-4 w-4 text-emerald-600" /> : state === "wrong" ? <X className="h-4 w-4 text-rose-600" /> : "ABCD"[idx]}</span>{o}
                  </motion.button>);
              })}
            </div>
            {fb && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-2xl p-4 ${fb.correct ? "bg-emerald-50 text-emerald-900" : "bg-orange-50 text-orange-900"}`} role="status">
                <p className="font-display font-semibold">{fb.correct ? "Yes! Nice work!" : "Not quite, but you are learning!"}</p><p className="text-sm">{fb.explanation}</p>
                <Button className="mt-3 w-full" loading={busy} onClick={next}>{i + 1 < qs.length ? "Next question" : "See my score"}</Button>
              </motion.div>)}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Quiz() {
  const [list, setList] = useState(null);
  const [history, setHistory] = useState([]);
  const [playing, setPlaying] = useState(null);
  const load = useCallback(async () => { const [a, b] = await Promise.all([api.get("/quizzes"), api.get("/quizzes/history")]); setList(a.quizzes); setHistory(b.attempts); }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load]);
  const exit = useCallback(() => { setPlaying(null); load(); }, [load]);
  if (playing) return <Player quizId={playing} onExit={exit} />;
  if (!list) return <PageLoading />;
  return (
    <div>
      <PageTitle title="Money Quizzes" sub="Learn, play and earn XP." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((q, i) => (
          <motion.button key={q.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setPlaying(q.id)} className="rounded-card bg-white p-5 text-left shadow-lift dark:bg-slate-800">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${COLORS[i % COLORS.length]}`}>{q.category}</span>
            <h3 className="mt-3 text-2xl font-semibold">{q.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{q.questions} questions · {q.bestScore != null ? `Best: ${q.bestScore}/${q.questions}` : "Not played yet"}</p>
          </motion.button>))}
      </div>
      <Card className="mt-6"><h2 className="mb-2 text-2xl font-semibold">My quiz history</h2>
        {history.length === 0 ? <Empty title="No quizzes yet" text="Pick one above to start your streak." /> : <ul className="divide-y divide-slate-100 dark:divide-slate-700">{history.map((h) => <li key={h.id} className="flex items-center justify-between py-3"><span><span className="font-medium">{h.title}</span><span className="block text-xs text-slate-500">{new Date(h.created_at).toLocaleDateString()}</span></span><span className="text-right font-display font-semibold">{h.score}/{h.total}<span className="block text-xs font-normal text-yellow-700">+{h.xp_awarded} XP</span></span></li>)}</ul>}</Card>
    </div>
  );
}
