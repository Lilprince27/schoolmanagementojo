import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { confirmPayment } from "@/lib/api/payments.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payment/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { tx_ref?: string; status?: string } => ({
    ...(typeof s.tx_ref === "string" ? { tx_ref: s.tx_ref } : {}),
    ...(typeof s.status === "string" ? { status: s.status } : {}),
  }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const { tx_ref, status } = Route.useSearch();
  const confirm = useServerFn(confirmPayment);
  const qc = useQueryClient();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "success" | "failed">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tx_ref) {
        setState("failed");
        setMessage("No payment reference was returned.");
        return;
      }
      if (status === "cancelled") {
        setState("failed");
        setMessage("You cancelled the payment.");
        return;
      }
      try {
        const res = await confirm({ data: { reference: tx_ref } });
        if (cancelled) return;
        setState(res.ok ? "success" : "failed");
        setMessage(res.ok ? null : (res.message ?? "The payment could not be verified."));
        if (res.ok) {
          qc.invalidateQueries();
          router.invalidate();
        }
      } catch (e) {
        if (cancelled) return;
        setState("failed");
        setMessage(e instanceof Error ? e.message : "Verification failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tx_ref, status, confirm, qc, router]);

  return (
    <div className="max-w-md mx-auto card-soft p-8 text-center space-y-4">
      {state === "checking" && (
        <>
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
          <h1 className="text-xl font-bold">Confirming your payment…</h1>
          <p className="text-sm text-muted-foreground">Please don't close this page.</p>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
          <h1 className="text-2xl font-extrabold">Payment successful</h1>
          <p className="text-sm text-muted-foreground">
            Your receipt reference is <span className="font-mono">{tx_ref}</span>.
          </p>
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-extrabold">Payment not completed</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </>
      )}
      {state !== "checking" && (
        <div className="flex gap-2 justify-center pt-2">
          <Link to="/shop"><Button variant="outline">Back to shop</Button></Link>
          <Link to="/fees"><Button>My payments</Button></Link>
        </div>
      )}
    </div>
  );
}
