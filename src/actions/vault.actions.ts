"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import type { VaultMaterialDto, VaultSubjectDto, VaultTopicDto } from "@/types/vault-dashboard";

const subjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  color: z.string().trim().min(1).max(30).default("cyan"),
});
const topicSchema = z.object({
  subjectId: z.string().cuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  estimatedMinutes: z.coerce.number().int().min(0).max(100000),
});
const materialSchema = z.object({
  topicId: z.string().cuid(),
  kind: z.enum(["note", "video", "website"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).default(""),
  url: z.string().trim().optional(),
  content: z.string().max(100000).optional(),
}).superRefine((data, context) => {
  if (data.kind === "note") {
    const content = data.content?.trim();
    if (!content) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Note content is required.", path: ["content"] });
    }
    return;
  }

  if (!data.url || !data.url.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A valid URL is required.", path: ["url"] });
    return;
  }

  try {
    new URL(data.url);
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "A valid URL is required.", path: ["url"] });
  }
});
const roadmapSchema = z.object({
  topicId: z.string().cuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).default(""),
});

function iso(value: Date) {
  return value.toISOString();
}

function materialDto(material: { id: string; title: string; description: string; kind: string; url: string | null; content: string | null; fileKind: string | null; fileName: string | null; mimeType: string | null; sizeBytes: number | null; createdAt: Date; updatedAt: Date }): VaultMaterialDto {
  const kind = material.kind === "file" ? (material.mimeType === "application/pdf" ? "pdf" : material.fileKind === "handwritten_note" ? "handwritten_note" : material.fileKind === "document" ? "document" : "image") : material.kind === "external_link" ? "website" : material.kind as VaultMaterialDto["kind"];
  return { id: material.id, title: material.title, description: material.description, kind, url: material.url, content: material.content, fileName: material.fileName, mimeType: material.mimeType, sizeBytes: material.sizeBytes, createdAt: iso(material.createdAt), updatedAt: iso(material.updatedAt) };
}

export async function getVaultData(): Promise<VaultSubjectDto[]> {
  const { userId } = await requireSession();
  const [subjects, subjectStats, topicStats] = await Promise.all([prisma.subject.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: {
      topics: {
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, name: true, description: true, completion: true, estimatedMinutes: true, studyMinutes: true,
          roadmaps: { where: { userId }, orderBy: { createdAt: "asc" }, take: 50, select: { title: true } },
          materials: { where: { userId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, description: true, kind: true, url: true, content: true, fileKind: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true, updatedAt: true } },
        },
      },
    },
  }), prisma.studySession.groupBy({ by: ["subjectId"], where: { userId }, _count: { _all: true }, _avg: { durationSeconds: true }, _sum: { durationSeconds: true }, _max: { endedAt: true } }), prisma.studySession.groupBy({ by: ["topicId"], where: { userId, topicId: { not: null } }, _count: { _all: true }, _avg: { durationSeconds: true }, _sum: { durationSeconds: true }, _max: { endedAt: true } })]);
  const subjectStatsById = new Map(subjectStats.map((item) => [item.subjectId, item]));
  const topicStatsById = new Map(topicStats.map((item) => [item.topicId as string, item]));
  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    description: subject.description,
    color: subject.color,
    pinned: subject.pinned,
    progress: subject.topics.length ? subject.topics.reduce((sum, topic) => sum + topic.completion, 0) / subject.topics.length : 0,
    studyMinutes: (subjectStatsById.get(subject.id)?._sum.durationSeconds ?? 0) / 60,
    sessionCount: subjectStatsById.get(subject.id)?._count._all ?? 0,
    averageSessionMinutes: (subjectStatsById.get(subject.id)?._avg.durationSeconds ?? 0) / 60,
    lastStudied: subjectStatsById.get(subject.id)?._max.endedAt?.toISOString() ?? null,
    topics: subject.topics.map((topic): VaultTopicDto => ({
      id: topic.id,
      subjectId: subject.id,
      name: topic.name,
      description: topic.description,
      progress: topic.completion,
      remaining: Math.max(0, topic.estimatedMinutes - (topicStatsById.get(topic.id)?._sum.durationSeconds ?? 0) / 60),
      studyMinutes: (topicStatsById.get(topic.id)?._sum.durationSeconds ?? 0) / 60,
      sessionCount: topicStatsById.get(topic.id)?._count._all ?? 0,
      averageSessionMinutes: (topicStatsById.get(topic.id)?._avg.durationSeconds ?? 0) / 60,
      estimatedMinutes: topic.estimatedMinutes,
      lastStudied: topicStatsById.get(topic.id)?._max.endedAt?.toISOString() ?? null,
      roadmap: topic.roadmaps.map((item) => item.title),
      materials: topic.materials.map(materialDto),
    })),
  }));
}

export async function createSubject(input: unknown) {
  const { userId } = await requireSession();
  const data = subjectSchema.parse(input);
  await prisma.subject.create({ data: { ...data, userId } });
  revalidatePath("/dashboard/learning-vault");
}

export async function createTopic(input: unknown) {
  const { userId } = await requireSession();
  const data = topicSchema.parse(input);
  const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, userId } });
  if (!subject) throw new Error("Subject not found.");
  await prisma.topic.create({ data: { userId, subjectId: subject.id, name: data.name, description: data.description, estimatedMinutes: data.estimatedMinutes, subtopics: [] } });
  revalidatePath("/dashboard/learning-vault");
}

