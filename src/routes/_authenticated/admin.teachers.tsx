import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { registerUser } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserSquare2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/teachers")({ component: AdminTeachers });

function AdminTeachers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => (await supabase.from("teachers").select("*, profiles(full_name,email), classes(name)").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><UserSquare2 /> Teachers</h1>
          <p className="text-muted-foreground">Register class and subject teachers.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add teacher</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Register a teacher</DialogTitle></DialogHeader>
            <TeacherForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["teachers"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Employee ID</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Class</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>}
            {teachers?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No teachers yet.</td></tr>}
            {teachers?.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{t.profiles?.full_name ?? "—"}</td>
                <td className="px-4 py-3">{t.profiles?.email ?? "—"}</td>
                <td className="px-4 py-3">{t.employee_id}</td>
                <td className="px-4 py-3 capitalize">{t.teacher_type.replace("_", " ")}</td>
                <td className="px-4 py-3">{t.classes?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeacherForm({ onDone }: { onDone: () => void }) {
  const register = useServerFn(registerUser);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", employee_id: "", qualification: "",
    teacher_type: "subject_teacher" as "class_teacher" | "subject_teacher", class_id: "",
  });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await register({ data: {
        email: form.email, full_name: form.full_name, phone: form.phone || null,
        role: form.teacher_type,
        teacher: {
          employee_id: form.employee_id,
          qualification: form.qualification || null,
          teacher_type: form.teacher_type,
          class_id: form.class_id || null,
        },
      }});
      toast.success("Teacher created", { description: `Temporary password: ${res.tempPassword}`, duration: 20000 });
      onDone();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Employee ID</Label><Input required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></div>
        <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
        <div><Label>Type</Label>
          <Select value={form.teacher_type} onValueChange={(v: any) => setForm({ ...form, teacher_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="class_teacher">Class teacher</SelectItem>
              <SelectItem value="subject_teacher">Subject teacher</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Assigned class</Label>
          <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create teacher"}</Button></DialogFooter>
    </form>
  );
}
