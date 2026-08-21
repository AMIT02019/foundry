import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { createPendingOrder, type CartLine } from "@/lib/fulfilment";
import { createRazorpayOrder } from "@/lib/razorpay";

/**
 * POST /api/checkout
 * Body: { lines: [{ productId, tier }] }
 *
 * Creates a pending order priced from the database, then a matching Razorpay
 * order. Returns what the client needs to open the payment sheet — never a
 * secret, and never a price the client supplied.
 */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }

  let body: { lines?: CartLine[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const lines = body.lines ?? [];
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }

  try {
    const { order, subtotal, currency } = await createPendingOrder(
      userId,
      lines,
    );

    const gatewayOrder = await createRazorpayOrder({
      amount: subtotal,
      currency,
      receipt: `foundry-${order.id}`,
      notes: { orderId: String(order.id) },
    });

    return NextResponse.json({
      orderId: order.id,
      gatewayOrderId: gatewayOrder.id,
      amount: subtotal,
      currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "checkout_failed";
    const clientFault =
      reason.startsWith("product_unavailable") ||
      reason.startsWith("tier_unavailable") ||
      reason === "mixed_currency_cart" ||
      reason === "empty_cart";

    return NextResponse.json(
      { error: reason },
      { status: clientFault ? 400 : 502 },
    );
  }
}
