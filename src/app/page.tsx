import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { platforms, productVersions, products } from "@/db/schema";
import { TemplateCard, type CardProduct } from "@/components/TemplateCard";
import { Hero } from "@/components/Hero";
import { PlatformRail } from "@/components/PlatformRail";
import { Reveal } from "@/components/Reveal";
import { platformList } from "@/lib/platforms";

export const dynamic = "force-dynamic";

async function getCatalogue(platformSlug?: string): Promise<CardProduct[]> {
  const latestVersion = db
    .select({
      productId: productVersions.productId,
      // Semver-aware: max() on text would rank 1.9.0 above 1.10.0.
      version:
        sql<string>`array_to_string(max(string_to_array(${productVersions.version}, '.')::int[]), '.')`.as(
          "version",
        ),
    })
    .from(productVersions)
    .groupBy(productVersions.productId)
    .as("latest_version");

  return db
    .select({
      slug: products.slug,
      title: products.title,
      tagline: products.tagline,
      priceRegular: products.priceRegular,
      currency: products.currency,
      thumbnailUrl: products.thumbnailUrl,
      demoUrl: products.demoUrl,
      platformSlug: platforms.slug,
      version: latestVersion.version,
    })
    .from(products)
    .innerJoin(platforms, eq(platforms.id, products.platformId))
    .leftJoin(latestVersion, eq(latestVersion.productId, products.id))
    .where(
      platformSlug
        ? sql`${products.status} = 'published' and ${platforms.slug} = ${platformSlug}`
        : eq(products.status, "published"),
    )
    .orderBy(desc(products.publishedAt));
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;

  let catalogue: CardProduct[] = [];
  let dbError: string | null = null;
  try {
    catalogue = await getCatalogue(platform);
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Unknown database error";
  }

  // Fallback to rich sample catalogue if database is not configured or empty
  if (catalogue.length === 0) {
    const { SAMPLE_PRODUCTS } = await import("@/lib/sample-data");
    catalogue = SAMPLE_PRODUCTS.filter(
      (p) => !platform || p.platformSlug === platform,
    ).map((p) => ({
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      priceRegular: p.priceRegular,
      currency: p.currency,
      thumbnailUrl: p.thumbnailUrl,
      demoUrl: p.demoUrl,
      platformSlug: p.platformSlug,
      version: p.version,
    }));
  }

  return (
    <>
      <Hero />
      <PlatformRail />

      <section className="catalogue" id="catalogue">
        <div className="wrap">
          <Reveal>
            <div className="catalogue__head">
              <div>
                <p className="eyebrow mono">The catalogue</p>
                <h2>
                  {platform
                    ? platformList.find((p) => p.slug === platform)?.name
                    : "Everything we sell"}
                </h2>
              </div>
              <p className="mono" style={{ color: "var(--ink-soft)" }}>
                {catalogue.length} template{catalogue.length === 1 ? "" : "s"}
              </p>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <nav className="filters" aria-label="Filter by platform">
              <a
                className="chip"
                href="/#catalogue"
                aria-current={!platform ? "true" : undefined}
              >
                Everything
              </a>
              {platformList.map((p) => (
                <a
                  key={p.slug}
                  className="chip"
                  href={`/?platform=${p.slug}#catalogue`}
                  aria-current={platform === p.slug ? "true" : undefined}
                >
                  {p.name}
                </a>
              ))}
            </nav>
          </Reveal>

          {dbError ? (
            <div className="empty">
              <p>
                The catalogue can&apos;t be reached. Set{" "}
                <code>DATABASE_URL</code>, then run <code>npm run db:push</code>{" "}
                and <code>npm run db:seed</code>.
              </p>
              <p className="mono">{dbError}</p>
            </div>
          ) : catalogue.length === 0 ? (
            <div className="empty">
              <p>Nothing published on this platform yet.</p>
              <p>
                Run <code>npm run db:seed</code> to load the sample catalogue.
              </p>
            </div>
          ) : (
            <div className="grid">
              {catalogue.map((product, i) => (
                <Reveal key={product.slug} delay={Math.min(i, 6) * 70}>
                  <TemplateCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
