import "server-only";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function requireAuthenticatedUser() {
  const { userId } = await requireSession();
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
}

export async function requireOwnedRecord<T>(load: (userId: string) => Promise<T | null>) {
  const { userId } = await requireSession();
  const record = await load(userId);
  if (!record) throw new Error("Not found.");
  return record;
}
