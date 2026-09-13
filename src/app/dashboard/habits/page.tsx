import { getHabitDashboardData } from "@/actions/habit.actions";
import { HabitDashboard } from "@/components/features/habits/habit-dashboard";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  return <HabitDashboard initialData={await getHabitDashboardData()} />;
}
