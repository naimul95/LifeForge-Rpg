import { getRpgDashboardData } from "@/actions/rpg.actions";
import { RpgDashboard } from "@/components/features/life-rpg/rpg-dashboard";

export default async function LifeRpgPage() {
  return <RpgDashboard initialData={await getRpgDashboardData()} />;
}
