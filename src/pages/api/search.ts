import type { NextApiRequest, NextApiResponse } from "next";

import { searchUserContentForUser } from "@/actions/search.actions";
import { sessionFromCookieHeader } from "@/lib/auth/session";

export default async function search(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "GET") { response.setHeader("Allow", "GET"); response.status(405).end("Method Not Allowed"); return; }
  try {
    const session = await sessionFromCookieHeader(request.headers.cookie);
    if (!session) { response.status(401).json({ error: "Unauthorized." }); return; }
    const query = typeof request.query.q === "string" ? request.query.q : "";
    response.status(200).json(await searchUserContentForUser(session.userId, query));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Search failed." });
  }
}