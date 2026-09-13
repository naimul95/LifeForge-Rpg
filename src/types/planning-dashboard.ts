export type PlanningGoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type PlanningHabitPolarity = "good" | "bad";

export interface GoalDto {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  deadline: string;
  progress: number;
  status: PlanningGoalStatus;
}

export interface HabitLogDto {
  dateKey: string;
  completed: boolean;
}

export interface HabitDto {
  id: string;
  name: string;
  polarity: PlanningHabitPolarity;
  logs: HabitLogDto[];
  currentStreak: number;
  bestStreak: number;
}

export interface ReminderDto {
  id: string;
  title: string;
  description: string;
  remindAt: string;
  completed: boolean;
}

export interface PlanningData {
  goals: GoalDto[];
  habits: HabitDto[];
  reminders: ReminderDto[];
}
