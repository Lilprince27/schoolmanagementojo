import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { usePay } from "@/lib/hooks/use-pay";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { connectSchoolPayout, getNigerianBanks } from "@/lib/api/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Receipt, Banknote, ListChecks, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fees")({ component: FeesPage });

const naira = (n: number | string) => `₦${Number(n).toLocaleString()}`;

function FeesPage() {
  const { user } = useSession();
  const { data: membership, isLoading, isError } = useMembership(user?.id, user?.email);
  const isAdmin = !!membership?.isSchoolAdmin || !!membership?.isPlatformAdmin;
  const schoolId = membership?.schoolId ?? null;

  if (isLoading || !membership) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-muted-foreground">
        Unable to load your school information. Please refresh or contact your school administrator.
      </p>
    );
  }

  if (!schoolId) {
    return (
      <p className="text-muted-foreground">
        {membership.isPlatformAdmin
          ? "Open a school from the Schools area to manage its fees and payouts."
          : "You have not been assigned to a school yet. Please contact your school administrator."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2"><Wallet /> Fees & Payments</h1>
        <p className="text-sm text-muted-foreground">Pay school fees, bus fees and shop orders by card, bank transfer or USSD.</p>
      </div>


      <Tabs defaultValue="invoices">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
          <TabsTrigger value="history"><ListChecks className="h-4 w-4 mr-1" /> Payment history</TabsTrigger>
          {isAdmin && <TabsTrigger value="structures">Fee structures</TabsTrigger>}
          {isAdmin && <TabsTrigger value="payout"><Banknote className="h-4 w-4 mr-1" /> Payout account</TabsTrigger>}
        </TabsList>

        <TabsContent value="invoices"><InvoicesTab schoolId={schoolId} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="history"><HistoryTab schoolId={schoolId} isAdmin={isAdmin} userId={user!.id} /></TabsContent>
        {isAdmin && <TabsContent value="structures"><StructuresTab schoolId={schoolId} userId={user!.id} /></TabsContent>}
        {isAdmin && <TabsContent value="payout"><PayoutTab schoolId={schoolId} /></TabsContent>}
      </Tabs>
    </div>
  );
}

function InvoicesTab({ schoolId, isAdmin }: { schoolId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { pay, isPending } = usePay();
  const [form, setForm] = useState({ student_id: "", fee_structure_id: "", title: "", amount: "", due_date: "" });

  const { data: invoices } = useQuery({
    queryKey: ["fee-invoices", schoolId],
    queryFn: async () =>
      (await supabase.from("fee_invoices").select("*, students(full_name, school_id)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: students } = useQuery({
    queryKey: ["fee-students", schoolId],
    enabled: isAdmin,
    queryFn: async () => (await supabase.from("students").select("id, full_name").eq("school_org_id", schoolId).order("full_name")).data ?? [],
  });

  const { data: structures } = useQuery({
    queryKey: ["fee-structures", schoolId],
    queryFn: async () => (await supabase.from("fee_structures").select("*").eq("school_id", schoolId).eq("is_active", true).order("name")).data ?? [],
  });

  async function raise() {
    const structure = structures?.find((s: any) => s.id === form.fee_structure_id);
    const title = form.title || structure?.name;
    const amount = Number(form.amount || structure?.amount || 0);
    if (!form.student_id || !title || !(amount > 0)) return toast.error("Student, title and amount are required");
    const { error } = await supabase.from("fee_invoices").insert({
      school_id: schoolId,
      student_id: form.student_id,
      fee_structure_id: form.fee_structure_id || null,
      title,
      amount,
      due_date: form.due_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Invoice raised");
    setForm({ student_id: "", fee_structure_id: "", title: "", amount: "", due_date: "" });
    qc.invalidateQueries({ queryKey: ["fee-invoices", schoolId] });
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="card-soft p-5 space-y-3">
          <h3 className="font-semibold">Raise an invoice</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Student</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                <option value="">Select student</option>
                {students?.map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Fee structure (optional)</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.fee_structure_id}
                onChange={(e) => {
                  const s = structures?.find((x: any) => x.id === e.target.value);
                  setForm({ ...form, fee_structure_id: e.target.value, title: s?.name ?? form.title, amount: s ? String(s.amount) : form.amount });
                }}>
                <option value="">Custom</option>
                {structures?.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {naira(s.amount)}</option>)}
              </select>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Amount (₦)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <Button onClick={raise}>Raise invoice</Button>
        </div>
      )}

      <div className="space-y-2">
        {invoices?.map((inv: any) => {
          const outstanding = Number(inv.amount) - Number(inv.amount_paid ?? 0);
          return (
            <div key={inv.id} className="card-soft p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold truncate">{inv.title}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.students?.full_name} · {naira(inv.amount)}
                  {Number(inv.amount_paid) > 0 && ` · paid ${naira(inv.amount_paid)}`}
                  {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${inv.status === "paid" ? "bg-success text-success-foreground" : inv.status === "part_paid" ? "bg-warning text-warning-foreground" : "bg-muted"}`}>
                  {inv.status.replace("_", " ")}
                </span>
                {outstanding > 0 && (
                  <Button size="sm" disabled={isPending(inv.id)} onClick={() => pay({ purpose: "fees", fee_invoice_id: inv.id })}>
                    {isPending(inv.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${naira(outstanding)}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {invoices?.length === 0 && <p className="text-muted-foreground text-center py-8">No invoices yet.</p>}
      </div>
    </div>
  );
}

function HistoryTab({ schoolId, isAdmin, userId }: { schoolId: string; isAdmin: boolean; userId: string }) {
  const { data: payments } = useQuery({
    queryKey: ["payments", schoolId, isAdmin ? "all" : userId],
    queryFn: async () => {
      let q = supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200);
      if (!isAdmin) q = q.eq("payer_id", userId);
      return (await q).data ?? [];
    },
  });

  if (!payments || payments.length === 0) return <p className="text-muted-foreground text-center py-8">No payments yet.</p>;

  return (
    <div className="space-y-2">
      {payments.map((p: any) => (
        <div key={p.id} className="card-soft p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-semibold truncate">{p.metadata?.label ?? p.purpose}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{p.reference}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(p.created_at).toLocaleString()}{p.channel && ` · ${p.channel}`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">{naira(p.amount)}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "successful" ? "bg-success text-success-foreground" : p.status === "pending" ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}`}>
              {p.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StructuresTab({ schoolId, userId }: { schoolId: string; userId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", amount: "", class_id: "", term: "" });

  const { data: list } = useQuery({
    queryKey: ["fee-structures-manage", schoolId],
    queryFn: async () => (await supabase.from("fee_structures").select("*, classes(name)").eq("school_id", schoolId).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: classes } = useQuery({
    queryKey: ["fee-classes", schoolId],
    queryFn: async () => (await supabase.from("classes").select("id, name").eq("school_org_id", schoolId).order("name")).data ?? [],
  });

  async function add() {
    if (!form.name || !form.amount) return toast.error("Name and amount are required");
    const { error } = await supabase.from("fee_structures").insert({
      school_id: schoolId,
      name: form.name,
      description: form.description || null,
      amount: Number(form.amount),
      class_id: form.class_id || null,
      term: (form.term || null) as any,
      created_by: userId,
    });
    if (error) return toast.error(error.message);
    toast.success("Fee added");
    setForm({ name: "", description: "", amount: "", class_id: "", term: "" });
    qc.invalidateQueries({ queryKey: ["fee-structures-manage", schoolId] });
    qc.invalidateQueries({ queryKey: ["fee-structures", schoolId] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this fee?")) return;
    await supabase.from("fee_structures").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fee-structures-manage", schoolId] });
    qc.invalidateQueries({ queryKey: ["fee-structures", schoolId] });
  }

  return (
    <div className="space-y-6">
      <div className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a fee</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Name</Label><Input placeholder="Tuition — First Term" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Amount (₦)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div>
            <Label>Class (optional)</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">All classes</option>
              {classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Term (optional)</Label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
              <option value="">Any</option>
              <option value="first">First</option>
              <option value="second">Second</option>
              <option value="third">Third</option>
            </select>
          </div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <Button onClick={add}>Add fee</Button>
      </div>

      <div className="space-y-2">
        {list?.map((f: any) => (
          <div key={f.id} className="card-soft p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground">
                {naira(f.amount)}{f.classes?.name && ` · ${f.classes.name}`}{f.term && ` · ${f.term} term`}
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => remove(f.id)}>Delete</Button>
          </div>
        ))}
        {list?.length === 0 && <p className="text-muted-foreground text-center py-6">No fees defined yet.</p>}
      </div>
    </div>
  );
}

function PayoutTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const banks = useServerFn(getNigerianBanks);
  const connect = useServerFn(connectSchoolPayout);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bank_code: "", account_number: "", business_email: "", business_mobile: "" });

  const { data: school } = useQuery({
    queryKey: ["school-payout", schoolId],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("school_payout_info", { _school_id: schoolId });
      return (Array.isArray(data) ? data[0] : data) ?? null;
    },
  });

  const { data: bankList, isLoading: banksLoading, error: banksError } = useQuery({
    queryKey: ["ng-banks"],
    queryFn: () => banks({}),
    staleTime: 1000 * 60 * 60,
  });

  async function save() {
    if (!form.bank_code || !form.account_number || !form.business_email) return toast.error("Bank, account number and email are required");
    setSaving(true);
    try {
      const res = await connect({ data: { school_id: schoolId, ...form, business_mobile: form.business_mobile || undefined } });
      toast.success(`Payout account connected${res.account_name ? ` — ${res.account_name}` : ""}`);
      qc.invalidateQueries({ queryKey: ["school-payout", schoolId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect payout account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      {school?.flw_subaccount_id ? (
        <div className="card-soft p-5">
          <div className="text-sm text-muted-foreground">Payouts are going to</div>
          <div className="font-semibold">{school.payout_account_name ?? school.payout_account_number}</div>
          <div className="text-xs text-muted-foreground font-mono">{school.payout_account_number}</div>
          <p className="text-xs text-muted-foreground mt-2">
            Every payment made in this school settles directly into this account. Submit the form below to change it.
          </p>
        </div>
      ) : (
        <div className="card-soft p-5 text-sm text-muted-foreground">
          No payout account yet. Connect your school's bank account so payments settle to you automatically.
        </div>
      )}

      <div className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">School bank account</h3>
        <div>
          <Label>Bank</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })}>
            <option value="">{banksLoading ? "Loading banks…" : "Select bank"}</option>
            {bankList?.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          {banksError && <p className="text-xs text-destructive mt-1">Could not load banks — check the payment keys.</p>}
        </div>
        <div><Label>Account number</Label><Input inputMode="numeric" maxLength={10} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, "") })} /></div>
        <div><Label>Business email</Label><Input type="email" value={form.business_email} onChange={(e) => setForm({ ...form, business_email: e.target.value })} /></div>
        <div><Label>Business phone (optional)</Label><Input value={form.business_mobile} onChange={(e) => setForm({ ...form, business_mobile: e.target.value })} /></div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Connect payout account
        </Button>
      </div>
    </div>
  );
}
