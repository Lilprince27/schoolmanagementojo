import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { registerUser, linkParentStudent } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Users, Link as LinkIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/parents")({ component: AdminParents });

function AdminParents() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState<null | string>(null);

  const { data: parents, isLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => (await supabase.from("parents").select("*, profiles(full_name,email,phone), parent_students(student_id, students(full_name,school_id))").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><Users /> Parents</h1>
          <p className="text-muted-foreground">Register parents and link them to their children.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add parent</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Register a parent</DialogTitle></DialogHeader>
            <ParentForm onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["parents"] }); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th><th className="px-4 py-3 font-medium">Children</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>}
            {parents?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No parents yet.</td></tr>}
            {parents?.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{p.profiles?.full_name}</td>
                <td className="px-4 py-3">{p.profiles?.email}</td>
                <td className="px-4 py-3">{p.profiles?.phone ?? "—"}</td>
                <td className="px-4 py-3">{p.parent_students?.length ? p.parent_students.map((ps: any) => ps.students?.full_name).join(", ") : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setLinkOpen(p.id)}><LinkIcon className="h-3 w-3 mr-1" /> Link child</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!linkOpen} onOpenChange={(o) => !o && setLinkOpen(null)}>
        <DialogContent><DialogHeader><DialogTitle>Link a child to this parent</DialogTitle></DialogHeader>
          {linkOpen && <LinkForm parentId={linkOpen} onDone={() => { setLinkOpen(null); qc.invalidateQueries({ queryKey: ["parents"] }); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParentForm({ onDone }: { onDone: () => void }) {
  const register = useServerFn(registerUser);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", occupation: "", address: "" });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await register({ data: {
        email: form.email, full_name: form.full_name, phone: form.phone || null, role: "parent",
        parent: { occupation: form.occupation || null, address: form.address || null },
      }});
      toast.success("Parent registered", { description: `Temporary password: ${res.tempPassword}`, duration: 20000 });
      onDone();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); } finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><Label>Email</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
        <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      </div>
      <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create parent"}</Button></DialogFooter>
    </form>
  );
}

function LinkForm({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const link = useServerFn(linkParentStudent);
  const [studentId, setStudentId] = useState("");
  const { data: students } = useQuery({ queryKey: ["students-all"], queryFn: async () => (await supabase.from("students").select("id,full_name,school_id").order("full_name")).data ?? [] });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { await link({ data: { parent_id: parentId, student_id: studentId } }); toast.success("Linked"); onDone(); }
    catch (err: any) { toast.error(err?.message ?? "Failed"); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Student</Label>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
          <SelectContent>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.school_id})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DialogFooter><Button type="submit" disabled={!studentId}>Link</Button></DialogFooter>
    </form>
  );
}
