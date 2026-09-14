import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "@/lib/db";
import { clearedSessionCookieHeader, sessionFromCookieHeader } from "@/lib/auth/session";

export default async function session(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).end("Method Not Allowed");
    return;
  }
  const session = await sessionFromCookieHeader(request.headers.cookie);
  if (!session) {
    response.status(401).json({ authenticated: false });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  if (!user) {
    response.setHeader("Set-Cookie", clearedSessionCookieHeader());
    response.status(401).json({ authenticated: false });
    return;
  }

  response.status(200).json({ authenticated: true, user });
}
