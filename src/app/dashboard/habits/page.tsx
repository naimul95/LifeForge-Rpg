import { getHabitDashboardData } from "@/actions/habit.actions";
import { HabitDashboard } from "@/components/features/habits/habit-dashboard";

export default async function HabitsPage() {
  return <HabitDashboard initialData={await getHabitDashboardData()} />;
}
