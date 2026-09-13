"use client";

import { BookOpen, CalendarDays, Sparkles, Trophy } from "lucide-react";

import type { AnalyticsDashboardData } from "@/types/analytics-dashboard";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function LifeJourneyDashboard({ data }: { data: AnalyticsDashboardData }) {
  const journey = data.journey.length ? data.journey : [{ title: "Start your first meaningful habit", detail: "Your journey is waiting for its first milestone.", date: new Date().toISOString() }];

  return (
    <main className="mx-auto max-w-375 px-5 pb-12 pt-7 sm:px-8 lg:px-10">
      <div className="mb-7">
        <p className="eyebrow text-cyan-300">Where momentum becomes a story</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Life Journey</h1>
        <p className="mt-2 text-sm text-slate-500">A timeline of your completed goals, achievements, and missions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Signal icon={BookOpen} label="Study this week" value={`${Math.round(data.weekly.reduce((sum, item) => sum + item.studyMinutes, 0))} min`} />
        <Signal icon={Sparkles} label="Milestones" value={`${journey.length}`} />
        <Signal icon={Trophy} label="Achievements" value={`${data.achievements.filter((item) => item.unlocked).length}`} />
      </div>

      <section className="glass-panel mt-4 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="journey-count">
            <CalendarDays size={15} className="text-cyan-300" />
            <span>{journey.length} recorded moments</span>
          </div>
        </div>

        {journey.length ? (
          <div className="journey-timeline">
            {journey.map((item, index) => (
              <div key={`${item.title}-${item.date}-${index}`} className="journey-event">
                <span className="journey-node">
                  <Sparkles size={13} />
                </span>
                <div className="journey-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="journey-category">{item.detail}</span>
                    <span className="journey-xp">
                      <Trophy size={11} />
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="journey-date">{formatDate(item.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="state-row justify-center text-xs text-slate-400">No journey events yet.</div>
        )}
      </section>
    </main>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="stat-card border-cyan-400/20 bg-cyan-400/4">
      <div className="flex justify-between">
        <span className="eyebrow">{label}</span>
        <Icon size={17} className="text-cyan-300" />
      </div>
      <strong className="mt-4 block text-2xl font-medium text-white">{value}</strong>
    </div>
  );
}
