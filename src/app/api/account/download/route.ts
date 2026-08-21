import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { currentUserId } from "@/lib/session";
import { db } from "@/db";
import { licenses, productVersions } from "@/db/schema";
import { issueDownloadToken } from "@/lib/licenses";

/**
 * POST /api/account/download  Body: { licenseId }
 *
 * Mints a fresh short-lived token for a licence the caller actually owns.
 * Ownership is checked against the session, not against anything posted.
 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }

  let body: { licenseId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const [license] = await db
    .select()
    .from(licenses)
    .where(
      and(
        eq(licenses.id, Number(body.licenseId)),
        eq(licenses.buyerId, userId),
      ),
    )
    .limit(1);

  if (!license) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (license.status === "revoked") {
    return NextResponse.json({ error: "revoked" }, { status: 403 });
  }

  // A lapsed support window still allows re-downloading what they own — it
  // only stops them receiving versions released after it ended.
  const cutoff = license.supportedUntil;
  const [version] = await db
    .select()
    .from(productVersions)
    .where(
      cutoff
        ? and(
            eq(productVersions.productId, license.productId),
            sql`${productVersions.releasedAt} <= ${cutoff}`,
          )
        : eq(productVersions.productId, license.productId),
    )
    .orderBy(sql`string_to_array(${productVersions.version}, '.')::int[] DESC`)
    .limit(1);

  if (!version) {
    return NextResponse.json({ error: "no_release" }, { status: 404 });
  }

  const token = await issueDownloadToken(license.id, version.id);

  return NextResponse.json({
    url: `/api/download/${token}`,
    version: version.version,
  });
}
