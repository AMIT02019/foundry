import { randomBytes, randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  downloadTokens,
  licenseActivations,
  licenses,
  productVersions,
  products,
} from "@/db/schema";

/** FNDR-XXXX-XXXX-XXXX-XXXX — unambiguous alphabet, no O/0/I/1. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLicenseKey(): string {
  const bytes = randomBytes(16);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  const groups = [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join(""));
  return `FNDR-${groups.join("-")}`;
}

export type ActivationResult =
  | { ok: true; activationsUsed: number; activationsAllowed: number | null }
  | { ok: false; reason: string };

/**
 * Called by an installed theme on activation. Idempotent per (licence, site):
 * re-activating the same site never consumes another slot, which is what makes
 * staging → production moves painless.
 */
export async function activateLicense(
  key: string,
  siteUrl: string,
): Promise<ActivationResult> {
  const normalised = normaliseSiteUrl(siteUrl);
  if (!normalised) return { ok: false, reason: "invalid_site_url" };

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.key, key))
    .limit(1);

  if (!license) return { ok: false, reason: "unknown_key" };
  if (license.status !== "active") return { ok: false, reason: license.status };

  const existing = await db
    .select()
    .from(licenseActivations)
    .where(
      and(
        eq(licenseActivations.licenseId, license.id),
        eq(licenseActivations.status, "active"),
      ),
    );

  const already = existing.find((a) => a.siteUrl === normalised);
  if (already) {
    return {
      ok: true,
      activationsUsed: existing.length,
      activationsAllowed: license.maxActivations,
    };
  }

  if (
    license.maxActivations !== null &&
    existing.length >= license.maxActivations
  ) {
    return { ok: false, reason: "activation_limit_reached" };
  }

  await db.insert(licenseActivations).values({
    licenseId: license.id,
    siteUrl: normalised,
  });

  return {
    ok: true,
    activationsUsed: existing.length + 1,
    activationsAllowed: license.maxActivations,
  };
}

export async function deactivateLicense(key: string, siteUrl: string) {
  const normalised = normaliseSiteUrl(siteUrl);
  if (!normalised) return { ok: false, reason: "invalid_site_url" };

  const [license] = await db
    .select()
    .from(licenses)
    .where(eq(licenses.key, key))
    .limit(1);
  if (!license) return { ok: false, reason: "unknown_key" };

  await db
    .update(licenseActivations)
    .set({ status: "released", releasedAt: new Date() })
    .where(
      and(
        eq(licenseActivations.licenseId, license.id),
        eq(licenseActivations.siteUrl, normalised),
      ),
    );

  return { ok: true };
}

/**
 * Update feed. A lapsed support window does NOT revoke the theme — the buyer
 * keeps what they installed, they just stop being offered newer builds.
 */
export async function checkForUpdate(key: string, productSlug: string) {
  const [row] = await db
    .select({ license: licenses, product: products })
    .from(licenses)
    .innerJoin(products, eq(products.id, licenses.productId))
    .where(and(eq(licenses.key, key), eq(products.slug, productSlug)))
    .limit(1);

  if (!row) return { ok: false as const, reason: "unknown_key" };
  if (row.license.status !== "active")
    return { ok: false as const, reason: row.license.status };
  if (row.license.supportedUntil && row.license.supportedUntil < new Date())
    return { ok: false as const, reason: "support_expired" };

  const [latest] = await db
    .select()
    .from(productVersions)
    .where(eq(productVersions.productId, row.product.id))
    .orderBy(sql`string_to_array(${productVersions.version}, '.')::int[] DESC`)
    .limit(1);

  if (!latest) return { ok: false as const, reason: "no_release" };

  const token = await issueDownloadToken(row.license.id, latest.id);

  return {
    ok: true as const,
    version: latest.version,
    changelog: latest.changelog,
    requirements: latest.requirements,
    releasedAt: latest.releasedAt,
    packageUrl: `${process.env.APP_URL}/api/download/${token}`,
  };
}

export async function issueDownloadToken(
  licenseId: number,
  versionId: number,
  ttlMinutes = 15,
) {
  const token = randomUUID().replace(/-/g, "");
  await db.insert(downloadTokens).values({
    token,
    licenseId,
    versionId,
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  });
  return token;
}

/** https://Example.com/blog/ → example.com — one site, one slot. */
export function normaliseSiteUrl(input: string): string | null {
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
