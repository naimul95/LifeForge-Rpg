import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Prisma } from "@/generated/prisma/client";

export type AuthenticatedUser = { id: string; email: string; displayName: string | null; avatarUrl: string | null };

async function findOrCreateUser(profile: Profile): Promise<AuthenticatedUser> {
  const email = profile.emails?.find((item) => item.verified)?.value ?? profile.emails?.[0]?.value;
  if (!email) throw new Error("Google did not provide an email address.");
  const user = await prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const account = await transaction.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.id } }, include: { user: true } });
    if (account) return transaction.user.update({ where: { id: account.userId }, data: { email, ...(profile.displayName ? { displayName: profile.displayName } : {}), ...(profile.photos?.[0]?.value ? { avatarUrl: profile.photos[0].value } : {}) } });
    const existing = await transaction.user.findUnique({ where: { email } });
    if (existing) throw new Error("This email is already linked to another sign-in method.");
    return transaction.user.create({ data: { email, displayName: profile.displayName ?? null, avatarUrl: profile.photos?.[0]?.value ?? null, oauthAccounts: { create: { provider: "google", providerAccountId: profile.id } }, profile: { create: {} }, settings: { create: {} } } });
  });
  return { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

const callbackURL = new URL("/api/auth/google/callback", env.APP_URL).toString();
const strategy = new GoogleStrategy({ clientID: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, callbackURL }, async (_accessToken, _refreshToken, profile, done) => {
  try { done(null, await findOrCreateUser(profile)); } catch (error) { done(error as Error); }
});
const passportWithStrategyLookup = passport as typeof passport & { _strategy?: (name: string) => unknown };
if (!passportWithStrategyLookup._strategy?.("google")) passport.use("google", strategy);

export { passport };