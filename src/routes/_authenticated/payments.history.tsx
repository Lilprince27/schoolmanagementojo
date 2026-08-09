import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ListChecks, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payment & payout history — Smart Schools" },
      { name: "description", content: "Every school payment and payout with status, reference, channel and timestamps." },
      { property: "og:title", content: "Payment & payout history — Smart Schools" },
      { property: "og:description", content: "Every school payment and payout with status, reference, channel and timestamps." },
    ],
  }),
  component: PaymentsHistoryPage,
});

const naira = (n: number | string) => `₦${Number(n).toLocaleString()}`;

const STATUS_CLASS: Record<string, string> = {
  successful: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
};

function PaymentsHistoryPage() {
  const { user } = useSession();
  const { data: membership } = useMembership(user?.id, user?.email);
  const isAdmin = !!membership?.isSchoolAdmin || !!membership?.isPlatformAdmin;
  const [status, setStatus] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [q, setQ] = useState("");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments-history", user?.id, isAdmin],
    enabled: !!user?.id,
    queryFn: async () => {
      let query = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500);
      if (!isAdmin) query = query.eq("payer_id", user!.id);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (payments ?? []).filter((p: any) => {
      if (status !== "all" && p.status !== status) return false;
      if (purpose !== "all" && p.purpose !== purpose) return false;
      if (!term) return true;
      return (
        p.reference?.toLowerCase().includes(term) ||
        String(p.metadata?.label ?? "").toLowerCase().includes(term) ||
        String(p.provider_tx_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [payments, status, purpose, q]);

  const totals = useMemo(() => {
    const paid = rows.filter((r: any) => r.status === "successful");
    return {
      count: rows.length,
      settled: paid.reduce((s: number, r: any) => s + Number(r.amount), 0),
      pending: rows.filter((r: any) => r.status === "pending").length,
    };
  }, [rows]);

  function exportCsv() {
    const head = ["Reference", "Purpose", "Description", "Amount", "Status", "Channel", "Provider Tx", "Created", "Paid at"];
    const lines = rows.map((p: any) =>
      [
        p.reference,
        p.purpose,
        String(p.metadata?.label ?? "").replace(/,/g, " "),
        p.amount,
        p.status,
        p.channel ?? "",
        p.provider_tx_id ?? "",
        p.created_at,
        p.paid_at ?? "",
      ].join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><ListChecks /> Payment & payout history</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Every transaction for your school" : "Your transactions"} — status, reference and timestamps.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Transactions" value={String(totals.count)} />
        <Stat label="Settled" value={naira(totals.settled)} />
        <Stat label="Pending" value={String(totals.pending)} />
      </div>

      <div className="card-soft p-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Search</Label>
          <Input placeholder="Reference or description" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="mismatch">Mismatch</option>
          </select>
        </div>
        <div>
          <Label>Type</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="all">All types</option>
            <option value="shop">Shop orders</option>
            <option value="transport">Bus fees</option>
            <option value="fees">School fees</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading transactions…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No transactions match these filters.</p>
      )}

      <div className="space-y-2">
        {rows.map((p: any) => (
          <div key={p.id} className="card-soft p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.metadata?.label ?? p.purpose}</div>
                <div className="text-xs font-mono text-muted-foreground break-all">{p.reference}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{naira(p.amount)}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLASS[p.status] ?? "bg-destructive text-destructive-foreground"}`}>
                  {p.status}
                </span>
              </div>
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Created: {new Date(p.created_at).toLocaleString()}</span>
              <span>Paid: {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</span>
              <span>Channel: {p.channel ?? "—"}</span>
              <span className="break-all">Provider tx: {p.provider_tx_id ?? "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}
