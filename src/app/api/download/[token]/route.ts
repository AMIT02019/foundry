import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { downloadTokens, productVersions, products } from "@/db/schema";
import { signedDownloadUrl } from "@/lib/storage";

/**
 * GET /api/download/:token
 *
 * The only route that can hand out a product file. Validates the grant, burns
 * one use, then redirects to a 5-minute signed R2 URL. The object key is never
 * exposed and the redirect target dies quickly if it leaks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const [row] = await db
    .select({
      grant: downloadTokens,
      version: productVersions,
      product: products,
    })
    .from(downloadTokens)
    .innerJoin(
      productVersions,
      eq(productVersions.id, downloadTokens.versionId),
    )
    .innerJoin(products, eq(products.id, productVersions.productId))
    .where(eq(downloadTokens.token, token))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (row.grant.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired. Request a fresh one from Downloads." },
      { status: 410 },
    );
  }
  if (row.grant.usedCount >= row.grant.maxUses) {
    return NextResponse.json(
      { error: "This link has been used too many times." },
      { status: 429 },
    );
  }
  if (!row.version.fileKey) {
    return NextResponse.json(
      { error: "No file attached to this release." },
      { status: 404 },
    );
  }

  await db
    .update(downloadTokens)
    .set({ usedCount: sql`${downloadTokens.usedCount} + 1` })
    .where(eq(downloadTokens.id, row.grant.id));

  const url = await signedDownloadUrl(
    row.version.fileKey,
    `${row.product.slug}-${row.version.version}.zip`,
  );

  return NextResponse.redirect(url, 302);
}
