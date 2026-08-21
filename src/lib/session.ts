import type { Session } from "next-auth";
import { auth } from "@/auth";

/**
 * The single boundary between Auth.js's string user id and our integer key.
 * Returns null when signed out, so callers decide the failure mode instead of
 * catching an exception.
 *
 * Also returns null when auth is unconfigured (no AUTH_SECRET), rather than
 * throwing. That keeps a preview deploy with no environment variables
 * browsable — pages behave as signed-out instead of returning 500.
 */
export async function currentUserId(): Promise<number | null> {
  // `auth` is overloaded (middleware wrapper + session getter), so its
  // ReturnType resolves to the wrong signature — annotate with Session instead.
  let session: Session | null = null;

  try {
    session = await auth();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] session lookup failed:", error);
    }
    return null;
  }

  const raw = session?.user?.id;
  if (!raw) return null;

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Whether sign-in can work at all in this environment. */
export function authConfigured(): boolean {
  return Boolean(
    process.env.AUTH_SECRET &&
      (process.env.GOOGLE_CLIENT_ID || process.env.FOUNDRY_DEV_LOGIN === "true"),
  );
}
