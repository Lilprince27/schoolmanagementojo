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
import { School, Plus, ShieldCheck, Palette, Image as ImageIcon, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform")({ component: Platform });

const DEFAULT_BRAND = { primary_color: "#4f46e5", secondary_color: "#14b8a6" };

type SchoolForm = {
  name: string; address: string; state: string; lga: string; country: string; email: string;
  primary_color: string; secondary_color: string; motto: string;
  logo_url: string | null; banner_url: string | null;
};

function emptyForm(): SchoolForm {
  return {
    name: "", address: "", state: "", lga: "", country: "Nigeria", email: "",
    primary_color: DEFAULT_BRAND.primary_color, secondary_color: DEFAULT_BRAND.secondary_color,
    motto: "", logo_url: null, banner_url: null,
  };
}

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
        .select("id, name, address, state, lga, country, email, admin_email, admin_profile_id, logo_url, banner_url, primary_color, secondary_color, motto, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState<SchoolForm>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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
      motto: form.motto || null,
      code,
      created_by: user!.id,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("School created");
    setForm(emptyForm());
    refetch();
  }

  async function saveEdit(id: string, patch: Partial<SchoolForm>) {
    const { error } = await supabase.from("schools").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("School updated");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["platform-schools"] });
    qc.invalidateQueries({ queryKey: ["school-branding"] });
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
        <p className="text-muted-foreground">Create schools with their branding, and assign a Gmail account as each school's administrator.</p>
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

        <div className="pt-2 border-t border-border">
          <h3 className="font-semibold flex items-center gap-2 mb-3 mt-2"><Palette className="h-4 w-4" /> Branding</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColorField label="Primary color" value={form.primary_color}
              onChange={(v) => setForm({ ...form, primary_color: v })} />
            <ColorField label="Secondary color" value={form.secondary_color}
              onChange={(v) => setForm({ ...form, secondary_color: v })} />
            <Field label="Motto (optional)">
              <Input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} placeholder="Knowledge, Character, Service" />
            </Field>
            <ImageField label="School logo" value={form.logo_url}
              onChange={(v) => setForm({ ...form, logo_url: v })} />
            <div className="sm:col-span-2">
              <ImageField label="Banner / cover (optional)" value={form.banner_url}
                onChange={(v) => setForm({ ...form, banner_url: v })} wide />
            </div>
          </div>
        </div>

        <Button onClick={createSchool} disabled={creating}>{creating ? "Creating…" : "Create school"}</Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><School className="h-4 w-4" /> Schools</h2>
        <div className="space-y-3">
          {(schools ?? []).map((s: any) => (
            <div key={s.id} className="card-soft p-5">
              <div className="flex items-start gap-4 flex-wrap">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="h-14 w-14 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: s.primary_color || DEFAULT_BRAND.primary_color }}>
                    {s.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-[220px]">
                  <div className="font-semibold text-lg">{s.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[s.address, s.lga, s.state, s.country].filter(Boolean).join(" · ")}
                  </div>
                  {s.motto && <div className="italic text-xs text-muted-foreground mt-0.5">“{s.motto}”</div>}
                  {s.email && <div className="text-xs text-muted-foreground mt-0.5">{s.email}</div>}
                  <div className="mt-2 text-sm flex items-center gap-3 flex-wrap">
                    <span className="text-muted-foreground">Admin: </span>
                    {s.admin_email ? (
                      <span className="font-medium">{s.admin_email}{!s.admin_profile_id && " (not yet signed in)"}</span>
                    ) : <span className="text-destructive">Not assigned</span>}
                    <span className="inline-flex items-center gap-1 text-xs">
                      <span className="h-4 w-4 rounded" style={{ background: s.primary_color || DEFAULT_BRAND.primary_color }} />
                      <span className="h-4 w-4 rounded" style={{ background: s.secondary_color || DEFAULT_BRAND.secondary_color }} />
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[260px]">
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
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(editingId === s.id ? null : s.id)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {editingId === s.id ? "Close" : "Edit branding"}
                  </Button>
                </div>
              </div>

              {editingId === s.id && (
                <EditBranding school={s} onSave={(patch) => saveEdit(s.id, patch)} />
              )}
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

function EditBranding({ school, onSave }: { school: any; onSave: (patch: Partial<SchoolForm>) => void }) {
  const [patch, setPatch] = useState<Partial<SchoolForm>>({
    primary_color: school.primary_color || DEFAULT_BRAND.primary_color,
    secondary_color: school.secondary_color || DEFAULT_BRAND.secondary_color,
    motto: school.motto ?? "",
    logo_url: school.logo_url ?? null,
    banner_url: school.banner_url ?? null,
  });
  return (
    <div className="mt-4 pt-4 border-t border-border grid gap-3 sm:grid-cols-2">
      <ColorField label="Primary color" value={patch.primary_color!} onChange={(v) => setPatch({ ...patch, primary_color: v })} />
      <ColorField label="Secondary color" value={patch.secondary_color!} onChange={(v) => setPatch({ ...patch, secondary_color: v })} />
      <Field label="Motto"><Input value={patch.motto ?? ""} onChange={(e) => setPatch({ ...patch, motto: e.target.value })} /></Field>
      <ImageField label="School logo" value={patch.logo_url ?? null} onChange={(v) => setPatch({ ...patch, logo_url: v })} />
      <div className="sm:col-span-2">
        <ImageField label="Banner / cover" value={patch.banner_url ?? null} onChange={(v) => setPatch({ ...patch, banner_url: v })} wide />
      </div>
      <div className="sm:col-span-2">
        <Button size="sm" onClick={() => onSave(patch)}>Save branding</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange, wide }: { label: string; value: string | null; onChange: (v: string | null) => void; wide?: boolean }) {
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) return toast.error("Image too large. Please use an image under 800 KB.");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className={wide ? "h-16 w-40 object-cover rounded border border-border" : "h-14 w-14 rounded border border-border object-cover"} />
        ) : (
          <div className={`${wide ? "h-16 w-40" : "h-14 w-14"} rounded border border-dashed border-border flex items-center justify-center text-muted-foreground`}>
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Input type="file" accept="image/*" onChange={handle} className="text-xs" />
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
        </div>
      </div>
    </div>
  );
}
