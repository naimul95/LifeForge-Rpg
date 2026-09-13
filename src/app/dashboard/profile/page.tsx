import { getProfileDashboardData } from "@/actions/profile.actions";
import { ProfileDashboard } from "@/components/features/profile/profile-dashboard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  return <ProfileDashboard initialData={await getProfileDashboardData()} />;
}
