import { verifyByReference } from "./payments.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/**
 * Verifies a transaction with Flutterwave and, when successful, marks the
 * payment and its linked record (shop order, bus fee, fee invoice) as paid.
 * Safe to call repeatedly — already-settled payments are a no-op.
 */
export async function settlePaymentByReference(reference: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as Admin;

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();

  if (!payment) return { ok: false as const, status: "unknown", message: "Payment not found" };
  if (payment.status === "successful") return { ok: true as const, status: "successful", payment };

  const tx = await verifyByReference(reference);
  const paid =
    tx.status === "successful" && Number(tx.amount) >= Number(payment.amount) && tx.currency === "NGN";

  if (!paid) {
    await admin
      .from("payments")
      .update({ status: tx.status === "successful" ? "mismatch" : "failed", provider_tx_id: tx.txId, channel: tx.channel })
      .eq("id", payment.id);
    return { ok: false as const, status: tx.status, message: "Payment was not completed" };
  }

  await admin
    .from("payments")
    .update({
      status: "successful",
      provider_tx_id: tx.txId,
      channel: tx.channel,
      paid_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (payment.order_id) {
    await admin
      .from("shop_orders")
      .update({ payment_status: "paid", status: "processing" })
      .eq("id", payment.order_id);
  }

  if (payment.bus_fee_payment_id) {
    await admin
      .from("bus_fee_payments")
      .update({ status: "paid", paid_at: new Date().toISOString(), method: "flutterwave", reference })
      .eq("id", payment.bus_fee_payment_id);
  }

  if (payment.fee_invoice_id) {
    const { data: inv } = await admin
      .from("fee_invoices")
      .select("amount, amount_paid")
      .eq("id", payment.fee_invoice_id)
      .maybeSingle();
    if (inv) {
      const nextPaid = Number(inv.amount_paid ?? 0) + Number(payment.amount);
      await admin
        .from("fee_invoices")
        .update({
          amount_paid: nextPaid,
          status: nextPaid >= Number(inv.amount) ? "paid" : "part_paid",
        })
        .eq("id", payment.fee_invoice_id);
    }
  }

  return { ok: true as const, status: "successful", payment };
}
