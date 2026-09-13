"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Check, Clock3, Hash, LoaderCircle, Play, RefreshCw, Sparkles, Target, Wind, Zap } from "lucide-react";

import type { MindRefreshGame } from "@/types/mind-refresh";

const activities = [
  { key: "memory-match", title: "Memory Match", description: "Remember the sequence.", icon: Brain },
  { key: "reaction-test", title: "Reaction Test", description: "Catch the signal fast.", icon: Zap },
  { key: "number-challenge", title: "Number Challenge", description: "Find the missing number.", icon: Hash },
  { key: "quick-math", title: "Quick Math", description: "Solve a tiny equation.", icon: Target },
  { key: "typing-challenge", title: "Typing Challenge", description: "Type a clean streak.", icon: Sparkles },
  { key: "focus-challenge", title: "Focus Challenge", description: "Reset your attention.", icon: Wind },
  { key: "daily-challenge", title: "Daily Challenge", description: "One fresh mental rep.", icon: Sparkles },
] as const;
type Scores = Partial<Record<MindRefreshGame, number>>;
type ScoreResult = { personalBest: number; isNewBest: boolean };

export function MindRefreshScreen() {
  const [active, setActive] = useState<(typeof activities)[number]["key"]>("memory-match");
  const [scores, setScores] = useState<Scores>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/mind-refresh").then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Scores>; }).then(setScores).catch(() => setError("Your scores could not be loaded.")).finally(() => setLoading(false)); }, []);
  async function recordScore(gameKey: MindRefreshGame, score: number) { try { const response = await fetch("/api/mind-refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameKey, score }) }); if (!response.ok) throw new Error(); const result = await response.json() as ScoreResult; if (result.isNewBest) setScores((current) => ({ ...current, [gameKey]: result.personalBest })); return result; } catch { setError("That score could not be saved."); return null; } }
  return <main className="mx-auto max-w-375 px-5 pb-12 pt-7 sm:px-8 lg:px-10"><div className="mb-7"><p className="eyebrow text-cyan-300">Short exercises / long-term clarity</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Mind Refresh</h1><p className="mt-2 text-sm text-slate-500">Small resets for memory, reaction speed, focus, and fun.</p></div>{error && <div className="state-row mb-4 text-rose-300">{error}</div>}<div className="grid gap-4 xl:grid-cols-[260px_1fr]"><aside className="glass-panel p-3"><p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-slate-600">Choose an exercise</p><div className="space-y-1">{activities.map(({ key, title, icon: Icon }) => <button key={key} className={`mind-activity ${active === key ? "mind-activity-active" : ""}`} onClick={() => setActive(key)}><Icon size={16} /><span>{title}</span>{scores[key as MindRefreshGame] !== undefined && <small>{scores[key as MindRefreshGame]}</small>}</button>)}</div></aside><section className="glass-panel min-h-120 p-5 sm:p-7">{loading ? <div className="state-row"><LoaderCircle size={18} className="animate-spin text-cyan-300" /> Loading your best scores...</div> : active === "memory-match" ? <MemoryMatch onScore={(score) => recordScore("memory-match", score)} best={scores["memory-match"]} /> : active === "reaction-test" ? <ReactionTest onScore={(score) => recordScore("reaction-test", score)} best={scores["reaction-test"]} /> : active === "number-challenge" ? <NumberChallenge onScore={(score) => recordScore("number-challenge", score)} best={scores["number-challenge"]} /> : active === "quick-math" ? <QuickMath onScore={(score) => recordScore("quick-math", score)} best={scores["quick-math"]} /> : active === "typing-challenge" ? <TypingChallenge onScore={(score) => recordScore("typing-challenge", score)} best={scores["typing-challenge"]} /> : active === "focus-challenge" ? <FocusChallenge /> : <DailyChallenge onScore={(score) => recordScore("daily-challenge", score)} best={scores["daily-challenge"]} />}</section></div></main>;
}

function GameHeader({ title, description, best }: { title: string; description: string; best?: number }) { return <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-cyan-300">Mind Refresh activity</p><h2 className="mt-2 text-2xl font-medium text-white">{title}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></div><div className="score-badge"><Sparkles size={15} className="text-amber-300" /><span>Best <strong>{best ?? "--"}</strong></span></div></div>; }
function ScoreMessage({ result }: { result: ScoreResult | null }) { return result ? <p className={`mt-5 text-sm ${result.isNewBest ? "text-emerald-300" : "text-slate-400"}`}>{result.isNewBest ? "New personal best" : `Best remains ${result.personalBest}`}.</p> : null; }

function MemoryMatch({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [message, setMessage] = useState("Start when you are ready.");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const sequenceRef = useRef<number[]>([]);

  function start() {
    const next = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4) + 1);
    sequenceRef.current = next;
    setSequence(next);
    setInput([]);
    setResult(null);
    setMessage(next.join("  "));
    window.setTimeout(() => setMessage("Repeat the sequence."), 1100);
  }

  function choose(value: number) {
    if (!sequence.length || input.length >= sequence.length) return;

    const next = [...input, value];
    setInput(next);

    if (next.length < sequence.length) return;

    const score = next.every((item, index) => item === sequenceRef.current[index]) ? 100 : 0;
    setMessage(score ? "Perfect sequence." : `The sequence was ${sequenceRef.current.join("  ")}.`);

    if (score) {
      void onScore(score).then(setResult);
    } else {
      setResult(null);
    }
  }

  return <><GameHeader title="Memory Match" description="Watch five symbols, then repeat their order." best={best} /><p className="mind-instruction">{message}</p><div className="memory-grid">{[1, 2, 3, 4].map((value) => <button key={value} className="memory-button" onClick={() => choose(value)} disabled={!sequence.length || input.length >= sequence.length}>{value}</button>)}</div><button className="primary-button mt-7" onClick={start}><Play size={15} /> Start round</button><ScoreMessage result={result} /></>;
}

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

    if (state !== "go") return;

    const value = Math.round(performance.now() - start);
    const points = Math.max(0, 1000 - value);
    setScore(value);
    setState("done");
    void onScore(points).then(setResult);
  }

  return <><GameHeader title="Reaction Test" description="Wait for the panel to turn green, then tap immediately." best={best} /><button className={`reaction-zone reaction-${state}`} onClick={state === "ready" || state === "waiting" ? begin : click}>{state === "ready" ? "Start" : state === "waiting" ? "Wait..." : state === "go" ? "CLICK" : `${score} ms · Try again`}</button><ScoreMessage result={result} /></>;
}

function NumberChallenge({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [target, setTarget] = useState<number>();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);

  function start() {
    setTarget(Math.floor(Math.random() * 80) + 20);
    setAnswer("");
    setResult(null);
  }

  function submit() {
    if (target == null || answer.trim() === "") return;

    const score = Number(answer) === target + 6 ? 100 : 0;
    if (!score) {
      setResult(null);
      return;
    }

    void onScore(score).then((nextResult) => setResult(nextResult));
  }

  return <><GameHeader title="Number Challenge" description="Spot the number that completes the sequence." best={best} /><p className="number-sequence">{target ? `${target - 6}, ${target - 3}, ${target}, ${target + 3}, ?` : "Ready when you are."}</p><input className="vault-input max-w-48" type="number" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your answer" /><div><button className="primary-button mt-4" onClick={target ? submit : start}>{target ? "Submit answer" : "Start challenge"}</button><button className="icon-button ml-2" aria-label="Reset number challenge" onClick={start}><RefreshCw size={15} /></button></div><ScoreMessage result={result} /></>;
}

function QuickMath({ onScore, best }: { onScore: (score: number) => Promise<ScoreResult | null>; best?: number }) {
  const [numbers, setNumbers] = useState<[number, number] | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);

  function start() {
    setNumbers([Math.floor(Math.random() * 12) + 2, Math.floor(Math.random() * 12) + 2]);
    setAnswer("");
    setResult(null);
  }

  function submit() {
    if (!numbers || answer.trim() === "") return;

    const score = Number(answer) === numbers[0] * numbers[1] ? 100 : 0;
    if (!score) {
      setResult(null);
      return;
    }

    void onScore(score).then((nextResult) => setResult(nextResult));
  }

  return <><GameHeader title="Quick Math" description="Solve the multiplication before your coffee cools." best={best} /><p className="number-sequence">{numbers ? `${numbers[0]} × ${numbers[1]} = ?` : "Ready when you are."}</p><input className="vault-input max-w-48" type="number" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your answer" /><div><button className="primary-button mt-4" onClick={numbers ? submit : start}>{numbers ? "Check answer" : "Start puzzle"}</button><button className="icon-button ml-2" aria-label="New quick puzzle" onClick={start}><RefreshCw size={15} /></button></div><ScoreMessage result={result} /></>;
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