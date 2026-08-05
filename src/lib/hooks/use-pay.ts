import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { startPayment } from "@/lib/api/payments.functions";

type PayArgs = {
  purpose: "shop" | "transport" | "fees";
  order_id?: string;
  bus_fee_payment_id?: string;
  fee_invoice_id?: string;
};

export function usePay() {
  const start = useServerFn(startPayment);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function pay(args: PayArgs) {
    const id = args.order_id ?? args.bus_fee_payment_id ?? args.fee_invoice_id ?? "x";
    setPendingId(id);
    try {
      const res = await start({ data: args });
      window.location.href = res.link;
    } catch (e) {
      setPendingId(null);
      toast.error(e instanceof Error ? e.message : "Could not start payment");
    }
  }

  return { pay, pendingId, isPending: (id: string) => pendingId === id };
}
