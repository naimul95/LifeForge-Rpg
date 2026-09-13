"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CircleUserRound,
  Goal,
  LayoutDashboard,
  Brain,
  Settings,
  Sparkles,
  Timer,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Mind Refresh", icon: Brain },
  { label: "Life Engine", icon: Zap },
  { label: "Learning Vault", icon: BookOpen },
  { label: "Study Timer", icon: Timer },
  { label: "Goals", icon: Goal },
  { label: "Habits", icon: Target },
  { label: "Analytics", icon: BarChart3 },
  { label: "Life Journey", icon: CalendarDays },
  { label: "Reminders", icon: Bell },
  { label: "Profile", icon: CircleUserRound },
  { label: "Settings", icon: Settings },
] as const;

export const navigationGroups = [
  { label: "Command deck", items: navigationItems.slice(0, 5) },
  { label: "Life", items: navigationItems.slice(5, 9) },
  { label: "Progress", items: navigationItems.slice(9, 10) },
  { label: "Account", items: navigationItems.slice(10) },
] as const;

interface SidebarProps {
  activeItem: string;
  onSelect: (item: string) => void;
}

export function Sidebar({ activeItem, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar hidden lg:flex">
      <div className="flex items-center gap-3 px-4 pb-10 pt-2">
        <div className="brand-mark"><Sparkles size={18} /></div>
        <div>
          <p className="font-semibold tracking-[0.08em] text-white">LIFEFORGE</p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">RPG / personal OS</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5">
        {navigationGroups.map((group) => <div key={group.label}><div className="px-4 pb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-600">{group.label}</div><div className="space-y-1">{group.items.map(({ label, icon: Icon }) => {
          const isActive = activeItem === label;
          return <button key={label} className={`nav-item ${isActive ? "nav-item-active" : ""}`} onClick={() => onSelect(label)}><Icon size={17} strokeWidth={isActive ? 2 : 1.7} /><span>{label}</span>{isActive && <motion.span layoutId="active-nav" className="nav-pip" />}</button>;
        })}</div></div>)}
      </nav>
      <div className="mt-8 border-t border-white/[0.07] pt-5">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-3 text-xs text-slate-400">
          <Trophy size={15} className="text-amber-300" />
          <span>Forge your momentum</span>
        </div>
      </div>
    </aside>
  );
}
