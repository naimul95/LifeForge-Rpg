export interface ProfileDashboardData {
  profile: { name: string; email: string; bio: string; avatarUrl: string | null; level: number; xp: number; nextLevelXp: number; currentStreak: number; bestStreak: number; studyHours: number; completedTopics: number };
  achievements: Array<{ name: string; description: string; unlocked: boolean }>;
  records: Array<{ label: string; value: string }>;
}
