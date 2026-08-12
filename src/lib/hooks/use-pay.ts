import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { startPayment } from "@/lib/api/payments.functions";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";

type PayArgs = {
  purpose: "shop" | "transport" | "fees";
  order_id?: string;
  bus_fee_payment_id?: string;
  fee_invoice_id?: string;
};

const CONFIG_HINTS = ["TEST mode", "not configured", "secret key", "Flutterwave ["];

/** Parents/students never see provider configuration details. */
function friendly(message: string, isAdmin: boolean): string {
  const isConfigIssue = CONFIG_HINTS.some((h) => message.includes(h));
  if (!isConfigIssue) return message;
  return isAdmin
    ? message
    : "Payments are temporarily unavailable. Please try again later or contact your school administrator.";
}

export function usePay() {
  const start = useServerFn(startPayment);
  const { user } = useSession();
  const { data: membership } = useMembership(user?.id, user?.email);
  const isAdmin = !!membership?.isSchoolAdmin || !!membership?.isPlatformAdmin;
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function pay(args: PayArgs) {
    const id = args.order_id ?? args.bus_fee_payment_id ?? args.fee_invoice_id ?? "x";
    setPendingId(id);
    try {
      const res = await start({ data: args });
      window.location.href = res.link;
    } catch (e) {
      setPendingId(null);
      const raw = e instanceof Error ? e.message : "Could not start payment";
      toast.error(friendly(raw, isAdmin));
    }
  }

  return { pay, pendingId, isPending: (id: string) => pendingId === id };
}