export async function updateTopicProgress(topicId: string, progress: number) {
  const { userId } = await requireSession();
  const topic = await prisma.topic.findFirst({ where: { id: topicId, userId } });
  if (!topic) throw new Error("Topic not found.");
  const completion = z.number().int().min(0).max(100).refine((value) => value % 10 === 0, "Progress must use 10% increments.").parse(progress);
  await prisma.topic.updateMany({ where: { id: topicId, userId }, data: { completion, completedCount: Math.round(completion / 100 * topic.estimatedMinutes) } });
}

export async function createMaterial(input: unknown) {
  const { userId } = await requireSession();
  const data = materialSchema.parse(input);
  const topic = await prisma.topic.findFirst({ where: { id: data.topicId, userId } });
  if (!topic) throw new Error("Topic not found.");

  const kind = data.kind === "website" ? "external_link" : data.kind;
  const content = data.kind === "note" ? data.content?.trim() ?? null : null;
  const url = data.kind === "note" ? null : data.url?.trim() ?? null;

  await prisma.material.create({ data: { userId, subjectId: topic.subjectId, topicId: topic.id, kind, title: data.title, description: data.description, url, content } });
  revalidatePath("/dashboard/learning-vault");
}

export async function createUploadedMaterialForUser(userId: string, input: unknown) {
  const data = z.object({
    topicId: z.string().cuid(),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).default(""),
    fileKind: z.enum(["pdf", "image", "handwritten_note", "document"]),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(120),
    sizeBytes: z.number().int().positive().max(10_000_000),
    cloudinaryPublicId: z.string().trim().min(1).max(255),
    cloudinaryUrl: z.string().url(),
    cloudinaryResourceType: z.enum(["image", "raw", "video"]),
  }).parse(input);

  if (!data.cloudinaryPublicId.startsWith(`lifeforge/${userId}/`)) throw new Error("Invalid upload ownership.");
  if (!new URL(data.cloudinaryUrl).hostname.endsWith(".cloudinary.com")) throw new Error("Invalid upload location.");

  const topic = await prisma.topic.findFirst({ where: { id: data.topicId, userId } });
  if (!topic) throw new Error("Topic not found.");

  await prisma.material.create({
    data: {
      userId,
      subjectId: topic.subjectId,
      topicId: topic.id,
      kind: "file",
      title: data.title,
      description: data.description,
      fileKind: data.fileKind,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      cloudinaryPublicId: data.cloudinaryPublicId,
      cloudinaryUrl: data.cloudinaryUrl,
      cloudinaryResourceType: data.cloudinaryResourceType,
    },
  });
  revalidatePath("/dashboard/learning-vault");
}

export async function createUploadedMaterial(input: unknown) {
  const { userId } = await requireSession();
  await createUploadedMaterialForUser(userId, input);
}

export async function createRoadmap(input: unknown) {
  const { userId } = await requireSession();
  const data = roadmapSchema.parse(input);
  const topic = await prisma.topic.findFirst({ where: { id: data.topicId, userId } });
  if (!topic) throw new Error("Topic not found.");
  await prisma.roadmap.create({ data: { userId, subjectId: topic.subjectId, topicId: topic.id, title: data.title, description: data.description } });
  revalidatePath("/dashboard/learning-vault");
}

export async function renameMaterial(materialId: string, title: string) {
  const { userId } = await requireSession();
  const cleanTitle = z.string().trim().min(1).max(160).parse(title);
  const result = await prisma.material.updateMany({ where: { id: materialId, userId }, data: { title: cleanTitle } });
  if (result.count !== 1) throw new Error("Material not found.");
  revalidatePath("/dashboard/learning-vault");
}

export async function deleteMaterial(materialId: string) {
  const { userId } = await requireSession();
  const material = await prisma.material.findFirst({ where: { id: materialId, userId }, select: { cloudinaryPublicId: true, cloudinaryResourceType: true } });
  if (!material) throw new Error("Material not found.");
  if (material.cloudinaryPublicId && material.cloudinaryPublicId.startsWith(`lifeforge/${userId}/`)) {
    const { cloudinary } = await import("@/lib/storage/cloudinary");
    const resourceType = material.cloudinaryResourceType === "image" || material.cloudinaryResourceType === "raw" || material.cloudinaryResourceType === "video" ? material.cloudinaryResourceType : "raw";
    await cloudinary.uploader.destroy(material.cloudinaryPublicId, { resource_type: resourceType, invalidate: true });
  }
  await prisma.material.deleteMany({ where: { id: materialId, userId } });
  revalidatePath("/dashboard/learning-vault");
}

export async function shareMaterial(materialId: string) {
  const { userId } = await requireSession();
  const settings = await prisma.settings.findUnique({ where: { userId }, select: { shareLinksEnabled: true } });
  if (!settings?.shareLinksEnabled) throw new Error("Sharing is disabled in your settings.");
  const material = await prisma.material.findFirst({ where: { id: materialId, userId }, select: { id: true } });
  if (!material) throw new Error("Material not found.");
  const share = await prisma.sharedMaterial.upsert({ where: { userId_materialId: { userId, materialId } }, update: { revokedAt: null }, create: { userId, materialId, shareToken: crypto.randomUUID() } });
  revalidatePath("/dashboard/learning-vault");
  return `${env.NEXT_PUBLIC_APP_URL}/shared/${share.shareToken}`;
}
