import type { NextApiRequest, NextApiResponse } from "next";

import { clearedSessionCookieHeader } from "@/lib/auth/session";

export default function logout(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).end("Method Not Allowed");
    return;
  }
  response.setHeader("Set-Cookie", clearedSessionCookieHeader());
  response.status(204).end();
}
