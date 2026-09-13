"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, Check, Flame, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react";

import { createTrackedHabit, deleteTrackedHabit, getHabitDashboardData, setHabitStatus, updateTrackedHabit } from "@/actions/habit.actions";
import type { HabitDashboardData, HabitDashboardItem, HabitFrequency, HabitLogStatus, HabitPolarity } from "@/types/habit-dashboard";

type HabitFilter = "all" | "good" | "bad" | "active" | "needs_attention";

type HabitFormValues = {
  name: string;
  description: string;
  polarity: HabitPolarity;
  frequency: HabitFrequency;
  selectedDays: number[];
  startDate: string;
  endDate: string;
  reminder: string;
  target: number;
  active: boolean;
};

const DAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const defaultForm = (): HabitFormValues => ({
  name: "",
  description: "",
  polarity: "good",
  frequency: "daily",
  selectedDays: [0, 1, 2, 3, 4, 5, 6],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  reminder: "",
  target: 1,
  active: true,
});

const statusBadge = {
  GOOD: "Good Habit",
  BAD: "Bad Habit",
};

function getStatusLabel(status: HabitLogStatus, polarity: HabitPolarity) {
  if (polarity === "good") {
    switch (status) {
      case "DONE":
        return "Done";
      case "NOT_DONE":
        return "Not Done";
      case "SKIPPED":
        return "Skipped";
      default:
        return "Skipped";
    }
  }

  switch (status) {
    case "AVOIDED":
      return "Avoided";
    case "DID_IT":
      return "Did It";
    case "SKIPPED":
      return "Skipped";
    default:
      return "Skipped";
  }
}

