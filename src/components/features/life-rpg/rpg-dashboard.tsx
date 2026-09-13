"use client";

import { useState } from "react";
import { Activity, Check, Coins, Plus, Shield, Sparkles, Target, Trash2, Trophy, Zap } from "lucide-react";

import { completeDailyChallenge, completeQuest, createQuest, deleteQuest, getRpgDashboardData } from "@/actions/rpg.actions";
import type { RpgDashboardData } from "@/types/rpg-dashboard";

const difficulties = ["easy", "medium", "hard", "epic"] as const;

export function RpgDashboard({ initialData }: { initialData: RpgDashboardData }) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setData(await getRpgDashboardData());
  }

  async function run(task: () => Promise<void>, notice: string) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await task();
      await refresh();
      setMessage(notice);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reward action failed.");
    } finally {
      setBusy(false);
    }
  }

  const progress = Math.min(100, Math.max(0, (data.profile.xp / Math.max(1, data.profile.nextLevelXp)) * 100));
  const activeMissions = data.quests.filter((quest) => !quest.completed).length;
  const recentAchievements = data.achievements.filter((achievement) => achievement.unlocked).slice(0, 3);

  return (
    <main className="mx-auto max-w-375 px-5 pb-12 pt-7 sm:px-8 lg:px-10">
      <div className="mb-7">
        <p className="eyebrow text-cyan-300">Life Engine</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Life Engine</h1>
        <p className="mt-2 text-sm text-slate-500">Build your life. Complete missions. Grow stronger.</p>
      </div>

      {error && <div className="state-row mb-4 text-rose-300">{error}</div>}
      {message && <div className="state-row mb-4 text-emerald-300"><Check size={16} />{message}</div>}

      <section className="character-card">
        <div className="level-badge">
          <span>LEVEL</span>
          <strong>{data.profile.level}</strong>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="xp-chip"><Zap size={12} /> {data.profile.xp.toLocaleString("en-US")} XP</span>
            <span className="coin-chip"><Coins size={12} /> {data.profile.coins.toLocaleString("en-US")} Life Coins</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Current XP" value={data.profile.xp.toLocaleString("en-US")} accent="text-cyan-300" />
            <Metric label="XP to next level" value={`${Math.max(0, data.profile.nextLevelXp - data.profile.xp).toLocaleString("en-US")}`} accent="text-amber-300" />
            <Metric label="Active missions" value={String(activeMissions)} accent="text-emerald-300" />
          </div>

          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>Progress to next level</span>
            <span>{Math.max(0, data.profile.nextLevelXp - data.profile.xp).toLocaleString("en-US")} XP remaining</span>
          </div>
          <div className="progress-track mt-2">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <MissionPanel
          quests={data.quests}
          busy={busy}
          onCreate={(input) => run(() => createQuest(input), "Mission created.")}
          onComplete={(id) => run(() => completeQuest(id), "Mission completed and rewards claimed.")}
          onDelete={(id) => run(() => deleteQuest(id), "Mission deleted.")}
        />

        <section className="glass-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy size={17} className="text-amber-300" />
            <h2 className="text-base font-medium text-white">Achievements</h2>
          </div>

          <div className="space-y-2">
            {data.achievements.map((item) => (
              <div className={`state-row ${item.unlocked ? "text-amber-200" : "text-slate-600"}`} key={item.id}>
                <Shield size={15} />
                <div>
                  <p className="text-sm">{item.name}</p>
                  <p className="text-xs">{item.description}</p>
                </div>
                {item.unlocked && <Check size={15} className="ml-auto text-emerald-300" />}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="glass-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={17} className="text-cyan-300" />
            <h2 className="text-base font-medium text-white">Progress & Journey</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent achievements</span>
                <Sparkles size={14} className="text-cyan-300" />
              </div>
              {recentAchievements.length ? (
                <div className="mt-3 space-y-2">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="text-sm text-slate-200">
                      {achievement.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No achievements unlocked yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Momentum</span>
                <Target size={14} className="text-emerald-300" />
              </div>
              <p className="mt-3 text-lg font-medium text-white">{activeMissions} active missions</p>
              <p className="mt-1 text-sm text-slate-500">Keep the chain alive by completing one mission at a time.</p>
            </div>
          </div>
        </section>

        <section className="glass-panel p-5 lg:col-span-1">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-cyan-300" />
                <h2 className="text-base font-medium text-white">Daily challenge</h2>
              </div>
              <p className="mt-2 text-sm text-slate-300">{data.dailyChallenge.title}</p>
              <p className="mt-1 text-xs text-slate-500">{data.dailyChallenge.description} · +{data.dailyChallenge.xpReward} XP</p>
            </div>
            <button
              className="primary-button"
              disabled={busy || data.dailyChallenge.completed}
              onClick={() => void run(() => completeDailyChallenge(data.dailyChallenge.id), "Daily challenge completed and reward claimed.")}
            >
              {data.dailyChallenge.completed ? (
                <>
                  <Check size={15} /> Completed
                </>
              ) : (
                <>
                  <Zap size={15} /> Complete
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-medium text-white ${accent}`}>{value}</p>
    </div>
  );
}

function MissionPanel({
  quests,
  busy,
  onCreate,
  onComplete,
  onDelete,
}: {
  quests: RpgDashboardData["quests"];
  busy: boolean;
  onCreate: (input: { title: string; description: string; period: "daily" | "weekly"; difficulty: typeof difficulties[number] }) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<typeof difficulties[number]>("easy");

  return (
    <section className="glass-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={17} className="text-cyan-300" />
          <h2 className="text-base font-medium text-white">Missions</h2>
        </div>
        <button className="primary-button" onClick={() => setOpen((value) => !value)}>
          <Plus size={15} /> Mission
        </button>
      </div>

      {open && (
        <form
          className="mb-4 grid gap-2 border-b border-white/10 pb-4 sm:grid-cols-[1fr_130px_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            await onCreate({ title, description: "", period: "daily", difficulty });
            setTitle("");
            setOpen(false);
          }}
        >
          <input className="vault-input" placeholder="Mission title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <select className="vault-input" value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}>
            {difficulties.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button className="primary-button" disabled={busy}>Create</button>
        </form>
      )}

      {quests.length ? (
        <div className="space-y-2">
          {quests.map((quest) => (
            <div className="quest-row" key={quest.id}>
              <div className={`difficulty difficulty-${quest.difficulty}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{quest.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {quest.difficulty} · +{quest.xpReward} XP · +{quest.coinReward} coins
                </p>
              </div>
              {!quest.completed && (
                <button className="icon-button" disabled={busy} aria-label={`Complete ${quest.title}`} onClick={() => void onComplete(quest.id)}>
                  <Check size={15} />
                </button>
              )}
              <button className="icon-button text-rose-300" disabled={busy} aria-label={`Delete ${quest.title}`} onClick={() => void onDelete(quest.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="state-row justify-center">No missions yet.</div>
      )}
    </section>
  );
}
