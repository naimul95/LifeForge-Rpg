"use server";

import { cookies } from "next/headers";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { SESSION_COOKIE, requireSession } from "@/lib/auth/session";

export async function getAuthenticatedUser() {
  return requireAuthenticatedUser();
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
