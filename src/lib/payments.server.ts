const FLW_BASE = "https://api.flutterwave.com/v3";

function secretKey(): string {
  const key = process.env["FLUTTERWAVE_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured yet. Add your Flutterwave secret key.");
  return key;
}

async function flw<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
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
        "Payments are not configured correctly: Flutterwave rejected the secret key. Ask your administrator to save a valid live/test secret key (FLWSECK-…).",
      );
    }
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
