import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({ component: AdminAnnouncements });

function AdminAnnouncements() {
  const { user } = useSession();
  const { data: membership } = useMembership(user?.id, user?.email);
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", audience: "all" as "all" | "teachers" | "parents" | "students" });
  const { data } = useQuery({ queryKey: ["announcements"], queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!membership?.schoolId) return toast.error("Join or create a school before posting announcements");
    const { error } = await supabase
      .from("announcements")
      .insert({ ...form, created_by: user?.id, school_org_id: membership.schoolId } as any);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted"); setForm({ title: "", body: "", audience: "all" });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Megaphone /> Announcements</h1>
        <p className="text-muted-foreground">Broadcast to the whole school or to a specific group.</p>
      </div>
      <form onSubmit={submit} className="card-soft p-5 space-y-3">
        <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Audience</Label>
          <Select value={form.audience} onValueChange={(v: any) => setForm({ ...form, audience: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem><SelectItem value="teachers">Teachers</SelectItem>
              <SelectItem value="parents">Parents</SelectItem><SelectItem value="students">Students</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Message</Label><Textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <Button>Post announcement</Button>
      </form>
      <div className="space-y-3">
        {data?.length === 0 && <p className="text-center text-muted-foreground py-8">No announcements yet.</p>}
        {data?.map((a) => (
          <div key={a.id} className="card-soft p-5">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{a.title}</h3>
              <span className="text-xs bg-primary-soft text-primary px-2 py-1 rounded-full capitalize">{a.audience}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
