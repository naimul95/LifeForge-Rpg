"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { appThemes, type SettingsData } from "@/types/settings-dashboard";

const settingsInput = z.object({
  theme: z.enum(appThemes),
  weeklySummary: z.boolean(),
  browserNotifications: z.boolean(),
  studyGoalMinutes: z.number().int().min(1).max(1440),
  defaultTimerSeconds: z.number().int().min(60).max(86400),
  timerAutoComplete: z.boolean(),
  notificationsEnabled: z.boolean(),
  emailReminders: z.boolean(),
  profileVisibility: z.enum(["private", "shared"]),
  shareLinksEnabled: z.boolean(),
  analyticsOptIn: z.boolean(),
});

function settingsDto(user: { displayName: string | null; email: string }, settings: Omit<SettingsData, "name" | "email">): SettingsData {
  return { name: user.displayName ?? "Player", email: user.email, ...settings };
}

export async function getSettings(): Promise<SettingsData> {
  const { userId } = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true, email: true } });
  const settings = await prisma.settings.upsert({ where: { userId }, update: {}, create: { userId } });
  return settingsDto(user, { theme: settings.theme, weeklySummary: settings.weeklySummary, browserNotifications: settings.browserNotifications, studyGoalMinutes: settings.studyGoalMinutes, defaultTimerSeconds: settings.defaultTimerSeconds, timerAutoComplete: settings.timerAutoComplete, notificationsEnabled: settings.notificationsEnabled, emailReminders: settings.emailReminders, profileVisibility: settings.profileVisibility, shareLinksEnabled: settings.shareLinksEnabled, analyticsOptIn: settings.analyticsOptIn });
}

export async function updateSettings(input: unknown) {
  const { userId } = await requireSession();
  const data = settingsInput.parse(input);
  await prisma.settings.upsert({ where: { userId }, update: data, create: { userId, ...data } });
}
