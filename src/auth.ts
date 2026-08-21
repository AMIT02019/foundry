import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Sessions are JWTs, not database rows.
 *
 * The Drizzle adapter expects text UUID user ids and its own accounts/sessions
 * tables; this schema is integer-keyed and already owns `users`. Rather than
 * bend one to the other, we upsert into our own table on sign-in and carry our
 * integer id in the token. Everything downstream (orders, licences, payouts)
 * keeps referencing users.id as it always did.
 *
 * Trade-off: no server-side session revocation. Sessions expire rather than
 * being killable. If that matters later, add a `sessionVersion` integer on
 * users, put it in the token, and compare it in the jwt callback.
 */

/**
 * Auth.js types `user.id` as a string, so we keep that convention on the
 * session and convert to our integer key at exactly one place —
 * `currentUserId()` in lib/session.ts. Declaring it as a number here instead
 * intersects to `never` and quietly poisons every consumer.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "buyer" | "seller" | "admin";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    role?: "buyer" | "seller" | "admin";
  }
}

async function upsertUser(email: string, name: string | null) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ email, name: name ?? email.split("@")[0], role: "buyer" })
    .returning();

  return created;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    /**
     * Password-less local sign-in so the purchase and download flows can be
     * exercised without OAuth credentials.
     *
     * Gated on an explicit opt-in flag rather than NODE_ENV, because
     * `next start` sets NODE_ENV to "production" even on a laptop — a NODE_ENV
     * gate is therefore untestable locally and gives false confidence. This
     * flag must never be set on a deployed environment: it signs anyone in as
     * any email address, with no password.
     */
    ...(process.env.FOUNDRY_DEV_LOGIN === "true"
      ? [
          Credentials({
            id: "dev",
            name: "Development sign-in",
            credentials: { email: { label: "Email", type: "email" } },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim();
              if (!email.includes("@")) return null;
              const user = await upsertUser(email, null);
              return { id: String(user.id), email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Only runs on sign-in; afterwards the token already carries our id.
      if (user?.email) {
        const record = await upsertUser(user.email, user.name ?? null);
        token.userId = record.id;
        token.role = record.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
        session.user.role = token.role ?? "buyer";
      }
      return session;
    },
  },
});
