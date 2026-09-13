"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { ProfileDashboardData } from "@/types/profile-dashboard";

const profileInput = z.object({ name: z.string().trim().min(1).max(120), bio: z.string().trim().max(500) });
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
function bestStreak(logs: Array<{ dateKey: Date; completed: boolean }>) { const days = new Set(logs.filter((item) => item.completed).map((item) => dayKey(item.dateKey))); let best = 0; let run = 0; let previous = ""; for (const day of [...days].sort()) { const current = new Date(`${day}T00:00:00.000Z`); const prior = new Date(current); prior.setUTCDate(prior.getUTCDate() - 1); run = previous === dayKey(prior) ? run + 1 : 1; best = Math.max(best, run); previous = day; } return best; }
function currentStreak(logs: Array<{ dateKey: Date; completed: boolean }>) { const days = new Set(logs.filter((item) => item.completed).map((item) => dayKey(item.dateKey))); const cursor = new Date(); cursor.setUTCHours(0, 0, 0, 0); let count = 0; while (days.has(dayKey(cursor))) { count += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); } return count; }

export async function getProfileDashboardData(): Promise<ProfileDashboardData> {
  const { userId } = await requireSession();
  const [user, profile, habits, topics, sessions, achievements, awards, goals, quests] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true, email: true, profile: { select: { username: true, bio: true, avatarUrl: true, level: true, xp: true, coins: true } } } }),
    prisma.profile.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.habit.findMany({ where: { userId }, include: { logs: { where: { userId } } } }),
    prisma.topic.findMany({ where: { userId }, select: { completion: true } }),
    prisma.studySession.findMany({ where: { userId }, orderBy: { durationSeconds: "desc" }, take: 1 }),
    prisma.achievement.findMany({ orderBy: { name: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: { select: { name: true } } } }),
    prisma.goal.count({ where: { userId, status: "COMPLETED" } }),
    prisma.questCompletion.count({ where: { userId } }),
  ]);
  const totalStudySeconds = await prisma.studySession.aggregate({ where: { userId }, _sum: { durationSeconds: true } });
  const unlocked = new Set(awards.map((item) => item.achievement.name)); const current = Math.max(...habits.map((habit) => currentStreak(habit.logs)), 0); const best = Math.max(...habits.map((habit) => bestStreak(habit.logs)), 0); const xp = profile.xp; const nextLevelXp = (profile.level ** 2) * 100;
  return { profile: { name: user.profile?.username || user.displayName || "Player", email: user.email, bio: user.profile?.bio ?? "", avatarUrl: user.profile?.avatarUrl ?? null, level: profile.level, xp, coins: profile.coins, nextLevelXp, currentStreak: current, studyHours: (totalStudySeconds._sum.durationSeconds ?? 0) / 3600, completedTopics: topics.filter((topic) => topic.completion >= 100).length }, achievements: achievements.map((item) => ({ name: item.name, description: item.description, unlocked: unlocked.has(item.name) })), records: [{ label: "Best habit streak", value: `${best} days` }, { label: "Longest study session", value: `${Math.round((sessions[0]?.durationSeconds ?? 0) / 60)} min` }, { label: "Completed goals", value: `${goals}` }, { label: "Completed missions", value: `${quests}` }] };
}

export async function updateProfile(input: unknown) {
  const { userId } = await requireSession(); const data = profileInput.parse(input);
  await prisma.$transaction(async (transaction) => { await transaction.user.update({ where: { id: userId }, data: { displayName: data.name } }); await transaction.profile.upsert({ where: { userId }, update: { username: data.name, bio: data.bio }, create: { userId, username: data.name, bio: data.bio } }); });
}

export async function updateProfileAvatarForUser(userId: string, input: { publicId: string; secureUrl: string }) {
  const data = z.object({ publicId: z.string().min(1).max(255), secureUrl: z.string().url() }).parse(input);
  const previous = await prisma.profile.upsert({ where: { userId }, update: { avatarUrl: data.secureUrl, avatarPublicId: data.publicId }, create: { userId, avatarUrl: data.secureUrl, avatarPublicId: data.publicId } });
  return previous.avatarPublicId;
}

export async function updateProfileAvatar(input: { publicId: string; secureUrl: string }) {
  const { userId } = await requireSession();
  return updateProfileAvatarForUser(userId, input);
}
