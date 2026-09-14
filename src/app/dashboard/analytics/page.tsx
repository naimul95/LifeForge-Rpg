import { getAnalyticsDashboardData } from "@/actions/analytics.actions";
import { AnalyticsReportDashboard } from "@/components/features/analytics/report-dashboard";

export default async function AnalyticsPage() {
  return <AnalyticsReportDashboard data={await getAnalyticsDashboardData()} />;
}
