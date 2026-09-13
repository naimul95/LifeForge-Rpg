"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { HabitDto, PlanningData } from "@/types/planning-dashboard";

const goalInput = z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).default(""), category: z.string().trim().min(1).max(60), startDate: z.string().date(), deadline: z.string().date() }).refine((value) => value.deadline >= value.startDate, "Deadline must be on or after the start date.");
const habitInput = z.object({ name: z.string().trim().min(1).max(100), polarity: z.enum(["good", "bad"]) });
const reminderInput = z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).default(""), remindAt: z.string().trim().min(1) });
const REMINDER_TIMEZONE = "Asia/Dhaka";
const REMINDER_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (value: Date) => value.toISOString().slice(0, 10);
function streaks(logs: Array<{ dateKey: Date; completed: boolean }>): Pick<HabitDto, "currentStreak" | "bestStreak"> {
  const days = new Set(logs.filter((log) => log.completed).map((log) => dateKey(log.dateKey)));
  const today = new Date(); let current = 0; const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  while (days.has(dateKey(cursor))) { current += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  const sorted = [...days].sort(); let best = 0; let run = 0; let previous: Date | null = null;
  for (const day of sorted) { const value = dateValue(day); if (previous && value.getTime() - previous.getTime() === 86_400_000) run += 1; else run = 1; previous = value; best = Math.max(best, run); }
  return { currentStreak: current, bestStreak: best };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const zonedTimestamp = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
  return (zonedTimestamp - date.getTime()) / 60_000;
}

function parseReminderDateTime(value: string) {
  const match = REMINDER_DATE_TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error("Reminder time must be a valid datetime-local value.");
  }

  const [, year, month, day, hour, minute] = match;
  const localTimestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(localTimestamp), REMINDER_TIMEZONE);
  return new Date(localTimestamp - offsetMinutes * 60_000);
}

export async function getPlanningData(): Promise<PlanningData> {
  const { userId } = await requireSession();
  const [goals, habits, reminders] = await Promise.all([
    prisma.goal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { deadline: "asc" }], take: 100, select: { id: true, title: true, description: true, category: true, startDate: true, deadline: true, progress: true, status: true } }),
    prisma.habit.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, name: true, polarity: true, logs: { where: { userId }, orderBy: { dateKey: "desc" }, take: 90, select: { dateKey: true, completed: true } } } }),
    prisma.reminder.findMany({ where: { userId }, orderBy: [{ completed: "asc" }, { remindAt: "asc" }], take: 100, select: { id: true, title: true, description: true, remindAt: true, completed: true } }),
  ]);
  return { goals: goals.map((goal) => ({ id: goal.id, title: goal.title, description: goal.description, category: goal.category, startDate: dateKey(goal.startDate), deadline: dateKey(goal.deadline), progress: goal.progress, status: goal.status })), habits: habits.map((habit) => ({ id: habit.id, name: habit.name, polarity: habit.polarity, logs: habit.logs.map((log) => ({ dateKey: dateKey(log.dateKey), completed: log.completed })), ...streaks(habit.logs) })), reminders: reminders.map((reminder) => ({ id: reminder.id, title: reminder.title, description: reminder.description, remindAt: reminder.remindAt.toISOString(), completed: reminder.completed })) };
}

export async function createGoal(input: unknown) {
  const { userId } = await requireSession(); const data = goalInput.parse(input);
  await prisma.goal.create({ data: { userId, title: data.title, description: data.description, category: data.category, startDate: dateValue(data.startDate), deadline: dateValue(data.deadline), status: "NOT_STARTED" } });
}

export async function completeGoal(goalId: string) {
  const { userId } = await requireSession();
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.goal.updateMany({ where: { id: goalId, userId, status: { not: "COMPLETED" }, xpAwarded: false }, data: { status: "COMPLETED", progress: 100, remaining: 0, completionDate: dateValue(dateKey(new Date())), xpAwarded: true } });
    if (!updated.count) return;
    const claim = await transaction.rewardClaim.create({ data: { userId, rewardType: "goal", sourceId: goalId, xp: 250, coins: 0 } });
    await transaction.profile.upsert({ where: { userId }, update: { xp: { increment: claim.xp } }, create: { userId, xp: claim.xp, level: 1 } });
  });
}

export async function deleteGoal(goalId: string) {
  const { userId } = await requireSession(); const result = await prisma.goal.deleteMany({ where: { id: goalId, userId } }); if (!result.count) throw new Error("Goal not found.");
}

export async function createHabit(input: unknown) {
  const { userId } = await requireSession(); const data = habitInput.parse(input); await prisma.habit.create({ data: { userId, name: data.name, polarity: data.polarity } });
}

export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  const { userId } = await requireSession(); const day = z.string().date().parse(date); const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } }); if (!habit) throw new Error("Habit not found.");
  await prisma.habitLog.upsert({ where: { habitId_dateKey: { habitId, dateKey: dateValue(day) } }, update: { completed }, create: { userId, habitId, dateKey: dateValue(day), completed } });
}

export async function deleteHabit(habitId: string) {
  const { userId } = await requireSession(); const result = await prisma.habit.deleteMany({ where: { id: habitId, userId } }); if (!result.count) throw new Error("Habit not found.");
}

export async function createReminder(input: unknown) {
  const { userId } = await requireSession(); const data = reminderInput.parse(input); const remindAt = parseReminderDateTime(data.remindAt);
  await prisma.reminder.create({ data: { userId, title: data.title, description: data.description, remindAt } });
}

export async function toggleReminder(reminderId: string, completed: boolean) {
  const { userId } = await requireSession(); const result = await prisma.reminder.updateMany({ where: { id: reminderId, userId }, data: { completed } }); if (!result.count) throw new Error("Reminder not found.");
}

export async function deleteReminder(reminderId: string) {
  const { userId } = await requireSession(); const result = await prisma.reminder.deleteMany({ where: { id: reminderId, userId } }); if (!result.count) throw new Error("Reminder not found.");
}
