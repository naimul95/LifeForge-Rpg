"use client";

import { Bell, ChevronDown, LoaderCircle, LogOut, Menu, Search, Settings2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { dismissReminder, getDueReminders } from "@/actions/planning.actions";

type SearchResult = { id: string; type: "Subject" | "Topic" | "Material" | "Note" | "Goal" | "Habit" | "Mission"; title: string; detail: string; destination: string };

interface HeaderProps {
  user: { displayName: string | null; email: string; avatarUrl: string | null };
  activeItem: string;
  onSelect: (item: string) => void;
  onMenuOpen: () => void;
}

export function Header({ user, activeItem, onSelect, onMenuOpen }: HeaderProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dueReminder, setDueReminder] = useState<{ id: string; title: string; description: string; remindAt: Date } | null>(null);
  const notifiedReminderIds = useRef<Set<string>>(new Set());
  const searchRequest = useRef(0);
  const searchTimer = useRef<number | null>(null);
  async function signOutUser() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  useEffect(() => () => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
  }, []);

  useEffect(() => {
    const storageKey = `lifeforge-notified-reminders:${user.email}`;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) notifiedReminderIds.current = new Set(JSON.parse(stored) as string[]);
    } catch { /* Browser storage may be unavailable. */ }

    const rememberNotification = (id: string) => {
      notifiedReminderIds.current.add(id);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...notifiedReminderIds.current]));
      } catch { /* Deduplication still works for this session. */ }
    };

    let active = true;
    const checkReminders = async () => {
      try {
        const reminders = await getDueReminders();
        const reminder = reminders.find((item) => !notifiedReminderIds.current.has(item.id));
        if (!active || !reminder) return;
        rememberNotification(reminder.id);
        setDueReminder(reminder);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(`LifeForge: ${reminder.title}`, { body: reminder.description || "Your reminder is due." });
      } catch { /* Reminder checks must not interrupt navigation. */ }
    };
    void checkReminders();
    const timer = window.setInterval(() => void checkReminders(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user.email]);

  function triggerSearch(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (searchTimer.current) window.clearTimeout(searchTimer.current);

    if (trimmedQuery.length < 1) {
      setResults([]);
      setSelectedIndex(-1);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequest.current;
    setSearchLoading(true);
    setSearchError(null);
    searchTimer.current = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
        .then((response) => { if (!response.ok) throw new Error("Search failed."); return response.json() as Promise<SearchResult[]>; })
        .then((nextResults) => { if (requestId === searchRequest.current) { setResults(nextResults); setSelectedIndex(-1); } })
        .catch(() => { if (requestId === searchRequest.current) { setResults([]); setSearchError("Search could not be completed."); } })
        .finally(() => { if (requestId === searchRequest.current) setSearchLoading(false); });
    }, 300);
  }

  function selectResult(result: SearchResult) {
    if (result.destination.startsWith("/")) {
      router.push(result.destination);
    } else {
      onSelect(result.destination);
    }
    setQuery("");
    setResults([]);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setQuery(""); return; }
    if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setSelectedIndex((index) => (index + 1) % results.length); }
    if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setSelectedIndex((index) => (index - 1 + results.length) % results.length); }
    if (event.key === "Enter" && selectedIndex >= 0) { event.preventDefault(); selectResult(results[selectedIndex]); }
  }

  return (
    <header className="app-header">
      <button type="button" aria-label="Open navigation menu" className="header-icon mobile-menu-button lg:hidden" onClick={onMenuOpen}><Menu size={20} /></button>
      <div className="mobile-brand lg:hidden"><div className="brand-mark"><Sparkles size={15} /></div><span>LIFEFORGE</span></div>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <Search size={16} className="absolute left-3 text-slate-500" />
        <input role="combobox" aria-label="Search LifeForge" placeholder="Search your command deck" className="search-input" value={query} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); triggerSearch(nextQuery); }} onKeyDown={handleSearchKeyDown} aria-controls="global-search-results" aria-expanded={Boolean(query)} />
        <span className="absolute right-3 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-600">⌘ K</span>
        {query && <div id="global-search-results" role="listbox" aria-label="Search results" className="search-popover">
          {searchLoading ? <div className="search-state"><LoaderCircle size={16} className="animate-spin text-cyan-300" /> Searching your archive...</div> : searchError ? <div className="search-state text-rose-300">{searchError}</div> : results.length === 0 ? <div className="search-state">No matching subjects, topics, materials, notes, goals, habits, or missions.</div> : results.map((result, index) => <button key={`${result.type}-${result.id}`} type="button" role="option" aria-selected={index === selectedIndex} className={`search-result ${index === selectedIndex ? "search-result-active" : ""}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectResult(result)}><span className="search-result-copy"><strong>{result.title}</strong><small>{result.detail}</small></span><span className="search-result-type">{result.type}</span></button>)}
        </div>}
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {dueReminder && <div className="reminder-alert" role="alert"><Bell size={15} className="text-amber-300" /><div className="min-w-0"><strong>{dueReminder.title}</strong><span>{dueReminder.description || "It's time to take action."}</span></div><button type="button" aria-label="Dismiss reminder" onClick={() => { void dismissReminder(dueReminder.id); setDueReminder(null); }}>Dismiss</button></div>}
        <button aria-label="Open settings" className="header-icon" onClick={() => onSelect("Settings")}><Settings2 size={18} /></button>
        <div className="relative">
          <button aria-label="Open notifications" className="header-icon" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <Bell size={18} /><span className="notification-dot" />
          </button>
          {notificationsOpen && <div className="popover right-0 top-12 w-64"><p className="eyebrow text-cyan-300">Signal center</p><p className="mt-3 text-sm text-slate-300">No new signals right now.</p><p className="mt-1 text-xs text-slate-500">Your next update will appear here.</p></div>}
        </div>
        <div className="relative">
          <button className="flex items-center gap-2" onClick={() => setProfileOpen(!profileOpen)}>
            {user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={31} height={31} unoptimized className="avatar" /> : <div className="avatar avatar-fallback">{(user.displayName ?? user.email ?? "L").charAt(0).toUpperCase()}</div>}
            <span className="hidden max-w-28 truncate text-sm text-slate-300 md:block">{user.displayName ?? "Player"}</span>
            <ChevronDown size={15} className="text-slate-500" />
          </button>
          {profileOpen && <div className="popover right-0 top-12 w-56"><p className="truncate text-sm font-medium text-white">{user.displayName ?? "Player"}</p><p className="mt-1 truncate text-xs text-slate-500">{user.email}</p><button className="popover-action mt-4" onClick={() => onSelect("Profile")}>View profile</button><button className="popover-action text-rose-300" onClick={() => signOutUser()}><LogOut size={14} /> Sign out</button></div>}
        </div>
      </div>
      {activeItem !== "Dashboard" && <span className="sr-only">Viewing {activeItem}</span>}
    </header>
  );
}
