import { getSettings } from "@/actions/settings.actions";
import { SettingsDashboard } from "@/components/features/settings/settings-dashboard";


export default async function SettingsPage() {
  return <SettingsDashboard initialSettings={await getSettings()} />;
}
