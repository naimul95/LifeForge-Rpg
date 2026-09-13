"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import type { SearchResult } from "@/types/search";

const searchInput = z.string().trim().min(1).max(100);

function buildSearchText(...values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function matchesSearchQuery(value: string, query: string) {
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return false;
  if (normalizedValue.includes(normalizedQuery)) return true;

  const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, "");
  if (compactQuery.length > 1) {
    const initials = normalizedValue
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token[0])
      .join("");

    if (initials.includes(compactQuery)) return true;
  }

  const words = normalizedValue.match(/[a-z0-9]+/g) ?? [];
  if (words.some((word) => word.startsWith(normalizedQuery) || normalizedQuery.startsWith(word))) return true;

  return false;
}

export async function searchUserContent(input: unknown): Promise<SearchResult[]> {
  const { userId } = await requireSession();
  return searchUserContentForUser(userId, input);
}

export async function searchUserContentForUser(userId: string, input: unknown): Promise<SearchResult[]> {
  const query = searchInput.parse(input);

  const [subjects, topics, materials, notes, goals, habits, quests] = await Promise.all([
    prisma.subject.findMany({ where: { userId }, select: { id: true, name: true, description: true }, take: 24 }),
    prisma.topic.findMany({ where: { userId }, select: { id: true, name: true, description: true }, take: 24 }),
    prisma.material.findMany({ where: { userId }, select: { id: true, title: true, description: true, content: true }, take: 24 }),
    prisma.note.findMany({ where: { userId }, select: { id: true, title: true, content: true }, take: 24 }),
    prisma.goal.findMany({ where: { userId }, select: { id: true, title: true, description: true, category: true }, take: 24 }),
    prisma.habit.findMany({ where: { userId }, select: { id: true, name: true }, take: 24 }),
    prisma.quest.findMany({ where: { userId }, select: { id: true, title: true, description: true }, take: 24 }),
  ]);

  const results: SearchResult[] = [
    ...subjects.filter((item) => matchesSearchQuery(buildSearchText(item.name, item.description), query)).map((item) => ({ id: item.id, type: "Subject" as const, title: item.name, detail: item.description || "Subject", destination: "/dashboard/learning-vault" })),
    ...topics.filter((item) => matchesSearchQuery(buildSearchText(item.name, item.description), query)).map((item) => ({ id: item.id, type: "Topic" as const, title: item.name, detail: item.description || "Topic", destination: "/dashboard/learning-vault" })),
    ...materials.filter((item) => matchesSearchQuery(buildSearchText(item.title, item.description, item.content ?? ""), query)).map((item) => ({ id: item.id, type: "Material" as const, title: item.title, detail: item.description || "Learning material", destination: "/dashboard/learning-vault" })),
    ...notes.filter((item) => matchesSearchQuery(buildSearchText(item.title, item.content), query)).map((item) => ({ id: item.id, type: "Note" as const, title: item.title, detail: item.content?.slice(0, 100) ?? "Note", destination: "/dashboard/learning-vault" })),
    ...goals.filter((item) => matchesSearchQuery(buildSearchText(item.title, item.description, item.category ?? ""), query)).map((item) => ({ id: item.id, type: "Goal" as const, title: item.title, detail: item.description || "Goal", destination: "/dashboard/goals" })),
    ...habits.filter((item) => matchesSearchQuery(item.name, query)).map((item) => ({ id: item.id, type: "Habit" as const, title: item.name, detail: "Habit", destination: "/dashboard/habits" })),
    ...quests.filter((item) => matchesSearchQuery(buildSearchText(item.title, item.description), query)).map((item) => ({ id: item.id, type: "Mission" as const, title: item.title, detail: item.description || "Mission", destination: "/dashboard/life-rpg" })),
  ];

  return results.slice(0, 30);
}