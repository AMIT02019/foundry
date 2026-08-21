import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  categories,
  licenses,
  orderItems,
  orders,
  platforms,
  productVersions,
  products,
  sellerProfiles,
  users,
} from "./schema";
import { platformList } from "../lib/platforms";
import { generateLicenseKey } from "../lib/licenses";
import { splitEarnings } from "../lib/money";

async function main() {
  console.log("Seeding platforms…");
  await db
    .insert(platforms)
    .values(
      platformList.map((p) => ({
        slug: p.slug,
        name: p.name,
        deliveryType: p.deliveryType,
        supportsLicensing: p.supportsLicensing,
        supportsAutoUpdate: p.supportsAutoUpdate,
        installGuide: p.installGuide,
        sortOrder: p.sortOrder,
      })),
    )
    .onConflictDoNothing();

  const platformRows = await db.select().from(platforms);
  const bySlug = new Map(platformRows.map((p) => [p.slug, p.id]));

  console.log("Seeding categories…");
  await db
    .insert(categories)
    .values([
      { slug: "business", name: "Business & corporate" },
      { slug: "portfolio", name: "Portfolio" },
      { slug: "ecommerce", name: "Ecommerce" },
      { slug: "saas", name: "SaaS & startup" },
    ])
    .onConflictDoNothing();

  const catRows = await db.select().from(categories);

  console.log("Seeding seller…");
  await db
    .insert(users)
    .values({ email: "studio@foundry.dev", name: "Foundry Studio", role: "seller" })
    .onConflictDoNothing();

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.email, "studio@foundry.dev"))
    .limit(1);

  await db
    .insert(sellerProfiles)
    .values({
      userId: owner.id,
      slug: "foundry-studio",
      displayName: "Foundry Studio",
      bio: "House templates, built and maintained in-house.",
      revenueShareBps: 10_000,
      kycVerified: true,
    })
    .onConflictDoNothing();

  const [seller] = await db
    .select()
    .from(sellerProfiles)
    .where(eq(sellerProfiles.slug, "foundry-studio"))
    .limit(1);

  console.log("Seeding catalogue…");
  const catalogue = [
    {
      slug: "meridian-wp",
      title: "Meridian",
      tagline: "Consulting and professional services, built on ACF blocks.",
      platform: "wordpress",
      category: "business",
      priceRegular: 449_00,
      priceExtended: 2_249_00,
      demoUrl: "https://demo.foundry.dev/meridian",
      version: "2.3.1",
      changelog: "Adds a case-study post type and fixes the sticky sub-nav.",
      requirements: { wp: "6.4+", php: "8.1+", woocommerce: false },
    },
    {
      slug: "kiln-html",
      title: "Kiln",
      tagline: "A 14-page Tailwind kit for studios that photograph their work.",
      platform: "html",
      category: "portfolio",
      priceRegular: 199_00,
      priceExtended: 999_00,
      demoUrl: "https://demo.foundry.dev/kiln",
      version: "1.4.0",
      changelog: "New masonry gallery and a dark variant of every page.",
      requirements: { build: "Vite 5", css: "Tailwind 4" },
    },
    {
      slug: "harvest-shopify",
      title: "Harvest",
      tagline: "Grocery and speciality food storefront with bundle pricing.",
      platform: "shopify",
      category: "ecommerce",
      priceRegular: 899_00,
      priceExtended: null,
      demoUrl: "https://demo.foundry.dev/harvest",
      version: "1.1.2",
      changelog: "Online Store 2.0 metafield sections.",
      requirements: { os: "2.0", checkout: "Extensibility ready" },
    },
    {
      slug: "signal-framer",
      title: "Signal",
      tagline: "Launch page for developer tools, with a live changelog section.",
      platform: "framer",
      category: "saas",
      priceRegular: 349_00,
      priceExtended: null,
      demoUrl: "https://signal.framer.website",
      version: "1.0.0",
      changelog: "First release.",
      requirements: { plan: "Framer Mini or above" },
    },
  ];

  for (const item of catalogue) {
    const [product] = await db
      .insert(products)
      .values({
        sellerId: seller.id,
        platformId: bySlug.get(item.platform)!,
        categoryId: catRows.find((c) => c.slug === item.category)?.id,
        slug: item.slug,
        title: item.title,
        tagline: item.tagline,
        description:
          "Every page is production-ready: real content structure, accessible markup, and no placeholder lorem left behind.",
        status: "published",
        priceRegular: item.priceRegular,
        priceExtended: item.priceExtended,
        currency: "INR",
        demoUrl: item.demoUrl,
        publishedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!product) continue;

    await db.insert(productVersions).values({
      productId: product.id,
      version: item.version,
      changelog: item.changelog,
      fileKey: `products/${item.slug}/${item.slug}-${item.version}.zip`,
      fileSize: 4_200_000,
      requirements: item.requirements,
    });
  }

  console.log("Seeding one sample purchase (for licence testing)…");
  await db
    .insert(users)
    .values({ email: "buyer@example.com", name: "Test Buyer" })
    .onConflictDoNothing();

  const [buyer] = await db
    .select()
    .from(users)
    .where(eq(users.email, "buyer@example.com"))
    .limit(1);

  const [meridian] = await db
    .select()
    .from(products)
    .where(eq(products.slug, "meridian-wp"))
    .limit(1);

  if (buyer && meridian) {
    const [order] = await db
      .insert(orders)
      .values({
        buyerId: buyer.id,
        status: "paid",
        subtotal: meridian.priceRegular,
        total: meridian.priceRegular,
        gateway: "razorpay",
      })
      .returning();

    const split = splitEarnings(meridian.priceRegular, seller.revenueShareBps);
    const [item] = await db
      .insert(orderItems)
      .values({
        orderId: order.id,
        productId: meridian.id,
        tier: "regular",
        price: meridian.priceRegular,
        sellerEarnings: split.seller,
      })
      .returning();

    const key = generateLicenseKey();
    await db.insert(licenses).values({
      key,
      orderItemId: item.id,
      buyerId: buyer.id,
      productId: meridian.id,
      tier: "regular",
      maxActivations: 1,
      supportedUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    });

    console.log(`\nTest licence key: ${key}`);
    console.log(
      `Try: curl -X POST localhost:3000/api/license/activate -H 'content-type: application/json' -d '{"key":"${key}","site_url":"https://client.example.com"}'`,
    );
  }

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
