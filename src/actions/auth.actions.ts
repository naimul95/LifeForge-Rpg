"use server";

import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE, requireSession } from "@/lib/auth/session";

export async function getAuthenticatedUser() {
  const { userId } = await requireSession();
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
}

export async function logout() {
  await requireSession();
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return { success: true };
}
