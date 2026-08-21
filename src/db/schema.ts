import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ---------------------------------------------------------------------------
 * Money is stored as integer minor units (paise / cents). Never floats.
 * `currency` is ISO-4217. One currency per order.
 * ------------------------------------------------------------------------- */

export const userRole = pgEnum("user_role", ["buyer", "seller", "admin"]);
export const productStatus = pgEnum("product_status", [
  "draft",
  "in_review",
  "rejected",
  "published",
  "retired",
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "refunded",
  "failed",
]);
export const licenseTier = pgEnum("license_tier", ["regular", "extended"]);
export const licenseStatus = pgEnum("license_status", [
  "active",
  "expired",
  "revoked",
]);
export const activationStatus = pgEnum("activation_status", [
  "active",
  "released",
]);
export const payoutStatus = pgEnum("payout_status", [
  "scheduled",
  "processing",
  "paid",
  "failed",
]);

/* How a product reaches the buyer once they've paid.
 *   file     — we host a zip, we serve a signed URL   (html, wordpress)
 *   link     — seller supplies a duplicate/share link (framer, webflow)
 *   external — redeem on the vendor's own platform    (shopify partner)
 */
export const deliveryType = pgEnum("delivery_type", [
  "file",
  "link",
  "external",
]);

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("buyer"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

/** A seller is a user with a storefront. Solo mode: you are seller #1. */
export const sellerProfiles = pgTable(
  "seller_profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    /** Seller's cut in basis points. 7000 = seller keeps 70%. */
    revenueShareBps: integer("revenue_share_bps").notNull().default(7000),
    payoutMethod: jsonb("payout_method").$type<Record<string, string>>(),
    kycVerified: boolean("kyc_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("seller_slug_idx").on(t.slug)],
);

/* -------------------------------------------------------------------------- */
/* Taxonomy                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The pivot of the whole system. Everything that differs between a static HTML
 * kit and a WordPress theme is a column here, not a branch in application code.
 */
export const platforms = pgTable(
  "platforms",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(), // html | wordpress | shopify | webflow | framer | figma
    name: text("name").notNull(),
    deliveryType: deliveryType("delivery_type").notNull().default("file"),
    /** Can we enforce a licence key against installed sites? */
    supportsLicensing: boolean("supports_licensing").notNull().default(false),
    /** Do we serve an update feed the install can poll? */
    supportsAutoUpdate: boolean("supports_auto_update").notNull().default(false),
    /** Markdown, rendered on the product page under "How to install". */
    installGuide: text("install_guide"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("platforms_slug_idx").on(t.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

/**
 * Groups the same design shipped for several platforms — "Nexus" as an HTML kit
 * and as a WordPress theme. Buyers see one page with variant tabs; you can sell
 * a cross-platform bundle. Cheap to add now, painful to retrofit.
 */
export const productFamilies = pgTable(
  "product_families",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("families_slug_idx").on(t.slug)],
);

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => sellerProfiles.id),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id),
    categoryId: integer("category_id").references(() => categories.id),
    familyId: integer("family_id").references(() => productFamilies.id),

    slug: text("slug").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description"), // markdown
    status: productStatus("status").notNull().default("draft"),

    priceRegular: integer("price_regular").notNull(), // minor units
    priceExtended: integer("price_extended"), // null = no extended licence
    currency: text("currency").notNull().default("INR"),

    thumbnailUrl: text("thumbnail_url"),
    demoUrl: text("demo_url"),
    /** For delivery_type = link/external: what the buyer receives. */
    deliveryPayload: text("delivery_payload"),

    salesCount: integer("sales_count").notNull().default(0),
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_platform_idx").on(t.platformId),
    index("products_status_idx").on(t.status),
  ],
);

