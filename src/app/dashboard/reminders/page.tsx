import { getPlanningData } from "@/actions/planning.actions";
import { PlanningDashboard } from "@/components/features/planning/planning-dashboard";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  return <PlanningDashboard initialData={await getPlanningData()} todayValue={new Date().toISOString().slice(0, 10)} />;
}
