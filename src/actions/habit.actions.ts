"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { calculateHabitStreak } from "@/lib/habits/streak";
import type {
  HabitDashboardData,
  HabitDashboardItem,
  HabitLogStatus,
} from "@/types/habit-dashboard";

const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (value: Date) => value.toISOString().slice(0, 10);
const habitInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    polarity: z.enum(["good", "bad"]),
    frequency: z.enum(["daily", "weekly", "specific_days", "custom"]),
    selectedDays: z.array(z.number().int().min(0).max(6)).max(7),
    startDate: z.string().date(),
    endDate: z.string().date().nullable().optional(),
    reminder: z.string().trim().max(40).nullable().optional(),
    target: z.number().int().min(1).max(100),
    active: z.boolean().default(true),
  })
  .refine(
    (data) => !data.endDate || data.endDate >= data.startDate,
    "End date must be after the start date.",
  );
const statusInput = z.object({
  status: z.enum(["DONE", "NOT_DONE", "AVOIDED", "DID_IT", "SKIPPED"]),
});
const success = (polarity: "good" | "bad", status: HabitLogStatus) =>
  polarity === "good" ? status === "DONE" : status === "AVOIDED";
function range(days: number, end: Date) {
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(end);
    value.setUTCDate(value.getUTCDate() - (days - index - 1));
    return value;
  });
}
function stats(
  habit: {
    polarity: "good" | "bad";
    logs: Array<{ dateKey: Date; status: string }>;
  },
  days: number,
  end: Date,
) {
  const dates = range(days, end);
  const byDate = new Map(
    habit.logs.map((log) => [
      dateKey(log.dateKey),
      log.status as HabitLogStatus,
    ]),
  );
  const values = dates
    .map((date) => byDate.get(dateKey(date)))
    .filter(Boolean) as HabitLogStatus[];
  const successful = values.filter((status) =>
    success(habit.polarity, status),
  ).length;
  const skipped = values.filter((status) => status === "SKIPPED").length;
  return {
    successful,
    skipped,
    missed: values.length - successful - skipped,
    scheduled: values.length,
    completionRate: values.length
      ? Math.round((successful / values.length) * 100)
      : 0,
  };
}
export async function getHabitDashboardData(): Promise<HabitDashboardData> {
  const { userId } = await requireSession();
  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      logs: {
        where: { userId },
        orderBy: { dateKey: "desc" },
        select: { dateKey: true, status: true, completed: true },
      },
    },
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const items: HabitDashboardItem[] = habits.map((habit) => {
    const normalizedLogs = habit.logs.map((log) => ({
      date: dateKey(log.dateKey),
      status:
        log.status === "SKIPPED" && log.completed
          ? ("DONE" as const)
          : (log.status as HabitLogStatus),
    }));
    const calculated = calculateHabitStreak({
      polarity: habit.polarity,
      frequency: habit.frequency,
      selectedDays: habit.selectedDays,
      startDate: habit.startDate,
      endDate: habit.endDate,
    }, normalizedLogs.map((log) => ({ dateKey: dateValue(log.date), status: log.status, completed: log.status === "DONE" || log.status === "AVOIDED" })));
    const current = calculated;
    return {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      polarity: habit.polarity,
      frequency: habit.frequency,
      selectedDays: Array.isArray(habit.selectedDays)
        ? habit.selectedDays.filter(
            (day): day is number => typeof day === "number",
          )
        : [],
      startDate: dateKey(habit.startDate),
      endDate: habit.endDate ? dateKey(habit.endDate) : null,
      reminder: habit.reminder,
      target: habit.target,
      active: habit.active,
      logs: normalizedLogs,
      currentStreak: current.currentStreak,
      bestStreak: current.bestStreak,
      weekly: stats(
        {
          polarity: habit.polarity,
          logs: normalizedLogs.map((log) => ({
            dateKey: dateValue(log.date),
            status: log.status,
          })),
        },
        7,
        today,
      ),
      monthly: stats(
        {
          polarity: habit.polarity,
          logs: normalizedLogs.map((log) => ({
            dateKey: dateValue(log.date),
            status: log.status,
          })),
        },
        30,
        today,
      ),
    };
  });
  const weekly = items.map((item) => item.weekly);
  const previous = habits.map((habit) =>
    stats(
      {
        polarity: habit.polarity,
        logs: habit.logs.map((log) => ({
          dateKey: log.dateKey,
          status: log.status,
        })),
      },
      7,
      new Date(Date.now() - 7 * 86400000),
    ),
  );
  const successful = weekly.reduce((sum, item) => sum + item.successful, 0);
  const scheduled = weekly.reduce((sum, item) => sum + item.scheduled, 0);
  return {
    habits: items,
    analysis: {
      total: items.length,
      good: items.filter((item) => item.polarity === "good").length,
      bad: items.filter((item) => item.polarity === "bad").length,
      successful,
      missed: weekly.reduce((sum, item) => sum + item.missed, 0),
      skipped: weekly.reduce((sum, item) => sum + item.skipped, 0),
      completionRate: scheduled
        ? Math.round((successful / scheduled) * 100)
        : 0,
      currentStreak: Math.max(...items.map((item) => item.currentStreak), 0),
      bestStreak: Math.max(...items.map((item) => item.bestStreak), 0),
      previousRate:
        (previous.reduce((sum, item) => sum + item.successful, 0) /
          Math.max(
            previous.reduce((sum, item) => sum + item.scheduled, 0),
            1,
          )) *
        100,
      improvement: 0,
    },
  };
}

export async function createTrackedHabit(input: unknown) {
  const { userId } = await requireSession();
  const data = habitInput.parse(input);
  await prisma.habit.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      polarity: data.polarity,
      frequency: data.frequency,
      selectedDays: data.selectedDays,
      startDate: dateValue(data.startDate),
      endDate: data.endDate ? dateValue(data.endDate) : null,
      reminder: data.reminder ?? null,
      target: data.target,
      active: data.active,
    },
  });
}
export async function updateTrackedHabit(habitId: string, input: unknown) {
  const { userId } = await requireSession();
  const data = habitInput.parse(input);
  const result = await prisma.habit.updateMany({
    where: { id: habitId, userId },
    data: {
      name: data.name,
      description: data.description,
      polarity: data.polarity,
      frequency: data.frequency,
      selectedDays: data.selectedDays,
      startDate: dateValue(data.startDate),
      endDate: data.endDate ? dateValue(data.endDate) : null,
      reminder: data.reminder ?? null,
      target: data.target,
      active: data.active,
    },
  });
  if (!result.count) throw new Error("Habit not found.");
}
export async function setHabitStatus(
  habitId: string,
  date: string,
  input: unknown,
) {
  const { userId } = await requireSession();
  const cleanDate = z.string().date().parse(date);
  const data = statusInput.parse(input);
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { polarity: true },
  });
  if (!habit) throw new Error("Habit not found.");
  const successful = success(habit.polarity, data.status);
  await prisma.habitLog.upsert({
    where: { habitId_dateKey: { habitId, dateKey: dateValue(cleanDate) } },
    update: { status: data.status, completed: successful },
    create: {
      userId,
      habitId,
      dateKey: dateValue(cleanDate),
      status: data.status,
      completed: successful,
    },
  });
}
export async function deleteTrackedHabit(habitId: string) {
  const { userId } = await requireSession();
  const result = await prisma.habit.deleteMany({
    where: { id: habitId, userId },
  });
  if (!result.count) throw new Error("Habit not found.");
}
