import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { parseCookie, stringifySetCookie } from "cookie";

import { env } from "@/lib/env";

export const SESSION_COOKIE = "lifeforge_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const jwtKey = new TextEncoder().encode(env.JWT_SECRET);

export type Session = { userId: string };

export async function createSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("lifeforge-rpg")
    .setAudience("lifeforge-web")
    .sign(jwtKey);
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey, {
      algorithms: ["HS256"],
      issuer: "lifeforge-rpg",
      audience: "lifeforge-web",
    });
    return typeof payload.userId === "string" && payload.sub === payload.userId
      ? { userId: payload.userId }
      : null;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string) {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearedSessionCookieHeader() {
  return stringifySetCookie({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized.");
  return session;
}

export function sessionFromCookieHeader(header: string | undefined) {
  const token = header ? parseCookie(header)[SESSION_COOKIE] : undefined;
  return token ? verifySessionToken(token) : Promise.resolve(null);
}
