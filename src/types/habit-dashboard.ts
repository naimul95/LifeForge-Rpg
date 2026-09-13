export type HabitPolarity = "good" | "bad";
export type HabitFrequency = "daily" | "weekly" | "specific_days" | "custom";
export type HabitLogStatus = "DONE" | "NOT_DONE" | "AVOIDED" | "DID_IT" | "SKIPPED";

export interface HabitDashboardItem {
  id: string;
  name: string;
  description: string;
  polarity: HabitPolarity;
  frequency: HabitFrequency;
  selectedDays: number[];
  startDate: string;
  endDate: string | null;
  reminder: string | null;
  target: number;
  active: boolean;
  logs: Array<{ date: string; status: HabitLogStatus }>;
  currentStreak: number;
  bestStreak: number;
  weekly: { successful: number; missed: number; skipped: number; scheduled: number; completionRate: number };
  monthly: { successful: number; missed: number; skipped: number; scheduled: number; completionRate: number };
}

export interface HabitDashboardData {
  habits: HabitDashboardItem[];
  analysis: { total: number; good: number; bad: number; successful: number; missed: number; skipped: number; completionRate: number; currentStreak: number; bestStreak: number; previousRate: number; improvement: number };
}