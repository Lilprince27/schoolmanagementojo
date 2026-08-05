import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/flutterwave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["FLUTTERWAVE_SECRET_HASH"];
        const signature = request.headers.get("verif-hash");
        if (!expected || !signature || signature !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const reference: string | undefined =
          payload?.data?.tx_ref ?? payload?.txRef ?? payload?.data?.txRef;
        if (!reference) return new Response("ok (no reference)", { status: 200 });

        try {
          const { settlePaymentByReference } = await import("@/lib/payments-settle.server");
          await settlePaymentByReference(reference);
        } catch (e) {
          console.error("Flutterwave webhook settle failed", reference, e);
          return new Response("Settle failed", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
