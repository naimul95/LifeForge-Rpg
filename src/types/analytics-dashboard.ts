export interface AnalyticsDashboardData {
  userName: string | null;
  weekly: Array<{ label: string; studyMinutes: number; xp: number; habitCompletions: number }>;
  heatmap: Array<{ date: string; minutes: number }>;
  subjects: Array<{ name: string; progress: number; studyMinutes: number }>;
  topics: Array<{ name: string; progress: number; subject: string }>;
  achievements: Array<{ name: string; description: string; unlocked: boolean }>;
  records: Array<{ label: string; value: string }>;
  roadmap: Array<{ title: string; progress: number; targetDate: string | null }>;
  journey: Array<{ title: string; detail: string; date: string }>;
}
