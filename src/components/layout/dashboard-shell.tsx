"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";
import { Sidebar } from "@/components/layout/sidebar";

const FeatureLoading = () => <div className="loading-screen min-h-72"><span>Loading module...</span></div>;
const MindRefreshScreen = dynamic(() => import("@/components/features/mind-refresh/mind-refresh-screen").then((module) => module.MindRefreshScreen), { loading: FeatureLoading });
const pathLabels: Record<string, string> = { "/dashboard": "Dashboard", "/dashboard/mind-refresh": "Mind Refresh", "/dashboard/life-rpg": "Life Engine", "/dashboard/learning-vault": "Learning Vault", "/dashboard/study-timer": "Study Timer", "/dashboard/goals": "Goals", "/dashboard/habits": "Habits", "/dashboard/analytics": "Analytics", "/dashboard/life-journey": "Life Journey", "/dashboard/profile": "Profile", "/dashboard/settings": "Settings", "/dashboard/reminders": "Reminders" };
const destinations: Record<string, string> = Object.fromEntries(Object.entries(pathLabels).map(([path, label]) => [label, path]));

export function DashboardShell({ user, children }: { user: { displayName: string | null; email: string; avatarUrl: string | null }; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const activeItem = pathLabels[pathname ?? ""] ?? "Dashboard";
  function select(item: string) { const destination = destinations[item]; if (destination) router.push(destination); }
  function selectMobile(item: string) { setMobileDrawerOpen(false); select(item); }
  return <div className="app-frame"><Sidebar activeItem={activeItem} onSelect={select} /><div className="main-column"><Header user={user} activeItem={activeItem} onSelect={select} onMenuOpen={() => setMobileDrawerOpen(true)} />{pathname === "/dashboard/mind-refresh" ? <MindRefreshScreen /> : children}</div><MobileSidebarDrawer activeItem={activeItem} open={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} onSelect={selectMobile} /></div>;
}