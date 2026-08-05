import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function appOrigin(): string {
  const req = getRequest();
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${forwardedHost ?? url.host}`;
}

export const getNigerianBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listBanks } = await import("@/lib/payments.server");
    return listBanks();
  });

/** School admin connects the school's bank account as a Flutterwave subaccount. */
export const connectSchoolPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        school_id: z.string().uuid(),
        bank_code: z.string().min(3).max(10),
        account_number: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
        business_email: z.string().email(),
        business_mobile: z.string().max(20).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("is_school_admin", {
      _user_id: context.userId,
      _school_id: data.school_id,
    });
    if (!allowed) throw new Error("Only the school administrator can set up payouts");

    const { data: school } = await context.supabase
      .from("schools")
      .select("name, platform_fee_percent")
      .eq("id", data.school_id)
      .maybeSingle();
    if (!school) throw new Error("School not found");

    const { createSubaccount } = await import("@/lib/payments.server");
    const sub = await createSubaccount({
      accountBank: data.bank_code,
      accountNumber: data.account_number,
      businessName: school.name,
      businessEmail: data.business_email,
      businessMobile: data.business_mobile ?? null,
      platformFeePercent: Number(school.platform_fee_percent ?? 0),
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("schools")
      .update({
        flw_subaccount_id: sub.id,
        payout_bank_code: data.bank_code,
        payout_account_number: data.account_number,
        payout_account_name: sub.accountName,
      })
      .eq("id", data.school_id);
    if (error) throw new Error(error.message);

    return { ok: true, subaccount_id: sub.id, account_name: sub.accountName };
  });

/** Creates a Flutterwave checkout for a shop order, bus fee or school fee invoice. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        purpose: z.enum(["shop", "transport", "fees"]),
        order_id: z.string().uuid().optional(),
        bus_fee_payment_id: z.string().uuid().optional(),
        fee_invoice_id: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    let amount = 0;
    let schoolId: string | null = null;
    let label = "";

    if (data.purpose === "shop") {
      if (!data.order_id) throw new Error("Missing order");
      const { data: order } = await supabase
        .from("shop_orders")
        .select("id, total, school_id, buyer_id, payment_status")
        .eq("id", data.order_id)
        .maybeSingle();
      if (!order) throw new Error("Order not found");
      if (order.buyer_id !== context.userId) throw new Error("Forbidden");
      if (order.payment_status === "paid") throw new Error("This order is already paid");
      amount = Number(order.total);
      schoolId = order.school_id;
      label = `Shop order #${order.id.slice(0, 8)}`;
    } else if (data.purpose === "transport") {
      if (!data.bus_fee_payment_id) throw new Error("Missing bus fee");
      const { data: fee } = await supabase
        .from("bus_fee_payments")
        .select("id, amount, status, student_id, students(school_org_id, full_name)")
        .eq("id", data.bus_fee_payment_id)
        .maybeSingle();
      if (!fee) throw new Error("Bus fee not found");
      if (fee.status === "paid") throw new Error("This bus fee is already paid");
      amount = Number(fee.amount);
      schoolId = (fee as any).students?.school_org_id ?? null;
      label = `Bus fee — ${(fee as any).students?.full_name ?? "student"}`;
    } else {
      if (!data.fee_invoice_id) throw new Error("Missing invoice");
      const { data: inv } = await supabase
        .from("fee_invoices")
        .select("id, title, amount, amount_paid, school_id, status")
        .eq("id", data.fee_invoice_id)
        .maybeSingle();
      if (!inv) throw new Error("Invoice not found");
      const outstanding = Number(inv.amount) - Number(inv.amount_paid ?? 0);
      if (outstanding <= 0) throw new Error("This invoice is already settled");
      amount = outstanding;
      schoolId = inv.school_id;
      label = inv.title;
    }

    if (!schoolId) throw new Error("Could not determine the school for this payment");
    if (!(amount > 0)) throw new Error("Nothing to pay");

    const { data: school } = await supabase
      .from("schools")
      .select("name, logo_url, flw_subaccount_id")
      .eq("id", schoolId)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", context.userId)
      .maybeSingle();

    const email = profile?.email ?? (context.claims as any)?.email;
    if (!email) throw new Error("Your account has no email address on file");

    const reference = `SMS-${data.purpose.toUpperCase()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: insertErr } = await supabaseAdmin
      .from("payments")
      .insert({
        school_id: schoolId,
        payer_id: context.userId,
        purpose: data.purpose,
        reference,
        amount,
        status: "pending",
        order_id: data.order_id ?? null,
        bus_fee_payment_id: data.bus_fee_payment_id ?? null,
        fee_invoice_id: data.fee_invoice_id ?? null,
        metadata: { label },
      })
      .select("id")
      .single();
    if (insertErr || !payment) throw new Error(insertErr?.message ?? "Could not create payment");

    const { createPaymentLink } = await import("@/lib/payments.server");
    let link: string;
    try {
      link = await createPaymentLink({
        txRef: reference,
        amount,
        redirectUrl: `${appOrigin()}/payment/callback`,
        email,
        name: profile?.full_name || email,
        phone: profile?.phone ?? null,
        title: school?.name ?? "School payment",
        description: label,
        logo: school?.logo_url ?? null,
        subaccountId: school?.flw_subaccount_id ?? null,
        meta: { payment_id: payment.id, purpose: data.purpose, school_id: schoolId },
      });
    } catch (e) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      throw e;
    }

    await supabaseAdmin.from("payments").update({ payment_link: link }).eq("id", payment.id);
    return { reference, link, amount };
  });

/** Called when Flutterwave redirects the payer back to the app. */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ reference: z.string().min(6).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { settlePaymentByReference } = await import("@/lib/payments-settle.server");
    const result = await settlePaymentByReference(data.reference);
    return { ok: result.ok, status: result.status, message: "message" in result ? result.message : null };
  });
