import { getAnalyticsDashboardData } from "@/actions/analytics.actions";
import { LifeJourneyDashboard } from "@/components/features/life-journey/life-journey-dashboard";

export const dynamic = "force-dynamic";

export default async function LifeJourneyPage() {
  return <LifeJourneyDashboard data={await getAnalyticsDashboardData()} />;
}
