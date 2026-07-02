import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useProfile } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { toast } from "sonner";
import { School, Search, Clock } from "lucide-react";
import type { AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

function Onboarding() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: membership, refetch } = useMembership(user?.id, profile?.email);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("");
  const [lga, setLga] = useState("");

  const { data: schools, isLoading } = useQuery({
    queryKey: ["schools-search", q, state, lga],
    queryFn: async () => {
      let query = supabase.from("schools").select("id, name, address, state, lga, country").order("name");
      if (q) query = query.ilike("name", `%${q}%`);
      if (state) query = query.eq("state", state);
      if (lga) query = query.ilike("lga", `%${lga}%`);
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("parent");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!selected || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("join_requests").insert({
      user_id: user.id,
      school_id: selected,
      requested_role: role,
      message,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent. Your school admin will review it.");
    await qc.invalidateQueries({ queryKey: ["membership"] });
    refetch();
  }

  if (membership?.schoolId) {
    // Already in a school
    setTimeout(() => navigate({ to: "/dashboard", replace: true }), 0);
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><School /> Choose your school</h1>
        <p className="text-muted-foreground">
          Search for your school and send a request to join. The school administrator will approve or reject it.
        </p>
      </div>

      {membership?.hasPendingRequest && (
        <div className="card-soft p-4 flex items-center gap-3 border-primary/40">
          <Clock className="h-5 w-5 text-primary" />
          <div className="text-sm">
            Your request to join <b>{membership.pendingSchoolName}</b> is pending approval.
          </div>
        </div>
      )}

      <div className="card-soft p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label>State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger><SelectValue placeholder="Any state" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any state</SelectItem>
                {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>LGA</Label>
            <Input placeholder="Local government" value={lga} onChange={(e) => setLga(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Search</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="School name" value={q}
                onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border max-h-96 overflow-auto">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Searching…</div>}
          {!isLoading && (schools?.length ?? 0) === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No schools match. Try clearing filters or ask your admin to create the school.
            </div>
          )}
          {(schools ?? []).map((s) => {
            const active = selected === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                className={`w-full text-left p-4 hover:bg-accent transition ${active ? "bg-accent" : ""}`}
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[s.address, s.lga, s.state, s.country].filter(Boolean).join(" · ")}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="card-soft p-5 space-y-3">
          <h2 className="font-semibold">Request to join</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="class_teacher">Class Teacher</SelectItem>
                  <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Note (optional)</Label>
              <Input value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Add any details for the admin" />
            </div>
          </div>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : "Send request"}
          </Button>
        </div>
      )}
    </div>
  );
}
