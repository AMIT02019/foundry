import { NextResponse } from "next/server";
import { fulfilOrder } from "@/lib/fulfilment";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * POST /api/webhooks/razorpay
 *
 * The only path that marks an order paid. The browser's return page is never
 * trusted for this — a buyer can close the tab, and a tab can be forged.
 *
 * Razorpay retries on any non-2xx, so every branch either fulfils or returns
 * 200 deliberately. Returning 500 on an already-handled event would put us in
 * a retry loop.
 */
export async function POST(request: Request) {
  // Signature is over the exact bytes received — parse only after verifying.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    // Acknowledged and ignored — not an error, so don't invite a retry.
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = Number(payment?.notes?.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ ok: true, ignored: "no_order_reference" });
  }

  try {
    const result = await fulfilOrder(orderId, payment?.id);
    return NextResponse.json({
      ok: true,
      licenses: result.licenseIds.length,
      alreadyFulfilled: result.alreadyFulfilled,
    });
  } catch (error) {
    // A genuine failure — let Razorpay retry.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "fulfilment_failed" },
      { status: 500 },
    );
  }
}