function formatCalendarStatus(status: HabitLogStatus | undefined, polarity: HabitPolarity) {
  if (!status) return "—";

  if (polarity === "good") {
    switch (status) {
      case "DONE":
        return "✓ Done";
      case "NOT_DONE":
        return "✗ Not Done";
      case "SKIPPED":
        return "— Skipped";
      default:
        return "— Skipped";
    }
  }

  switch (status) {
    case "AVOIDED":
      return "✓ Avoided";
    case "DID_IT":
      return "✗ Did It";
    case "SKIPPED":
      return "— Skipped";
    default:
      return "— Skipped";
  }
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function buildCurrentWeekDates() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const currentDay = today.getUTCDay();
  const saturdayOffset = (currentDay + 1) % 7;
  const saturday = new Date(today);
  saturday.setUTCDate(today.getUTCDate() - saturdayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(saturday);
    value.setUTCDate(saturday.getUTCDate() + index);
    return value;
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function HabitDashboard({ initialData }: { initialData: HabitDashboardData }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<HabitFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<HabitFormValues>(defaultForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const todayKey = getTodayKey();
  const weeklyDates = useMemo(() => buildCurrentWeekDates(), []);

  const filteredHabits = useMemo(() => {
    return data.habits.filter((habit) => {
      if (filter === "good") return habit.polarity === "good";
      if (filter === "bad") return habit.polarity === "bad";
      if (filter === "active") return habit.active;
      if (filter === "needs_attention") return habit.weekly.completionRate < 60 || habit.currentStreak < 2;
      return true;
    });
  }, [data.habits, filter]);

  async function refresh() {
    const next = await getHabitDashboardData();
    setData(next);
  }

  async function run(task: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await task();
      await refresh();
      if (successMessage) {
        setNotice(successMessage);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The habit action failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateForm<K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: number) {
    setFormValues((current) => {
      const exists = current.selectedDays.includes(day);
      const next = exists ? current.selectedDays.filter((item) => item !== day) : [...current.selectedDays, day].sort((left, right) => left - right);
      return { ...current, selectedDays: next };
    });
  }

  function openCreateForm() {
    setEditingId(null);
    setFormValues(defaultForm());
    setFormOpen(true);
  }

  function openEditForm(habit: HabitDashboardItem) {
    setEditingId(habit.id);
    setFormValues({
      name: habit.name,
      description: habit.description,
      polarity: habit.polarity,
      frequency: habit.frequency,
      selectedDays: [...habit.selectedDays],
      startDate: habit.startDate,
      endDate: habit.endDate ?? "",
      reminder: habit.reminder ?? "",
      target: habit.target,
      active: habit.active,
    });
    setFormOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      polarity: formValues.polarity,
      frequency: formValues.frequency,
      selectedDays: formValues.selectedDays,
      startDate: formValues.startDate,
      endDate: formValues.endDate || null,
      reminder: formValues.reminder.trim() || null,
      target: Number(formValues.target) || 1,
      active: formValues.active,
    };

    await run(async () => {
      if (editingId) {
        await updateTrackedHabit(editingId, payload);
      } else {
        await createTrackedHabit(payload);
      }
      setFormOpen(false);
      setEditingId(null);
      setFormValues(defaultForm());
    }, editingId ? "Habit updated." : "Habit created.");
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormValues(defaultForm());
  }

  return (
    <main className="mx-auto max-w-375 px-5 pb-28 pt-7 sm:px-8 lg:px-10 lg:pb-10">
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow text-cyan-300">Behavior tracking system</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Habits</h1>
          <p className="mt-2 text-sm text-slate-500">Build better habits, track your daily progress, and stay consistent.</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm}>
          <Plus size={15} /> Add habit
        </button>
      </div>

      {error && (
        <div className="state-row mb-4 text-rose-300">
          <X size={17} />
          {error}
          <button className="ml-auto text-xs" type="button" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {notice && (
        <div className="state-row mb-4 text-emerald-300">
          <Check size={17} />
          {notice}
        </div>
      )}

      {formOpen && (
        <section className="glass-panel mb-5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow text-cyan-300">{editingId ? "Edit habit" : "Create habit"}</p>
              <h2 className="mt-2 text-xl font-medium text-white">{editingId ? "Update the habit details" : "Add a new habit"}</h2>
            </div>
            <button className="text-sm text-slate-400" type="button" onClick={cancelForm}>Cancel</button>
          </div>

          <form className="space-y-4" onSubmit={submitForm}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Name
                <input className="vault-input mt-2" value={formValues.name} onChange={(event) => updateForm("name", event.target.value)} required />
              </label>

              <label className="field-label">
                Type
                <select className="vault-input mt-2" value={formValues.polarity} onChange={(event) => updateForm("polarity", event.target.value as HabitPolarity)}>
                  <option value="good">Good Habit</option>
                  <option value="bad">Bad Habit</option>
                </select>
              </label>
            </div>

            <label className="field-label">
              Description
              <textarea className="vault-input mt-2 min-h-24" value={formValues.description} onChange={(event) => updateForm("description", event.target.value)} />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="field-label">
                Frequency
                <select className="vault-input mt-2" value={formValues.frequency} onChange={(event) => updateForm("frequency", event.target.value as HabitFrequency)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="specific_days">Specific days</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label className="field-label">
                Start date
                <input className="vault-input mt-2" type="date" value={formValues.startDate} onChange={(event) => updateForm("startDate", event.target.value)} required />
              </label>

              <label className="field-label">
                End date (optional)
                <input className="vault-input mt-2" type="date" value={formValues.endDate} onChange={(event) => updateForm("endDate", event.target.value)} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-label">
                Reminder (optional)
                <input className="vault-input mt-2" value={formValues.reminder} onChange={(event) => updateForm("reminder", event.target.value)} placeholder="e.g. 8:00 PM" />
              </label>

              <label className="field-label">
                Target
                <input className="vault-input mt-2" type="number" min="1" max="100" value={formValues.target} onChange={(event) => updateForm("target", Number(event.target.value) || 1)} />
              </label>
            </div>

            <div className="space-y-2">
              <p className="field-label">Selected days</p>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, index) => {
                  const active = formValues.selectedDays.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full border px-3 py-2 text-xs font-medium transition ${active ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400"}`}
                      onClick={() => toggleDay(index)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" checked={formValues.active} onChange={(event) => updateForm("active", event.target.checked)} />
              Habit is active
            </label>

            <div className="flex flex-wrap gap-3">
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Saving..." : editingId ? "Update habit" : "Create habit"}
              </button>
              <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300" type="button" onClick={cancelForm}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="glass-panel mb-5 p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-cyan-300">Habit overview</p>
            <h2 className="mt-1 text-xl font-medium text-white">Weekly scoreboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "good", label: "Good Habits" },
              { value: "bad", label: "Bad Habits" },
              { value: "active", label: "Active" },
              { value: "needs_attention", label: "Needs Attention" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value as HabitFilter)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${filter === option.value ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-400"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Total habits" value={String(data.analysis.total)} accent="cyan" />
          <MetricCard label="Good habits" value={String(data.analysis.good)} accent="emerald" />
          <MetricCard label="Bad habits" value={String(data.analysis.bad)} accent="rose" />
          <MetricCard label="Completion rate" value={`${data.analysis.completionRate}%`} accent="amber" />
          <MetricCard label="Current streak" value={`${data.analysis.currentStreak}d`} accent="violet" />
          <MetricCard label="Best streak" value={`${data.analysis.bestStreak}d`} accent="sky" />
        </div>
      </section>

      <section className="space-y-4">
        {filteredHabits.length === 0 ? (
          <div className="glass-panel p-6 text-center text-sm text-slate-400">No habits match the current filter yet. Create your first recurring habit above.</div>
        ) : (
          filteredHabits.map((habit) => {
            const todayStatus = habit.logs.find((log) => log.date === todayKey)?.status;
            const statusOptions = habit.polarity === "good"
              ? [
                  { value: "DONE", label: "Done" },
                  { value: "NOT_DONE", label: "Not Done" },
                  { value: "SKIPPED", label: "Skipped" },
                ]
              : [
                  { value: "AVOIDED", label: "Avoided" },
                  { value: "DID_IT", label: "Did It" },
                  { value: "SKIPPED", label: "Skipped" },
                ];

            return (
              <article key={habit.id} className="glass-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-medium text-white">{habit.name}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${habit.polarity === "good" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                        {statusBadge[habit.polarity === "good" ? "GOOD" : "BAD"]}
                      </span>
                      {!habit.active && <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Inactive</span>}
                    </div>

                    {habit.description && <p className="mt-2 text-sm text-slate-400">{habit.description}</p>}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 px-2 py-1">{habit.frequency}</span>
                      <span className="rounded-full border border-white/10 px-2 py-1">Target: {habit.target}</span>
                      <span className="rounded-full border border-white/10 px-2 py-1">Starts {formatDateLabel(habit.startDate)}</span>
                      {habit.endDate && <span className="rounded-full border border-white/10 px-2 py-1">Ends {formatDateLabel(habit.endDate)}</span>}
                      {habit.reminder && <span className="rounded-full border border-white/10 px-2 py-1">Reminder {habit.reminder}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300" type="button" onClick={() => openEditForm(habit)}>
                      <Pencil size={15} className="mr-1 inline" /> Edit
                    </button>
                    <button
                      className="rounded-lg border border-rose-400/30 px-3 py-2 text-sm text-rose-300"
                      type="button"
                      onClick={() => run(async () => { await deleteTrackedHabit(habit.id); }, "Habit deleted.")}
                    >
                      <Trash2 size={15} className="mr-1 inline" /> Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MiniMetric icon={<Flame size={14} />} label="Current streak" value={`${habit.currentStreak} days`} />
                    <MiniMetric icon={<TrendingUp size={14} />} label="Best streak" value={`${habit.bestStreak} days`} />
                    <MiniMetric icon={<CalendarCheck2 size={14} />} label="Weekly rate" value={`${habit.weekly.completionRate}%`} />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today’s status</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {statusOptions.map((option) => {
                        const active = todayStatus === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`rounded-full border px-3 py-2 text-xs font-medium transition ${active ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300"}`}
                            onClick={() => run(async () => { await setHabitStatus(habit.id, todayKey, { status: option.value as HabitLogStatus }); }, `${habit.name} updated.`)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {todayStatus ? `Currently: ${getStatusLabel(todayStatus, habit.polarity)}` : "No status recorded today yet."}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weekly progress</p>
                      <p className="mt-1 text-sm text-slate-300">{habit.weekly.successful}/{habit.weekly.scheduled} successful days</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completion</p>
                      <p className="mt-1 text-lg font-medium text-white">{habit.weekly.completionRate}%</p>
                    </div>
                  </div>
                  <div className="progress-track mt-3">
                    <div className="progress-fill" style={{ width: `${habit.weekly.completionRate}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Successful: {habit.weekly.successful}</span>
                    <span>Missed: {habit.weekly.missed}</span>
                    <span>Skipped: {habit.weekly.skipped}</span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="glass-panel mt-5 p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-cyan-300">Weekly habit analysis</p>
            <h2 className="mt-1 text-xl font-medium text-white">Real habit performance</h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Successful habit days" value={String(data.analysis.successful)} accent="emerald" />
          <MetricCard label="Missed habit days" value={String(data.analysis.missed)} accent="rose" />
          <MetricCard label="Skipped days" value={String(data.analysis.skipped)} accent="slate" />
          <MetricCard label="Previous week" value={`${data.analysis.previousRate}%`} accent="cyan" />
        </div>

        <div className="mt-5 space-y-3">
          {data.habits.map((habit) => (
            <div key={`${habit.id}-analysis`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{habit.name}</p>
                  <p className="text-xs text-slate-400">{habit.polarity === "good" ? "Good Habit" : "Bad Habit"}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{habit.weekly.successful} successful days</span>
                  <span>{habit.weekly.missed} missed</span>
                  <span>{habit.weekly.skipped} skipped</span>
                  <span>{habit.currentStreak} day streak</span>
                </div>
              </div>

              <div className="progress-track mt-3">
                <div className="progress-fill" style={{ width: `${habit.weekly.completionRate}%` }} />
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Completion: {habit.weekly.completionRate}%</span>
                <span>{habit.weekly.successful}/{habit.weekly.scheduled} scheduled days</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel mt-5 p-5">
        <p className="eyebrow text-cyan-300">Weekly calendar</p>
        <h2 className="mt-1 text-xl font-medium text-white">Habit tracker for the current week</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[680px] w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr>
                <th className="pb-2 pr-3 text-xs uppercase tracking-[0.2em] text-slate-500">Habit</th>
                {weeklyDates.map((date) => (
                  <th key={date.toISOString()} className="pb-2 px-2 text-center text-xs uppercase tracking-[0.16em] text-slate-500">
                    <div>{DAY_LABELS[date.getUTCDay() === 0 ? 6 : (date.getUTCDay() + 1) % 7]}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.habits.map((habit) => {
                const logMap = new Map(habit.logs.map((log) => [log.date, log.status]));

                return (
                  <tr key={`${habit.id}-calendar`} className="rounded-lg bg-black/10">
                    <td className="rounded-l-xl border border-r-0 border-white/10 bg-black/10 p-3 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{habit.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{habit.polarity === "good" ? "Good" : "Bad"}</span>
                      </div>
                    </td>
                    {weeklyDates.map((date) => {
                      const dateKey = date.toISOString().slice(0, 10);
                      const status = logMap.get(dateKey);

                      return (
                        <td key={`${habit.id}-${dateKey}`} className="border border-white/10 bg-black/10 px-2 py-3 text-center align-middle">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-medium ${status === "DONE" || status === "AVOIDED" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : status === "NOT_DONE" || status === "DID_IT" ? "border-rose-400/30 bg-rose-400/10 text-rose-200" : "border-white/10 bg-white/5 text-slate-400"}`}>
                            {formatCalendarStatus(status, habit.polarity)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel mt-5 p-5">
        <p className="eyebrow text-cyan-300">Monthly overview</p>
        <h2 className="mt-1 text-xl font-medium text-white">Consistency across the month</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard label="Successful days" value={String(data.habits.reduce((sum, habit) => sum + habit.monthly.successful, 0))} accent="emerald" />
          <MetricCard label="Missed days" value={String(data.habits.reduce((sum, habit) => sum + habit.monthly.missed, 0))} accent="rose" />
          <MetricCard label="Skipped days" value={String(data.habits.reduce((sum, habit) => sum + habit.monthly.skipped, 0))} accent="slate" />
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-400/20 text-cyan-200",
    emerald: "border-emerald-400/20 text-emerald-200",
    rose: "border-rose-400/20 text-rose-200",
    amber: "border-amber-400/20 text-amber-200",
    violet: "border-violet-400/20 text-violet-200",
    sky: "border-sky-400/20 text-sky-200",
    slate: "border-slate-400/20 text-slate-200",
  };

  return (
    <div className={`stat-card ${colors[accent] ?? colors.cyan}`}>
      <span className="eyebrow">{label}</span>
      <strong className="mt-4 block text-3xl font-medium text-white">{value}</strong>
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <div className="flex items-center gap-2 text-cyan-300">{icon}<span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</span></div>
      <p className="mt-2 text-lg font-medium text-white">{value}</p>
    </div>
  );
}
