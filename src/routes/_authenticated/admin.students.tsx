import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { registerUser, createStudentNoLogin } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: AdminStudents,
});

function AdminStudents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name), academic_sessions(name,term)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><GraduationCap /> Students</h1>
          <p className="text-muted-foreground">Register new students and manage their records.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add student</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Register a student</DialogTitle></DialogHeader>
            <StudentForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["students"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">School ID</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Session</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="px-4 py-6 text-muted-foreground" colSpan={5}>Loading…</td></tr>}
            {students?.length === 0 && <tr><td className="px-4 py-10 text-center text-muted-foreground" colSpan={5}>No students yet. Add your first one.</td></tr>}
            {students?.map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.school_id}</td>
                <td className="px-4 py-3">{s.classes?.name ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{s.gender ?? "—"}</td>
                <td className="px-4 py-3">{s.academic_sessions ? `${s.academic_sessions.name} • ${s.academic_sessions.term}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentForm({ onDone }: { onDone: () => void }) {
  const register = useServerFn(registerUser);
  const createNoLogin = useServerFn(createStudentNoLogin);
  const [withLogin, setWithLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", school_id: "",
    gender: "male" as "male" | "female" | "other",
    date_of_birth: "", class_id: "", session_id: "", address: "", emergency_contact: "",
  });

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [] });
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: async () => (await supabase.from("academic_sessions").select("*").order("name", { ascending: false })).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (withLogin) {
        const res = await register({ data: {
          email: form.email, full_name: form.full_name, phone: form.phone || null, role: "student",
          student: {
            school_id: form.school_id, gender: form.gender,
            date_of_birth: form.date_of_birth || null,
            class_id: form.class_id || null, session_id: form.session_id || null,
            address: form.address || null, emergency_contact: form.emergency_contact || null,
          },
        }});
        toast.success("Student created", { description: `Temporary password: ${res.tempPassword}`, duration: 20000 });
      } else {
        await createNoLogin({ data: {
          full_name: form.full_name, school_id: form.school_id, gender: form.gender,
          date_of_birth: form.date_of_birth || null, class_id: form.class_id || null,
          session_id: form.session_id || null, address: form.address || null,
          emergency_contact: form.emergency_contact || null,
        }});
        toast.success("Student added");
      }
      onDone();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <div>
          <div className="text-sm font-medium">Create a login</div>
          <div className="text-xs text-muted-foreground">Student can sign in to view their records</div>
        </div>
        <Switch checked={withLogin} onCheckedChange={setWithLogin} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>School ID</Label><Input required value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })} /></div>
        <div><Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v: any) => setForm({ ...form, gender: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
        <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
        <div><Label>Class</Label>
          <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Session</Label>
          <Select value={form.session_id} onValueChange={(v) => setForm({ ...form, session_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>{sessions?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} • {s.term}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {withLogin && <>
          <div><Label>Email</Label><Input type="email" required={withLogin} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </>}
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      </div>
      <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create student"}</Button></DialogFooter>
    </form>
  );
}
