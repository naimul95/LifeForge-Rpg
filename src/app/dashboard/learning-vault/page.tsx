import { getVaultData } from "@/actions/vault.actions";
import { LearningVaultDashboard } from "@/components/features/learning-vault/learning-vault-dashboard";

export default async function LearningVaultPage() {
  return <LearningVaultDashboard initialSubjects={await getVaultData()} />;
}
