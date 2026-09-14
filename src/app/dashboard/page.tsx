import Link from "next/link";
import { BookOpen, Brain, Clock3, Flame, Sparkles, Target, Trophy, Zap } from "lucide-react";

import { getAnalyticsDashboardData } from "@/actions/analytics.actions";

export default async function DashboardPage() {
  const data = await getAnalyticsDashboardData();
  const totalStudyMinutes = Math.round(data.weekly.reduce((sum, item) => sum + item.studyMinutes, 0));
  const totalXp = data.weekly.reduce((sum, item) => sum + item.xp, 0);
  const totalHabitCheckIns = data.weekly.reduce((sum, item) => sum + item.habitCompletions, 0);
  const topSubject = data.subjects[0];
  const topTopic = data.topics[0];
  const nextRoadmap = data.roadmap[0];
  const dhakaHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "2-digit", hour12: false }).format(new Date()));
  const greeting = dhakaHour >= 5 && dhakaHour < 12 ? "Good morning" : dhakaHour >= 12 && dhakaHour < 17 ? "Good afternoon" : dhakaHour >= 17 && dhakaHour < 21 ? "Good evening" : "Good night";

  return (
    <main className="mx-auto max-w-375 px-5 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-cyan-300">Command center</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{greeting}, {data.userName ?? "there"}</h1>
        </div>
        <p className="text-sm text-slate-500">Your momentum, pulled from real data.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Clock3 size={16} className="text-cyan-300" />} label="Study this week" value={`${totalStudyMinutes} min`} tone="cyan" />
        <StatCard icon={<Zap size={16} className="text-amber-300" />} label="XP this week" value={String(totalXp)} tone="amber" />
        <StatCard icon={<Flame size={16} className="text-emerald-300" />} label="Habit check-ins" value={String(totalHabitCheckIns)} tone="emerald" />
        <StatCard icon={<Target size={16} className="text-violet-300" />} label="Current focus" value={topSubject?.name ?? "Add a subject"} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-cyan-300">Today at a glance</p>
              <h2 className="mt-2 text-xl font-medium text-white">Momentum snapshot</h2>
            </div>
            <Sparkles size={18} className="text-cyan-300" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Top subject" value={topSubject?.name ?? "No subject"} />
            <MiniMetric label="Top topic" value={topTopic?.name ?? "No topic"} />
            <MiniMetric label="Best streak" value={data.records[0]?.value ?? "0 days"} />
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Next milestone</span>
              <Trophy size={14} className="text-amber-300" />
            </div>
            <p className="mt-3 text-lg font-medium text-white">{nextRoadmap?.title ?? "Add a roadmap item"}</p>
            <p className="mt-1 text-sm text-slate-500">{nextRoadmap ? `Target: ${nextRoadmap.targetDate ? new Date(nextRoadmap.targetDate).toLocaleDateString("en-US", { timeZone: "UTC" }) : "No date yet"}` : "Plan what matters most in the Learning Vault."}</p>
          </div>
        </section>

        <section className="glass-panel p-5">
          <p className="eyebrow text-cyan-300">Daily challenge</p>
          <h2 className="mt-2 text-xl font-medium text-white">Today’s move</h2>
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/8 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Focus</p>
            <p className="mt-3 text-base font-medium text-white">Open a topic, add one material, and keep your learning momentum moving.</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <Link href="/dashboard/learning-vault" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400/40 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:translate-y-px">
              <BookOpen size={15} /> Learning Vault
            </Link>
            <Link href="/dashboard/mind-refresh" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400/40 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:translate-y-px">
              <Brain size={15} /> Mind Refresh
            </Link>
            <Link href="/dashboard/life-rpg" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400/40 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:translate-y-px">
              <Zap size={15} /> Life Engine
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-cyan-300">Continue where you left off</p>
              <h2 className="mt-2 text-xl font-medium text-white">Study flow</h2>
            </div>
            <Link href="/dashboard/study-timer" className="text-sm text-cyan-300">Continue</Link>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Most recent topic</p>
            <p className="mt-3 text-lg font-medium text-white">{topTopic?.name ?? "No topic yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{topTopic ? `${topTopic.progress}% complete` : "Create your first topic to begin building your knowledge map."}</p>
          </div>
        </section>

        <section className="glass-panel p-5">
          <p className="eyebrow text-cyan-300">Quick actions</p>
          <div className="mt-4 grid gap-2">
            <Link href="/dashboard/study-timer" className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40">Start Study Timer</Link>
            <Link href="/dashboard/learning-vault" className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40">Add Material</Link>
            <Link href="/dashboard/life-rpg" className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40">Create Mission</Link>
            <Link href="/dashboard/habits" className="rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40">Log Habit</Link>
          </div>
        </section>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <p className="eyebrow text-cyan-300">Small life progress</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="XP" value={String(totalXp)} />
            <Metric label="Level" value={String(Math.max(1, Math.floor(totalXp / 250) + 1))} />
            <Metric label="Streak" value={data.records[0]?.value ?? "0 days"} />
          </div>
        </div>

        <div className="glass-panel p-5">
          <p className="eyebrow text-cyan-300">Recent activity</p>
          <div className="mt-4 space-y-3">
            {data.journey.slice(0, 3).map((item) => (
              <div key={`${item.title}-${item.date}`} className="rounded-xl border border-white/8 bg-slate-950/60 p-3">
                <p className="text-sm text-slate-200">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "cyan" | "amber" | "emerald" | "violet" }) {
  const tones = { cyan: "border-cyan-400/20 bg-cyan-500/5", amber: "border-amber-400/20 bg-amber-500/5", emerald: "border-emerald-400/20 bg-emerald-500/5", violet: "border-violet-400/20 bg-violet-500/5" };

  return (
    <div className={`stat-card ${tones[tone]}`}>
      <div className="mb-3 flex items-center gap-2">{icon}<span className="eyebrow">{label}</span></div>
      <strong className="block text-2xl font-medium text-white">{value}</strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-medium text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-medium text-white">{value}</p>
    </div>
  );
}