export const productGallery = pgTable("product_gallery", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Every release is a row. Buyers always download the latest version their
 * licence entitles them to — never a file glued to the product itself.
 */
export const productVersions = pgTable(
  "product_versions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    version: text("version").notNull(), // semver
    changelog: text("changelog"),
    fileKey: text("file_key"), // object key in R2/S3
    fileSize: integer("file_size"),
    checksum: text("checksum"),
    /** e.g. { "wp": "6.4", "php": "8.1", "woocommerce": true } */
    requirements: jsonb("requirements").$type<Record<string, unknown>>(),
    releasedAt: timestamp("released_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("versions_product_version_idx").on(t.productId, t.version),
  ],
);

/* -------------------------------------------------------------------------- */
/* Commerce                                                                   */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id),
    status: orderStatus("status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("INR"),
    gateway: text("gateway"), // razorpay | lemonsqueezy | stripe
    gatewayRef: text("gateway_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("orders_buyer_idx").on(t.buyerId)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  /** Version at time of purchase — for support and reproducibility. */
  versionId: integer("version_id").references(() => productVersions.id),
  tier: licenseTier("tier").notNull().default("regular"),
  price: integer("price").notNull(),
  /** Seller's share of this line, frozen at purchase time. */
  sellerEarnings: integer("seller_earnings").notNull().default(0),
});

/* -------------------------------------------------------------------------- */
/* Licensing                                                                  */
/* -------------------------------------------------------------------------- */

export const licenses = pgTable(
  "licenses",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    tier: licenseTier("tier").notNull().default("regular"),
    /** null = unlimited (extended licences). */
    maxActivations: integer("max_activations").default(1),
    /**
     * Ownership is perpetual. This is the updates-and-support window only —
     * when it lapses the buyer keeps the files but stops receiving new versions.
     */
    supportedUntil: timestamp("supported_until", { withTimezone: true }),
    status: licenseStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("licenses_key_idx").on(t.key),
    index("licenses_buyer_idx").on(t.buyerId),
  ],
);

export const licenseActivations = pgTable(
  "license_activations",
  {
    id: serial("id").primaryKey(),
    licenseId: integer("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    siteUrl: text("site_url").notNull(),
    status: activationStatus("status").notNull().default("active"),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("activation_site_idx").on(t.licenseId, t.siteUrl)],
);

/** Short-lived, single-purpose download grants. Never expose the object key. */
export const downloadTokens = pgTable(
  "download_tokens",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    licenseId: integer("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    versionId: integer("version_id")
      .notNull()
      .references(() => productVersions.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedCount: integer("used_count").notNull().default(0),
    maxUses: integer("max_uses").notNull().default(5),
  },
  (t) => [uniqueIndex("download_token_idx").on(t.token)],
);

/* -------------------------------------------------------------------------- */
/* Social proof + payouts                                                     */
/* -------------------------------------------------------------------------- */

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(), // 1..5
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("one_review_per_buyer_idx").on(t.productId, t.buyerId)],
);

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id")
    .notNull()
    .references(() => sellerProfiles.id),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  status: payoutStatus("status").notNull().default("scheduled"),
  reference: text("reference"),
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const productsRelations = relations(products, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [products.platformId],
    references: [platforms.id],
  }),
  seller: one(sellerProfiles, {
    fields: [products.sellerId],
    references: [sellerProfiles.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  family: one(productFamilies, {
    fields: [products.familyId],
    references: [productFamilies.id],
  }),
  versions: many(productVersions),
  gallery: many(productGallery),
  reviews: many(reviews),
}));

export const versionsRelations = relations(productVersions, ({ one }) => ({
  product: one(products, {
    fields: [productVersions.productId],
    references: [products.id],
  }),
}));

export const licensesRelations = relations(licenses, ({ one, many }) => ({
  product: one(products, {
    fields: [licenses.productId],
    references: [products.id],
  }),
  buyer: one(users, { fields: [licenses.buyerId], references: [users.id] }),
  activations: many(licenseActivations),
}));

export const sellerRelations = relations(sellerProfiles, ({ one, many }) => ({
  user: one(users, { fields: [sellerProfiles.userId], references: [users.id] }),
  products: many(products),
}));
