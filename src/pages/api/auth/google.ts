import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

import { oauthStateCookieHeader } from "@/lib/auth/session";

export default async function googleLogin(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end("Method Not Allowed");
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
  response.setHeader("Set-Cookie", oauthStateCookieHeader(state));

  const { passport } = await import("@/lib/server/auth/passport");
  return passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
  })(request, response);
}
