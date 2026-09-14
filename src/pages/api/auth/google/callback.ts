import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookie } from "cookie";

type AuthenticatedUser = { id: string; email: string; displayName: string | null; avatarUrl: string | null };

export default async function googleCallback(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end("Method Not Allowed");
    return;
  }
  const state = typeof request.query.state === "string" ? request.query.state : "";
  const cookieState = request.headers.cookie ? parseCookie(request.headers.cookie).lifeforge_oauth_state : undefined;
  if (!state || !cookieState || state !== cookieState) { response.status(400).end("Invalid OAuth state."); return; }
  const [{ passport }, { createSessionToken, sessionCookieHeader }, { env }] = await Promise.all([import("@/lib/server/auth/passport"), import("@/lib/auth/session"), import("@/lib/env")]);
  return passport.authenticate("google", { session: false }, async (error: unknown, user: AuthenticatedUser | false) => {
    if (error || !user) {
      response.redirect(302, `${env.APP_URL}/?auth=failed`);
      return;
    }

    const token = await createSessionToken(user.id);
    response.setHeader("Set-Cookie", ["lifeforge_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0", sessionCookieHeader(token)]);
    response.redirect(302, env.APP_URL);
  })(request, response);
}
