import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell user={await requireAuthenticatedUser()}>{children}</DashboardShell>;
}