export const appThemes = ["deep_space", "cyber_neon", "midnight_galaxy", "aurora", "ocean", "emerald_matrix", "synthwave", "crimson_core", "minimal_frost", "solar_flare"] as const;
export type AppTheme = typeof appThemes[number];
export type ProfileVisibility = "private" | "shared";

export interface SettingsData {
  name: string;
  email: string;
  theme: AppTheme;
  weeklySummary: boolean;
  browserNotifications: boolean;
  studyGoalMinutes: number;
  defaultTimerSeconds: number;
  timerAutoComplete: boolean;
  notificationsEnabled: boolean;
  emailReminders: boolean;
  profileVisibility: ProfileVisibility;
  shareLinksEnabled: boolean;
  analyticsOptIn: boolean;
}
