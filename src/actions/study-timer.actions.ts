"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { StudyTimerData, TimerStateDto } from "@/types/study-timer";

const timerInput = z.object({
  subjectId: z.string().cuid(),
  topicId: z.string().cuid().optional(),
  presetSeconds: z.number().int().min(60).max(86_400),
  customSeconds: z.number().int().min(60).max(86_400).nullable().optional(),
});
const dateOnly = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
function weekStart(date: Date) { const start = dateOnly(date); const day = start.getUTCDay() || 7; start.setUTCDate(start.getUTCDate() - day + 1); return start; }
function stateDto(state: { status: string; presetSeconds: number; customSeconds: number | null; elapsedSeconds: number; accumulatedSeconds: number; subjectId: string | null; topicId: string | null; startedAt: Date | null; lastResumedAt: Date | null; completionKey: string }): TimerStateDto { return { status: state.status as TimerStateDto["status"], presetSeconds: state.presetSeconds, customSeconds: state.customSeconds, elapsedSeconds: state.elapsedSeconds, accumulatedSeconds: state.accumulatedSeconds, subjectId: state.subjectId, topicId: state.topicId, startedAt: state.startedAt?.toISOString() ?? null, lastResumedAt: state.lastResumedAt?.toISOString() ?? null, completionKey: state.completionKey }; }
function elapsedSince(lastResumedAt: Date | null, now: Date) { return lastResumedAt ? Math.max(0, Math.floor((now.getTime() - lastResumedAt.getTime()) / 1000)) : 0; }

export async function getStudyTimerData(): Promise<StudyTimerData> {
  const { userId } = await requireSession();
  const [state, subjects] = await Promise.all([
    prisma.studyTimerState.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true, topics: { where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true } } } }),
  ]);
  return { state: stateDto(state), subjects };
}

export async function startStudyTimer(input: unknown) {
  const { userId } = await requireSession();
  const data = timerInput.parse(input);
  const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, userId }, select: { id: true } });
  if (!subject) throw new Error("Subject not found.");
  if (data.topicId && !(await prisma.topic.findFirst({ where: { id: data.topicId, subjectId: data.subjectId, userId }, select: { id: true } }))) throw new Error("Topic not found.");
  const state = await prisma.studyTimerState.findUniqueOrThrow({ where: { userId } });
  if (state.status === "running") return stateDto(state);
  const next = await prisma.studyTimerState.update({ where: { userId }, data: { subjectId: data.subjectId, topicId: data.topicId ?? null, presetSeconds: data.presetSeconds, customSeconds: data.customSeconds ?? null, elapsedSeconds: 0, accumulatedSeconds: 0, status: "running", startedAt: new Date(), lastResumedAt: new Date(), pausedAt: null, completionKey: crypto.randomUUID() } });
  return stateDto(next);
}

export async function pauseStudyTimer() {
  const { userId } = await requireSession();
  const state = await prisma.studyTimerState.findUniqueOrThrow({ where: { userId } });
  if (state.status !== "running") return stateDto(state);
  const now = new Date();
  const elapsed = state.accumulatedSeconds + elapsedSince(state.lastResumedAt, now);
  const next = await prisma.studyTimerState.update({ where: { userId }, data: { status: "paused", elapsedSeconds: elapsed, accumulatedSeconds: elapsed, lastResumedAt: null, pausedAt: now } });
  return stateDto(next);
}

export async function resumeStudyTimer() {
  const { userId } = await requireSession();
  const state = await prisma.studyTimerState.findUniqueOrThrow({ where: { userId } });
  if (state.status !== "paused") return stateDto(state);
  const next = await prisma.studyTimerState.update({ where: { userId }, data: { status: "running", lastResumedAt: new Date(), pausedAt: null } });
  return stateDto(next);
}

export async function stopStudyTimer() {
  const { userId } = await requireSession();
  const next = await prisma.studyTimerState.update({ where: { userId }, data: { status: "idle", elapsedSeconds: 0, accumulatedSeconds: 0, subjectId: null, topicId: null, startedAt: null, lastResumedAt: null, pausedAt: null, completionKey: crypto.randomUUID() } });
  return stateDto(next);
}

export async function completeStudyTimer() {
  const { userId } = await requireSession();
  try {
    return await prisma.$transaction(async (transaction) => {
      const state = await transaction.studyTimerState.findUniqueOrThrow({ where: { userId } });
      if (state.status === "completed") return { completed: false, durationSeconds: state.elapsedSeconds, xpAwarded: 0 };
      if (!state.subjectId || !state.startedAt) throw new Error("Choose a subject and start the timer first.");
      const endedAt = new Date();
      const seconds = state.status === "running" ? state.accumulatedSeconds + elapsedSince(state.lastResumedAt, endedAt) : state.accumulatedSeconds;
      if (seconds < 1) throw new Error("Complete at least one second of study.");
      const subject = await transaction.subject.findFirst({ where: { id: state.subjectId, userId } });
      if (!subject) throw new Error("Subject not found.");
      const topic = state.topicId ? await transaction.topic.findFirst({ where: { id: state.topicId, subjectId: subject.id, userId } }) : null;
      const xp = Math.min(500, Math.max(1, Math.floor(seconds / 60 / 25) * 10));
      await transaction.studySession.create({ data: { userId, subjectId: subject.id, topicId: topic?.id ?? null, subjectName: subject.name, topicName: topic?.name ?? null, durationSeconds: seconds, startedAt: state.startedAt, endedAt, completionKey: state.completionKey } });
      await transaction.subject.update({ where: { id: subject.id }, data: { studyMinutes: { increment: seconds / 60 } } });
      if (topic) await transaction.topic.update({ where: { id: topic.id }, data: { studyMinutes: { increment: seconds / 60 } } });
      const day = dateOnly(endedAt);
      await transaction.studyDailyStat.upsert({ where: { userId_dateKey: { userId, dateKey: day } }, update: { totalSeconds: { increment: seconds }, sessionCount: { increment: 1 } }, create: { userId, dateKey: day, totalSeconds: seconds, sessionCount: 1 } });
      const week = weekStart(endedAt);
      await transaction.studyWeeklyStat.upsert({ where: { userId_weekKey: { userId, weekKey: week } }, update: { totalSeconds: { increment: seconds }, sessionCount: { increment: 1 } }, create: { userId, weekKey: week, totalSeconds: seconds, sessionCount: 1 } });
      const profile = await transaction.profile.upsert({ where: { userId }, update: { xp: { increment: xp } }, create: { userId, xp, level: 1 } });
      const level = Math.floor(Math.sqrt(Math.max(0, profile.xp) / 100)) + 1;
      await transaction.profile.update({ where: { userId }, data: { level } });
      await transaction.studyTimerState.update({ where: { userId }, data: { status: "completed", elapsedSeconds: seconds, accumulatedSeconds: seconds, lastResumedAt: null, pausedAt: endedAt } });
      return { completed: true, durationSeconds: seconds, xpAwarded: xp };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { completed: false, durationSeconds: 0, xpAwarded: 0 };
    throw error;
  }
}
