"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { RpgDashboardData } from "@/types/rpg-dashboard";

const questInput = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).default(""), period: z.enum(["daily", "weekly"]), difficulty: z.enum(["easy", "medium", "hard", "epic"]) });
const XP_REWARDS = { easy: 50, medium: 100, hard: 200, epic: 500 } as const;
const ACHIEVEMENTS = [
  { name: "First 100 XP", description: "Earn 100 XP.", threshold: 100 },
  { name: "Level 3", description: "Reach level 3.", threshold: 400 },
  { name: "Level 5", description: "Reach level 5.", threshold: 1600 },
  { name: "Level 10", description: "Reach level 10.", threshold: 8100 },
  { name: "Level 20", description: "Reach level 20.", threshold: 36100 },
  { name: "Momentum Builder", description: "Earn 5,000 XP.", threshold: 5000 },
  { name: "Life Architect", description: "Earn 25,000 XP.", threshold: 25000 },
];
const levelForXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

async function ensureAchievements() {
  await prisma.$transaction(ACHIEVEMENTS.map((item) => prisma.achievement.upsert({ where: { name: item.name }, update: {}, create: { name: item.name, description: item.description, kind: "achievement" } })));
}
async function unlockAchievements(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], userId: string, xp: number) {
  const definitions = await transaction.achievement.findMany({ where: { name: { in: ACHIEVEMENTS.filter((item) => xp >= item.threshold).map((item) => item.name) } } });
  await transaction.userAchievement.createMany({ data: definitions.map((achievement) => ({ userId, achievementId: achievement.id })), skipDuplicates: true });
}

export async function getRpgDashboardData(): Promise<RpgDashboardData> {
  const { userId } = await requireSession();
  if ((await prisma.achievement.count()) === 0) await ensureAchievements();
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const [profile, quests, achievements, dailyChallenge] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }).then((current) => current ?? prisma.profile.create({ data: { userId } })),
    prisma.quest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, description: true, difficulty: true, period: true, completed: true, xpReward: true, coinReward: true } }),
    prisma.achievement.findMany({ orderBy: { name: "asc" }, include: { userAwards: { where: { userId }, select: { id: true } } } }),
    prisma.dailyChallenge.findUnique({ where: { userId_challengeDate: { userId, challengeDate: today } } }).then((current) => current ?? prisma.dailyChallenge.create({ data: { userId, challengeDate: today, title: "Daily focus", description: "Complete one meaningful action today.", xpReward: 50 } })),
  ]);
  return { profile: { xp: profile.xp, level: profile.level, nextLevelXp: levelForXp(profile.xp) ** 2 * 100 }, quests: quests.map((quest) => ({ id: quest.id, title: quest.title, description: quest.description, difficulty: quest.difficulty, period: quest.period, completed: quest.completed, xpReward: quest.xpReward, coinReward: quest.coinReward })), achievements: achievements.map((achievement) => ({ id: achievement.id, name: achievement.name, description: achievement.description, unlocked: achievement.userAwards.length > 0 })), dailyChallenge: { id: dailyChallenge.id, title: dailyChallenge.title, description: dailyChallenge.description, completed: Boolean(dailyChallenge.completedAt), xpReward: dailyChallenge.xpReward } };
}

export async function createQuest(input: unknown) {
  const { userId } = await requireSession(); const data = questInput.parse(input); await prisma.quest.create({ data: { userId, title: data.title, description: data.description, period: data.period, difficulty: data.difficulty, xpReward: XP_REWARDS[data.difficulty], coinReward: 0 } });
}

async function applyReward(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], userId: string, rewardType: string, sourceId: string, xp: number) {
  await transaction.rewardClaim.create({ data: { userId, rewardType, sourceId, xp, coins: 0 } });
  const profile = await transaction.profile.upsert({ where: { userId }, update: { xp: { increment: xp } }, create: { userId, xp, level: 1 } });
  const nextXp = profile.xp; await transaction.profile.update({ where: { userId }, data: { level: levelForXp(nextXp) } });
  await unlockAchievements(transaction, userId, nextXp);
}

export async function completeQuest(questId: string) {
  const { userId } = await requireSession();
  try { await prisma.$transaction(async (transaction) => { const quest = await transaction.quest.findFirst({ where: { id: questId, userId } }); if (!quest || quest.completed) return; await transaction.quest.updateMany({ where: { id: questId, userId, completed: false }, data: { completed: true } }); await transaction.questCompletion.create({ data: { userId, questId } }); await applyReward(transaction, userId, "quest", quest.id, quest.xpReward); }); } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error; }
}

export async function deleteQuest(questId: string) { const { userId } = await requireSession(); const result = await prisma.quest.deleteMany({ where: { id: questId, userId } }); if (!result.count) throw new Error("Quest not found."); }

export async function completeDailyChallenge(challengeId: string) {
  const { userId } = await requireSession();
  try { await prisma.$transaction(async (transaction) => { const challenge = await transaction.dailyChallenge.findFirst({ where: { id: challengeId, userId } }); if (!challenge || challenge.completedAt) return; await transaction.dailyChallenge.updateMany({ where: { id: challengeId, userId, completedAt: null }, data: { completedAt: new Date() } }); await applyReward(transaction, userId, "daily_challenge", challenge.id, challenge.xpReward); }); } catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error; }
}
