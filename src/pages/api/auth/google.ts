import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export default async function googleLogin(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end("Method Not Allowed");
    return;
  }
  const state = crypto.randomBytes(32).toString("hex");
  response.setHeader("Set-Cookie", `lifeforge_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  const { passport } = await import("@/lib/server/auth/passport");
  return passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
  })(request, response);
}
