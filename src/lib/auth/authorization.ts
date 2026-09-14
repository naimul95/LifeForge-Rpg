import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

const getAuthenticatedUserById = cache(async (userId: string) =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  }),
);

export async function requireAuthenticatedUser() {
  const { userId } = await requireSession();
  return getAuthenticatedUserById(userId);
}

export async function requireOwnedRecord<T>(load: (userId: string) => Promise<T | null>) {
  const { userId } = await requireSession();
  const record = await load(userId);
  if (!record) throw new Error("Not found.");
  return record;
}
