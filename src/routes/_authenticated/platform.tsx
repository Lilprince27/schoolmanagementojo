import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useProfile } from "@/lib/hooks/use-auth";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/hooks/use-membership";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { toast } from "sonner";
import { School, Plus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform")({ component: Platform });

function Platform() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isPlatformAdmin = profile?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL;

  const { data: schools, refetch } = useQuery({
    queryKey: ["platform-schools"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("schools")
        .select("id, name, address, state, lga, country, email, admin_email, admin_profile_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    name: "", address: "", state: "", lga: "", country: "Nigeria", email: "",
  });
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");

  if (profile && !isPlatformAdmin) {
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 0);
    return null;
  }

  async function createSchool() {
    if (!form.name || !form.state || !form.lga) return toast.error("Name, state and LGA are required");
    setCreating(true);
    const code = form.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 12) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const { error } = await supabase.from("schools").insert({
      ...form,
      email: form.email || null,
      code,
      created_by: user!.id,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("School created");
    setForm({ name: "", address: "", state: "", lga: "", country: "Nigeria", email: "" });
    refetch();
  }

  async function assignAdmin(schoolId: string) {
    if (!assignEmail) return;
    const { error } = await supabase.rpc("assign_school_admin", { _school_id: schoolId, _email: assignEmail });
    if (error) return toast.error(error.message);
    toast.success("School administrator assigned. They will manage users for this school.");
    setAssignFor(null);
    setAssignEmail("");
    qc.invalidateQueries({ queryKey: ["platform-schools"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><ShieldCheck /> Platform administration</h1>
        <p className="text-muted-foreground">Create schools and assign a Gmail account as each school's administrator.</p>
      </div>

      <section className="card-soft p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Create a new school</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="School email (optional)"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="State *">
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Local Government Area *"><Input value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="Address / location"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </div>
        <Button onClick={createSchool} disabled={creating}>{creating ? "Creating…" : "Create school"}</Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><School className="h-4 w-4" /> Schools</h2>
        <div className="space-y-3">
          {(schools ?? []).map((s) => (
            <div key={s.id} className="card-soft p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-semibold text-lg">{s.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[s.address, s.lga, s.state, s.country].filter(Boolean).join(" · ")}
                  </div>
                  {s.email && <div className="text-xs text-muted-foreground mt-0.5">{s.email}</div>}
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">School admin: </span>
                    {s.admin_email ? (
                      <span className="font-medium">{s.admin_email}{!s.admin_profile_id && " (not yet signed in)"}</span>
                    ) : <span className="text-destructive">Not assigned</span>}
                  </div>
                </div>
                <div className="min-w-[260px]">
                  {assignFor === s.id ? (
                    <div className="flex gap-2">
                      <Input placeholder="admin@gmail.com" value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)} />
                      <Button size="sm" onClick={() => assignAdmin(s.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssignFor(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setAssignFor(s.id); setAssignEmail(s.admin_email ?? ""); }}>
                      {s.admin_email ? "Change admin" : "Assign admin"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {schools?.length === 0 && (
            <div className="card-soft p-6 text-center text-sm text-muted-foreground">
              No schools yet. Create the first one above.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
