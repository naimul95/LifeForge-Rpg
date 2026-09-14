import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sessionFromCookieHeader } from "@/lib/auth/session";

const gameKeys = ["reaction-test", "memorize-number", "typing-challenge", "focus-challenge", "daily-challenge"] as const;
const scoreInput = z.object({ gameKey: z.enum(gameKeys), score: z.number().int().nonnegative() }).superRefine((value, context) => {
  const maximum = value.gameKey === "reaction-test" ? 1000 : value.gameKey === "memorize-number" ? 1000000 : 100;
  if (value.score > maximum) context.addIssue({ code: z.ZodIssueCode.too_big, origin: "number", maximum, inclusive: true, message: "Score is outside the valid range." });
  if (value.gameKey === "focus-challenge") context.addIssue({ code: z.ZodIssueCode.custom, message: "This activity does not record a score." });
});

export default async function mindRefresh(request: NextApiRequest, response: NextApiResponse) {
  try {
    const session = await sessionFromCookieHeader(request.headers.cookie);
    if (!session) throw new Error("Unauthorized.");
    const userId = session.userId;
    if (request.method === "GET") {
      const scores = await prisma.gameScore.findMany({ where: { userId, gameKey: { in: [...gameKeys] } }, orderBy: { score: "desc" }, select: { gameKey: true, score: true } });
      response.status(200).json(Object.fromEntries(gameKeys.map((gameKey) => [gameKey, scores.find((score) => score.gameKey === gameKey)?.score])));
      return;
    }
    if (request.method === "POST") {
      const { gameKey, score } = scoreInput.parse(request.body);
      const current = await prisma.gameScore.findFirst({ where: { userId, gameKey }, orderBy: { score: "desc" }, select: { score: true } });
      if (current && current.score >= score) { response.status(200).json({ personalBest: current.score, isNewBest: false }); return; }
      await prisma.gameScore.create({ data: { userId, gameKey, score } });
      response.status(200).json({ personalBest: score, isNewBest: true });
      return;
    }
    response.setHeader("Allow", "GET, POST"); response.status(405).end("Method Not Allowed");
  } catch (error) {
    response.status(error instanceof Error && error.message === "Unauthorized." ? 401 : 400).json({ error: error instanceof Error ? error.message : "Mind Refresh request failed." });
  }
}