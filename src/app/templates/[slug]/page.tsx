import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  platforms,
  productVersions,
  products,
  sellerProfiles,
} from "@/db/schema";
import { PLATFORMS, type PlatformSlug } from "@/lib/platforms";
import { BuyBox } from "@/components/BuyBox";
import { SAMPLE_PRODUCTS } from "@/lib/sample-data";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let row;
  let versions: Array<{
    id: number;
    productId: number;
    version: string;
    changelog: string | null;
    releasedAt: Date;
    requirements: unknown;
  }> = [];

  try {
    const res = await db
      .select({
        product: products,
        platform: platforms,
        seller: sellerProfiles,
      })
      .from(products)
      .innerJoin(platforms, eq(platforms.id, products.platformId))
      .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
      .where(eq(products.slug, slug))
      .limit(1);

    if (res && res.length > 0) {
      row = res[0];
      versions = await db
        .select()
        .from(productVersions)
        .where(eq(productVersions.productId, row.product.id))
        .orderBy(desc(productVersions.releasedAt));
    }
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    // Database unreachable, we will check sample products fallback
  }

  // Fallback to sample data if not in database
  if (!row) {
    const sample = SAMPLE_PRODUCTS.find((p) => p.slug === slug);
    if (!sample) {
      notFound();
    }

    row = {
      product: {
        id: sample.id,
        slug: sample.slug,
        title: sample.title,
        tagline: sample.tagline,
        description: sample.description,
        priceRegular: sample.priceRegular,
        priceExtended: sample.priceExtended,
        currency: sample.currency,
        thumbnailUrl: sample.thumbnailUrl,
        demoUrl: sample.demoUrl,
      },
      platform: {
        name: sample.platform.name,
        slug: sample.platform.slug,
        supportsAutoUpdate: sample.platform.supportsAutoUpdate,
        supportsLicensing: sample.platform.supportsLicensing,
        installGuide: sample.platform.installGuide,
      },
      seller: {
        displayName: sample.seller.displayName,
      },
    };

    versions = [
      {
        id: sample.id,
        productId: sample.id,
        version: sample.version,
        changelog: sample.changelog,
        releasedAt: new Date(sample.releasedAt),
        requirements: sample.requirements,
      },
    ];
  }

  const latest = versions[0];
  const def = PLATFORMS[row.platform.slug as PlatformSlug];
  const requirements = (latest?.requirements ?? {}) as Record<string, unknown>;

  return (
    <div className="wrap product">
      <div>
        <h1>{row.product.title}</h1>
        <p className="product__lede">{row.product.tagline}</p>

        <div className="frame">
          <div className="card__chrome">
            <span className="card__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="card__url">
              {row.product.demoUrl?.replace(/^https?:\/\//, "") ?? "no demo"}
            </span>
          </div>
          {row.product.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="card__shot"
              src={row.product.thumbnailUrl}
              alt={`${row.product.title} preview`}
            />
          ) : (
            <div className="card__shot" />
          )}
        </div>

        <div className="prose">
          <h2>About this template</h2>
          <p>{row.product.description}</p>

          <h2>How to install</h2>
          <p>{row.platform.installGuide ?? def?.installGuide}</p>

          <h2>Release history</h2>
          {versions.length === 0 ? (
            <p>No releases published yet.</p>
          ) : (
            <ul className="specs">
              {versions.map((v) => (
                <li key={v.id}>
                  <span className="k">
                    {v.version} &middot;{" "}
                    {v.releasedAt.toISOString().slice(0, 10)}
                  </span>
                  <span>{v.changelog}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <BuyBox
        productId={row.product.id}
        slug={row.product.slug}
        priceRegular={row.product.priceRegular}
        priceExtended={row.product.priceExtended}
        currency={row.product.currency}
        demoUrl={row.product.demoUrl}
        platformName={row.platform.name}
        supportsAutoUpdate={row.platform.supportsAutoUpdate}
        sellerName={row.seller.displayName}
        latestVersion={latest?.version}
        latestReleaseDate={
          latest ? latest.releasedAt.toISOString().slice(0, 10) : null
        }
        requirements={requirements}
      />
    </div>
  );
}

/**
 * Requirements come from seller-entered JSON, so they arrive in whatever shape
 * the platform needs. A `false` is the absence of a requirement — drop it
 * rather than printing "woocommerce false" at a buyer.
 */
function formatRequirements(
  requirements: Record<string, unknown>,
): Array<[string, string]> {
  return Object.entries(requirements).flatMap(([key, value]) => {
    if (value === false || value == null || value === "") return [];
    if (value === true) return [[key, "required"] as [string, string]];
    return [[key, String(value)] as [string, string]];
  });
}

/**
 * Next signals notFound()/redirect() by throwing an object carrying a digest
 * string. Catching those and rendering an error page would swallow real 404s.
 */
function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest === "NEXT_NOT_FOUND" ||
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}
