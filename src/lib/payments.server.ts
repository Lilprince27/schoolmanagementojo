const FLW_BASE = "https://api.flutterwave.com/v3";

export type PaymentConfig = {
  mode: "live" | "test";
  key: string | null;
  secretHash: string | null;
  source: "settings" | "env" | "none";
};

/**
 * Resolves the active Flutterwave configuration. Keys saved in the private
 * payment_settings table win; the FLUTTERWAVE_* environment variables are the
 * fallback so existing deployments keep working.
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const envKey = process.env["FLUTTERWAVE_SECRET_KEY"] ?? null;
  const envHash = process.env["FLUTTERWAVE_SECRET_HASH"] ?? null;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("payment_settings")
      .select("mode, live_secret_key, test_secret_key, secret_hash")
      .eq("id", true)
      .maybeSingle();

    if (data) {
      const mode: "live" | "test" = data.mode === "live" ? "live" : "test";
      const key = (mode === "live" ? data.live_secret_key : data.test_secret_key) || null;
      if (key) {
        return { mode, key, secretHash: data.secret_hash || envHash, source: "settings" };
      }
      return {
        mode: envKey ? (/test/i.test(envKey) ? "test" : "live") : mode,
        key: envKey,
        secretHash: data.secret_hash || envHash,
        source: envKey ? "env" : "none",
      };
    }
  } catch {
    /* fall back to env */
  }

  return {
    mode: envKey && /test/i.test(envKey) ? "test" : "live",
    key: envKey,
    secretHash: envHash,
    source: envKey ? "env" : "none",
  };
}

/** The webhook secret hash currently configured (settings first, env fallback). */
export async function getWebhookSecretHash(): Promise<string | null> {
  return (await getPaymentConfig()).secretHash;
}

const TEST_MODE_NOTE =
  "Payments are running in Flutterwave TEST mode, so real bank accounts and real checkouts don't work (test links expire immediately and only the dummy bank 044 / account 0690000031 is accepted). Switch to Live mode in Payments settings and save your live Flutterwave secret key (FLWSECK-…).";

async function flw<T = any>(path: string, init?: RequestInit): Promise<T> {
  const cfg = await getPaymentConfig();
  if (!cfg.key) {
    throw new Error("Payments are not configured yet. Add your Flutterwave secret key in Payments settings.");
  }
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text };
  }
  if (!res.ok || body?.status === "error") {
    if (res.status === 401) {
      throw new Error(
        "Payments are not configured correctly: Flutterwave rejected the secret key. Save a valid secret key in Payments settings.",
      );
    }
    if (cfg.mode === "test") throw new Error(TEST_MODE_NOTE);
    throw new Error(`Flutterwave [${res.status}]: ${body?.message ?? text}`);
  }
  return body as T;
}



export type CreateLinkArgs = {
  txRef: string;
  amount: number;
  redirectUrl: string;
  email: string;
  name: string;
  phone?: string | null;
  title: string;
  description: string;
  logo?: string | null;
  subaccountId?: string | null;
  meta?: Record<string, unknown>;
};

export async function createPaymentLink(args: CreateLinkArgs): Promise<string> {
  if ((await getPaymentConfig()).mode === "test") throw new Error(TEST_MODE_NOTE);
  const payload: Record<string, unknown> = {
    tx_ref: args.txRef,
    amount: Number(args.amount.toFixed(2)),
    currency: "NGN",
    redirect_url: args.redirectUrl,
    payment_options: "card,banktransfer,ussd,account,opay",
    customer: { email: args.email, name: args.name, phonenumber: args.phone ?? undefined },
    customizations: {
      title: args.title,
      description: args.description,
      logo: args.logo ?? undefined,
    },
    meta: args.meta ?? {},
  };
  if (args.subaccountId) {
    payload["subaccounts"] = [{ id: args.subaccountId }];
  }
  const body = await flw<{ data?: { link?: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const link = body?.data?.link;
  if (!link) throw new Error("Flutterwave did not return a payment link");
  return link;
}

export type VerifiedTx = {
  status: string;
  amount: number;
  currency: string;
  txId: string | null;
  channel: string | null;
  txRef: string;
};

export async function verifyByReference(txRef: string): Promise<VerifiedTx> {
  const body = await flw<{ data?: any }>(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
  );
  const d = body?.data ?? {};
  return {
    status: String(d.status ?? "unknown").toLowerCase(),
    amount: Number(d.amount ?? 0),
    currency: String(d.currency ?? "NGN"),
    txId: d.id != null ? String(d.id) : null,
    channel: d.payment_type ?? null,
    txRef: String(d.tx_ref ?? txRef),
  };
}

export async function listBanks(): Promise<Array<{ code: string; name: string }>> {
  const body = await flw<{ data?: Array<{ code: string; name: string }> }>("/banks/NG");
  return (body?.data ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

export type SubaccountArgs = {
  accountBank: string;
  accountNumber: string;
  businessName: string;
  businessEmail: string;
  businessMobile?: string | null;
  platformFeePercent: number;
};

export async function createSubaccount(args: SubaccountArgs): Promise<{ id: string; accountName: string | null }> {
  if ((await getPaymentConfig()).mode === "test") throw new Error(TEST_MODE_NOTE);
  const body = await flw<{ data?: any }>("/subaccounts", {
    method: "POST",
    body: JSON.stringify({
      account_bank: args.accountBank,
      account_number: args.accountNumber,
      business_name: args.businessName,
      business_email: args.businessEmail,
      business_mobile: args.businessMobile ?? undefined,
      country: "NG",
      split_type: "percentage",
      split_value: Math.max(0, Math.min(100, args.platformFeePercent)) / 100,
    }),
  });
  const d = body?.data ?? {};
  const id = d.subaccount_id ?? d.id;
  if (!id) throw new Error("Flutterwave did not return a subaccount id");
  return { id: String(id), accountName: d.full_name ?? d.account_name ?? null };
}
