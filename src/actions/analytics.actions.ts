"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { AnalyticsDashboardData } from "@/types/analytics-dashboard";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
function streak(logs: Array<{ dateKey: Date; completed: boolean }>) { const days = new Set(logs.filter((item) => item.completed).map((item) => dayKey(item.dateKey))); let best = 0; let run = 0; let previous = ""; for (const day of [...days].sort()) { const date = new Date(`${day}T00:00:00.000Z`); const prior = new Date(date); prior.setUTCDate(prior.getUTCDate() - 1); const priorKey = dayKey(prior); run = previous === priorKey ? run + 1 : 1; best = Math.max(best, run); previous = day; } return best; }

export async function getAnalyticsDashboardData(): Promise<AnalyticsDashboardData> {
  const { userId } = await requireSession();
  const today = startOfDay(new Date()); const weekStart = new Date(today); weekStart.setUTCDate(weekStart.getUTCDate() - 6); const monthStart = new Date(today); monthStart.setUTCDate(monthStart.getUTCDate() - 27);
  const [stats, claims, subjects, habits, achievements, roadmaps, sessions, goals, questCompletions, userAwards] = await Promise.all([
    prisma.studyDailyStat.findMany({ where: { userId, dateKey: { gte: monthStart } }, select: { dateKey: true, totalSeconds: true } }),
    prisma.rewardClaim.findMany({ where: { userId, createdAt: { gte: weekStart } }, select: { createdAt: true, xp: true } }),
    prisma.subject.findMany({ where: { userId }, orderBy: { studyMinutes: "desc" }, select: { name: true, studyMinutes: true, topics: { where: { userId }, orderBy: { completion: "desc" }, select: { name: true, completion: true } } } }),
    prisma.habit.findMany({ where: { userId }, select: { polarity: true, logs: { where: { userId }, select: { dateKey: true, status: true, completed: true } } } }),
    prisma.achievement.findMany({ orderBy: { name: "asc" }, select: { name: true, description: true } }),
    prisma.roadmap.findMany({ where: { userId }, orderBy: [{ targetDate: "asc" }, { updatedAt: "desc" }], take: 12, select: { title: true, progress: true, targetDate: true } }),
    prisma.studySession.findMany({ where: { userId }, orderBy: { durationSeconds: "desc" }, take: 1, select: { durationSeconds: true } }),
    prisma.goal.findMany({ where: { userId, status: "COMPLETED" }, orderBy: { completionDate: "desc" }, take: 5, select: { title: true, completionDate: true, updatedAt: true } }),
    prisma.questCompletion.findMany({ where: { userId }, orderBy: { completedAt: "desc" }, take: 5, select: { completedAt: true, quest: { select: { title: true } } } }),
    prisma.userAchievement.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" }, take: 5, select: { unlockedAt: true, achievement: { select: { name: true } } } }),
  ]);
  const studySecondsByDay = new Map(stats.map((item) => [dayKey(item.dateKey), item.totalSeconds]));
  const xpByDay = new Map<string, number>();
  for (const claim of claims) { const key = dayKey(claim.createdAt); xpByDay.set(key, (xpByDay.get(key) ?? 0) + claim.xp); }
  const habitCompletionsByDay = new Map<string, number>();
  for (const habit of habits) for (const log of habit.logs) { const key = dayKey(log.dateKey); const completed = habit.polarity === "good" ? log.status === "DONE" || log.completed : log.status === "AVOIDED"; if (completed) habitCompletionsByDay.set(key, (habitCompletionsByDay.get(key) ?? 0) + 1); }
  const weekly = Array.from({ length: 7 }, (_, index) => { const date = new Date(weekStart); date.setUTCDate(date.getUTCDate() + index); const key = dayKey(date); return { label: date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }), studyMinutes: (studySecondsByDay.get(key) ?? 0) / 60, xp: xpByDay.get(key) ?? 0, habitCompletions: habitCompletionsByDay.get(key) ?? 0 }; });
  const allLogs = habits.flatMap((habit) => habit.logs); const bestStreak = Math.max(...habits.map((habit) => streak(habit.logs)), 0); const totalStudy = stats.reduce((sum, item) => sum + item.totalSeconds, 0);
  const heatmap = Array.from({ length: 28 }, (_, index) => { const date = new Date(monthStart); date.setUTCDate(date.getUTCDate() + index); const key = dayKey(date); return { date: key, minutes: (studySecondsByDay.get(key) ?? 0) / 60 }; });
  const unlockedNames = new Set(userAwards.map((item) => item.achievement.name));
  return { weekly, heatmap, subjects: subjects.map((subject) => ({ name: subject.name, progress: subject.topics.length ? subject.topics.reduce((sum, topic) => sum + topic.completion, 0) / subject.topics.length : 0, studyMinutes: subject.studyMinutes })), topics: subjects.flatMap((subject) => subject.topics.map((topic) => ({ name: topic.name, progress: topic.completion, subject: subject.name }))).slice(0, 12), achievements: achievements.map((achievement) => ({ name: achievement.name, description: achievement.description, unlocked: unlockedNames.has(achievement.name) })), records: [{ label: "Best habit streak", value: `${bestStreak} days` }, { label: "Longest study session", value: `${Math.round((sessions[0]?.durationSeconds ?? 0) / 60)} min` }, { label: "Study this week", value: `${Math.round(totalStudy / 60)} min` }, { label: "Habit check-ins", value: `${allLogs.filter((log) => log.completed).length}` }], roadmap: roadmaps.map((item) => ({ title: item.title, progress: item.progress, targetDate: item.targetDate?.toISOString() ?? null })), journey: [...goals.map((goal) => ({ title: goal.title, detail: "Goal completed", date: goal.completionDate?.toISOString() ?? goal.updatedAt.toISOString() })), ...questCompletions.map((item) => ({ title: item.quest.title, detail: "Mission completed", date: item.completedAt.toISOString() })), ...userAwards.map((item) => ({ title: item.achievement.name, detail: "Achievement unlocked", date: item.unlockedAt.toISOString() }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10) };
}
