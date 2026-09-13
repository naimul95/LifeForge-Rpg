import { getRpgDashboardData } from "@/actions/rpg.actions";
import { RpgDashboard } from "@/components/features/life-rpg/rpg-dashboard";

export const dynamic = "force-dynamic";

export default async function LifeRpgPage() {
  return <RpgDashboard initialData={await getRpgDashboardData()} />;
}
