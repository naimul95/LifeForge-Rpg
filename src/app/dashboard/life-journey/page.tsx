import { getAnalyticsDashboardData } from "@/actions/analytics.actions";
import { LifeJourneyDashboard } from "@/components/features/life-journey/life-journey-dashboard";

export default async function LifeJourneyPage() {
  return <LifeJourneyDashboard data={await getAnalyticsDashboardData()} />;
}
