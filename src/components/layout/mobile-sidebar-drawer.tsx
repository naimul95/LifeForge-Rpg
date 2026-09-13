"use client";

import { Sparkles, X } from "lucide-react";

import { navigationGroups } from "@/components/layout/sidebar";

interface MobileSidebarDrawerProps {
  activeItem: string;
  open: boolean;
  onClose: () => void;
  onSelect: (item: string) => void;
}

export function MobileSidebarDrawer({ activeItem, open, onClose, onSelect }: MobileSidebarDrawerProps) {
  if (!open) return null;

  return (
    <div className="mobile-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="mobile-drawer" aria-label="Mobile navigation" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-drawer-brand">
          <div className="brand-mark"><Sparkles size={16} /></div>
          <div>
            <p className="font-semibold tracking-[0.08em] text-white">LIFEFORGE</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">RPG / personal OS</p>
          </div>
          <button type="button" aria-label="Close navigation menu" className="icon-button ml-auto" onClick={onClose}><X size={18} /></button>
        </div>
        <nav className="mobile-drawer-nav">
          {navigationGroups.map((group) => <div key={group.label} className="mobile-drawer-group"><p className="eyebrow px-2">{group.label}</p>{group.items.map(({ label, icon: Icon }) => { const isActive = activeItem === label; return <button type="button" key={label} aria-current={isActive ? "page" : undefined} className={`mobile-drawer-item ${isActive ? "mobile-drawer-item-active" : ""}`} onClick={() => onSelect(label)}><Icon size={18} strokeWidth={isActive ? 2 : 1.7} /><span>{label}</span>{isActive && <span className="mobile-drawer-pip" />}</button>; })}</div>)}
        </nav>
      </aside>
    </div>
  );
}
