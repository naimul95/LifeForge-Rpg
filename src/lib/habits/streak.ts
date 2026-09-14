const DAY_MS = 86_400_000;
const TIME_ZONE = "Asia/Dhaka";

type HabitSchedule = {
  frequency: string;
  selectedDays: unknown;
  startDate: Date;
  endDate: Date | null;
  polarity: "good" | "bad";
};

type HabitLog = { dateKey: Date; completed: boolean; status?: string };

export function dhakaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function parseKey(key: string) { return new Date(`${key}T00:00:00.000Z`); }
function key(date: Date) { return date.toISOString().slice(0, 10); }
function daysBetween(start: string, end: string) { const dates: string[] = []; for (let value = parseKey(start); value <= parseKey(end); value = new Date(value.getTime() + DAY_MS)) dates.push(key(value)); return dates; }
function selectedDays(schedule: HabitSchedule) { return Array.isArray(schedule.selectedDays) ? schedule.selectedDays.filter((day): day is number => typeof day === "number") : []; }
function isScheduled(schedule: HabitSchedule, date: string) {
  const day = parseKey(date);
  const start = key(schedule.startDate);
  if (date < start || (schedule.endDate && date > key(schedule.endDate))) return false;
  if (schedule.frequency === "daily") return true;
  const days = selectedDays(schedule);
  return days.length === 0 || days.includes(day.getUTCDay());
}
function isSuccessful(schedule: HabitSchedule, log: HabitLog | undefined) { return Boolean(log && (log.status ? (schedule.polarity === "good" ? log.status === "DONE" : log.status === "AVOIDED") : log.completed)); }

export function calculateHabitStreak(schedule: HabitSchedule, logs: HabitLog[], today = dhakaDateKey()) {
  const successful = new Set(logs.filter((log) => isSuccessful(schedule, log)).map((log) => dhakaDateKey(log.dateKey)));
  const byDate = new Map(logs.map((log) => [dhakaDateKey(log.dateKey), log]));
  const start = key(schedule.startDate);
  const scheduled = daysBetween(start, today).filter((date) => isScheduled(schedule, date));
  let best = 0;
  let run = 0;
  for (const date of scheduled) { if (successful.has(date)) run += 1; else run = 0; best = Math.max(best, run); }
  let current = 0;
  for (let index = scheduled.length - 1; index >= 0; index -= 1) { const date = scheduled[index]; if (!isSuccessful(schedule, byDate.get(date))) break; current += 1; }
  return { currentStreak: current, bestStreak: best };
}