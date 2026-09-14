import { getPlanningData } from "@/actions/planning.actions";
import { PlanningDashboard } from "@/components/features/planning/planning-dashboard";

export default async function GoalsPage() {
  return <PlanningDashboard mode="goals" initialData={await getPlanningData(false)} todayValue={new Date().toISOString().slice(0, 10)} />;
}
