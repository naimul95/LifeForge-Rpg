export interface RpgDashboardData {
  profile: { xp: number; level: number; nextLevelXp: number };
  quests: Array<{ id: string; title: string; description: string; difficulty: "easy" | "medium" | "hard" | "epic"; period: "daily" | "weekly"; completed: boolean; xpReward: number; coinReward: number }>;
  achievements: Array<{ id: string; name: string; description: string; unlocked: boolean }>;
  dailyChallenge: { id: string; title: string; description: string; completed: boolean; xpReward: number };
}
