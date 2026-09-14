"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock3, LoaderCircle, Play, RefreshCw, Sparkles, Wind, Zap } from "lucide-react";

import type { MindRefreshGame } from "@/types/mind-refresh";

const activities = [
  { key: "reaction-test", title: "Reaction Test", description: "Catch the signal fast.", icon: Zap },
  { key: "memorize-number", title: "Memorize Number", description: "Hold a number in your mind.", icon: Sparkles },
  { key: "typing-challenge", title: "Typing Challenge", description: "Type a clean streak.", icon: Sparkles },
  { key: "focus-challenge", title: "Focus Challenge", description: "Reset your attention.", icon: Wind },
  { key: "daily-challenge", title: "Daily Challenge", description: "One fresh mental rep.", icon: Sparkles },
] as const;
type Scores = Partial<Record<MindRefreshGame, number>>;
type ScoreResult = { personalBest: number; isNewBest: boolean };

export function MindRefreshScreen() {
  const [active, setActive] = useState<(typeof activities)[number]["key"]>("reaction-test");
  const [scores, setScores] = useState<Scores>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/mind-refresh").then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Scores>; }).then(setScores).catch(() => setError("Your scores could not be loaded.")).finally(() => setLoading(false)); }, []);
  async function recordScore(gameKey: MindRefreshGame, score: number) { try { const response = await fetch("/api/mind-refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameKey, score }) }); if (!response.ok) throw new Error(); const result = await response.json() as ScoreResult; if (result.isNewBest) setScores((current) => ({ ...current, [gameKey]: result.personalBest })); return result; } catch { setError("That score could not be saved."); return null; } }
  return <main className="mx-auto max-w-375 px-5 pb-12 pt-7 sm:px-8 lg:px-10"><div className="mb-7"><p className="eyebrow text-cyan-300">Short exercises / long-term clarity</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Mind Refresh</h1><p className="mt-2 text-sm text-slate-500">Small resets for reaction speed, memory, focus, and fun.</p></div>{error && <div className="state-row mb-4 text-rose-300">{error}</div>}<div className="grid gap-4 xl:grid-cols-[260px_1fr]"><aside className="glass-panel p-3"><p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">Choose an exercise</p><div className="space-y-1">{activities.map(({ key, title, icon: Icon }) => <button key={key} className={`mind-activity ${active === key ? "mind-activity-active" : ""}`} onClick={() => setActive(key)}><Icon size={16} /><span>{title}</span>{scores[key as MindRefreshGame] !== undefined && <small>{scores[key as MindRefreshGame]}</small>}</button>)}</div></aside><section className="glass-panel min-h-120 p-5 sm:p-7">{loading ? <div className="state-row"><LoaderCircle size={18} className="animate-spin text-cyan-300" /> Loading your best scores...</div> : active === "reaction-test" ? <ReactionTest onScore={(score) => recordScore("reaction-test", score)} best={scores["reaction-test"]} /> : active === "memorize-number" ? <MemorizeNumber onScore={(score) => recordScore("memorize-number", score)} best={scores["memorize-number"]} /> : active === "typing-challenge" ? <TypingChallenge onScore={(score) => recordScore("typing-challenge", score)} best={scores["typing-challenge"]} /> : active === "focus-challenge" ? <FocusChallenge /> : <DailyChallenge onScore={(score) => recordScore("daily-challenge", score)} best={scores["daily-challenge"]} />}</section></div></main>;
}

function GameHeader({ title, description, best }: { title: string; description: string; best?: number }) { return <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-cyan-300">Mind Refresh activity</p><h2 className="mt-2 text-2xl font-medium text-white">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></div><div className="score-badge"><Sparkles size={15} className="text-amber-300" /><span>Best <strong>{best ?? "--"}</strong></span></div></div>; }
function ScoreMetric({ label, value }: { label: string; value: string }) { return <div className="metric-tile"><strong>{value}</strong><span>{label}</span></div>; }
function ScoreMessage({ result }: { result: ScoreResult | null }) { return result ? <p className={`mt-5 text-sm ${result.isNewBest ? "text-emerald-300" : "text-slate-400"}`}>{result.isNewBest ? "New personal best" : `Best remains ${result.personalBest}`}.</p> : null; }

function ReactionTest({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [state, setState] = useState<"ready" | "waiting" | "go" | "done">("ready");
  const [start, setStart] = useState(0);
  const [score, setScore] = useState<number>();
  const [result, setResult] = useState<ScoreResult | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function begin() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setState("waiting");
    setResult(null);
    setScore(undefined);

    timeoutRef.current = window.setTimeout(() => {
      setStart(performance.now());
      setState("go");
    }, 900 + Math.random() * 1800);
  }

  function click() {
    if (state === "waiting") {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = null;
      setState("ready");
      setScore(undefined);
      setResult(null);
      return;
    }

    if (state === "done") { begin(); return; }
    if (state !== "go") return;

    const value = Math.round(performance.now() - start);
    const points = Math.max(0, 1000 - value);
    setScore(value);
    setState("done");
    void onScore(points).then(setResult);
  }

  return <><GameHeader title="Reaction Test" description="Wait for the panel to turn green, then tap immediately." best={best} /><div className="mb-4 flex gap-3 text-sm text-slate-400"><span>Score: <strong className="text-white">{result?.personalBest === score ? Math.max(0, 1000 - (score ?? 0)) : score ? Math.max(0, 1000 - score) : 0}</strong></span><span>Best: <strong className="text-cyan-300">{best ?? 0}</strong></span></div><button className={`reaction-zone reaction-${state}`} onClick={state === "ready" || state === "waiting" ? begin : click}>{state === "ready" ? "Start" : state === "waiting" ? "Wait..." : state === "go" ? "CLICK" : `${score} ms · Try again`}</button><ScoreMessage result={result} /></>;
}

function MemorizeNumber({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState("");
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"ready" | "showing" | "answer" | "done">("ready");
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);
  function startRound(nextRound = round + 1, nextScore = score) {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    const length = Math.min(3 + nextRound - 1, 10);
    const next = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
    setRound(nextRound); setScore(nextScore); setSequence(next); setAnswer(""); setResult(null); setPhase("showing");
    hideTimer.current = window.setTimeout(() => setPhase("answer"), Math.max(900, 2200 - nextRound * 100));
  }
  async function submit() {
    if (phase !== "answer") return;
    if (answer === sequence) { const nextScore = score + round * 10 + 5; setScore(nextScore); startRound(round + 1, nextScore); return; }
    setPhase("done");
    setResult(await onScore(score));
  }
  function reset() { if (hideTimer.current) window.clearTimeout(hideTimer.current); setRound(0); setSequence(""); setAnswer(""); setScore(0); setResult(null); setPhase("ready"); }
  return <><GameHeader title="Memorize Number" description="Remember the sequence, then build your score round by round." best={best} /><div className="grid gap-3 sm:grid-cols-3"><ScoreMetric label="Score" value={String(score)} /><ScoreMetric label="Round" value={String(round || 1)} /><ScoreMetric label="Best" value={String(best ?? 0)} /></div><p className="number-sequence mt-7">{phase === "showing" ? sequence : phase === "answer" ? "Enter the number" : phase === "done" ? "Run complete" : "Ready when you are."}</p>{phase === "answer" && <input autoFocus className="vault-input max-w-64" inputMode="numeric" value={answer} onChange={(event) => setAnswer(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} placeholder="Type the sequence" />}{phase === "ready" && <button className="primary-button mt-5" onClick={() => startRound()}><Play size={15} /> Start game</button>}{phase === "answer" && <button className="primary-button mt-5" disabled={!answer} onClick={() => void submit()}>Check answer</button>}{phase === "done" && <button className="primary-button mt-5" onClick={reset}><RefreshCw size={15} /> Try again</button>}<ScoreMessage result={result} /></>;
}

function TypingChallenge({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const words = ["clarity", "discipline", "momentum", "progress", "focus", "practice", "insight"];
  const [prompt, setPrompt] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);

  function start() {
    setPrompt(words[Math.floor(Math.random() * words.length)]);
    setInput("");
    setResult(null);
  }

  function submit() {
    const clean = input.trim().toLowerCase();
    const score = clean === prompt ? 100 : 0;
    if (!score) {
      setResult(null);
      return;
    }

    void onScore(score).then((nextResult) => setResult(nextResult));
  }

  return <><GameHeader title="Typing Challenge" description="Type the prompt exactly as shown, then lock in the streak." best={best} /><p className="number-sequence">{prompt || "Ready when you are."}</p><input className="vault-input max-w-64" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type here" /><div><button className="primary-button mt-4" onClick={prompt ? submit : start}>{prompt ? "Submit" : "Start typing"}</button><button className="icon-button ml-2" aria-label="Reset typing challenge" onClick={start}><RefreshCw size={15} /></button></div><ScoreMessage result={result} /></>;
}

function FocusChallenge() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          return 60;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  return <><GameHeader title="Focus Challenge" description="A one-minute guided reset for a scattered mind." /><div className="breathing-orb"><Wind size={28} /><strong>{running ? `${seconds}s` : "Breathe"}</strong><span>{running ? "Slow and steady" : "In for four, out for four"}</span></div><button className="primary-button mt-7" onClick={() => setRunning(!running)}>{running ? "Pause" : "Begin reset"}</button></>;
}

function DailyChallenge({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  return <><GameHeader title="Daily Challenge" description="Complete one tiny mental reset before the day moves on." best={best} /><div className="daily-challenge"><Clock3 size={22} className="text-amber-300" /><p>Write down the three most important things on your mind, then choose only one to begin.</p></div><button className="primary-button mt-7" disabled={done} onClick={() => {
    if (done) return;
    setDone(true);
    void onScore(100).then(setResult);
  }}>{done ? <><Check size={15} /> Completed today</> : <><Play size={15} /> Mark complete</>}</button><ScoreMessage result={result} /></>;
}