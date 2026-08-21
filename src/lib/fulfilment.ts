import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  licenses,
  orderItems,
  orders,
  productVersions,
  products,
  sellerProfiles,
} from "@/db/schema";
import { generateLicenseKey } from "@/lib/licenses";
import { splitEarnings } from "@/lib/money";

export interface CartLine {
  productId: number;
  tier: "regular" | "extended";
}

/**
 * Prices are read from the database, never from the client. A cart that posts
 * its own totals is a cart that can be edited in devtools.
 */
export async function priceCart(lines: CartLine[]) {
  if (lines.length === 0) throw new Error("empty_cart");

  const priced = await Promise.all(
    lines.map(async (line) => {
      const [row] = await db
        .select({ product: products, seller: sellerProfiles })
        .from(products)
        .innerJoin(sellerProfiles, eq(sellerProfiles.id, products.sellerId))
        .where(
          and(eq(products.id, line.productId), eq(products.status, "published")),
        )
        .limit(1);

      if (!row) throw new Error(`product_unavailable:${line.productId}`);

      const price =
        line.tier === "extended"
          ? row.product.priceExtended
          : row.product.priceRegular;

      if (price == null) {
        throw new Error(`tier_unavailable:${line.productId}:${line.tier}`);
      }

      const [latest] = await db
        .select()
        .from(productVersions)
        .where(eq(productVersions.productId, row.product.id))
        .orderBy(
          sql`string_to_array(${productVersions.version}, '.')::int[] DESC`,
        )
        .limit(1);

      return {
        product: row.product,
        seller: row.seller,
        versionId: latest?.id ?? null,
        tier: line.tier,
        price,
        sellerEarnings: splitEarnings(price, row.seller.revenueShareBps).seller,
      };
    }),
  );

  const currency = priced[0].product.currency;
  if (priced.some((p) => p.product.currency !== currency)) {
    throw new Error("mixed_currency_cart");
  }

  const subtotal = priced.reduce((sum, p) => sum + p.price, 0);
  return { priced, subtotal, currency };
}

/** Creates a pending order and its items. No licences until payment lands. */
export async function createPendingOrder(buyerId: number, lines: CartLine[]) {
  const { priced, subtotal, currency } = await priceCart(lines);

  const [order] = await db
    .insert(orders)
    .values({
      buyerId,
      status: "pending",
      subtotal,
      tax: 0,
      total: subtotal,
      currency,
      gateway: "razorpay",
    })
    .returning();

  await db.insert(orderItems).values(
    priced.map((p) => ({
      orderId: order.id,
      productId: p.product.id,
      versionId: p.versionId,
      tier: p.tier,
      price: p.price,
      sellerEarnings: p.sellerEarnings,
    })),
  );

  return { order, priced, subtotal, currency };
}

/**
 * Fulfilment. Razorpay retries webhooks, and a buyer refreshing the return page
 * can race the webhook, so this must be safe to call repeatedly:
 *
 *   - an order already marked paid returns its existing licences and stops
 *   - the paid transition is a conditional UPDATE, so only one caller wins
 *   - licences are only minted by the caller that won the transition
 */
export async function fulfilOrder(
  orderId: number,
  gatewayRef?: string,
): Promise<{ licenseIds: number[]; alreadyFulfilled: boolean }> {
  const [current] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!current) throw new Error("unknown_order");

  if (current.status === "paid") {
    const existing = await db
      .select({ id: licenses.id })
      .from(licenses)
      .innerJoin(orderItems, eq(orderItems.id, licenses.orderItemId))
      .where(eq(orderItems.orderId, orderId));

    return { licenseIds: existing.map((l) => l.id), alreadyFulfilled: true };
  }

  // Only the caller that flips pending -> paid gets rows back, and only that
  // caller goes on to mint licences.
  const claimed = await db
    .update(orders)
    .set({ status: "paid", gatewayRef: gatewayRef ?? current.gatewayRef })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning();

  if (claimed.length === 0) {
    const existing = await db
      .select({ id: licenses.id })
      .from(licenses)
      .innerJoin(orderItems, eq(orderItems.id, licenses.orderItemId))
      .where(eq(orderItems.orderId, orderId));

    return { licenseIds: existing.map((l) => l.id), alreadyFulfilled: true };
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const supportedUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000);

  const minted = await db
    .insert(licenses)
    .values(
      items.map((item) => ({
        key: generateLicenseKey(),
        orderItemId: item.id,
        buyerId: current.buyerId,
        productId: item.productId,
        tier: item.tier,
        // Extended licences are unlimited; regular is a single site.
        maxActivations: item.tier === "extended" ? null : 1,
        supportedUntil,
      })),
    )
    .returning({ id: licenses.id });

  await Promise.all(
    items.map((item) =>
      db
        .update(products)
        .set({ salesCount: sql`${products.salesCount} + 1` })
        .where(eq(products.id, item.productId)),
    ),
  );

  return { licenseIds: minted.map((l) => l.id), alreadyFulfilled: false };
}

/** Everything a buyer owns, newest first, for the account page. */
export async function getPurchases(buyerId: number) {
  return db
    .select({
      license: licenses,
      product: products,
      order: orders,
    })
    .from(licenses)
    .innerJoin(products, eq(products.id, licenses.productId))
    .innerJoin(orderItems, eq(orderItems.id, licenses.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(licenses.buyerId, buyerId))
    .orderBy(desc(licenses.createdAt));
}
