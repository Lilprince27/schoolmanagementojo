import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, School } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/classes")({ component: AdminClasses });

function AdminClasses() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><School /> Academics</h1>
        <p className="text-muted-foreground">Manage classes, subjects and academic sessions.</p>
      </div>
      <Tabs defaultValue="classes">
        <TabsList><TabsTrigger value="classes">Classes</TabsTrigger><TabsTrigger value="subjects">Subjects</TabsTrigger><TabsTrigger value="sessions">Sessions</TabsTrigger></TabsList>
        <TabsContent value="classes"><ClassesTab /></TabsContent>
        <TabsContent value="subjects"><SubjectsTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ClassesTab() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [level, setLevel] = useState("");
  const { data } = useQuery({ queryKey: ["classes"], queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert({ name, level: level || null });
    if (error) return toast.error(error.message);
    toast.success("Class added"); setName(""); setLevel(""); qc.invalidateQueries({ queryKey: ["classes"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a class</h3>
        <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 5A" /></div>
        <div><Label>Level</Label><Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Primary" /></div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Level</th></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No classes yet.</td></tr>}
            {data?.map((c) => (<tr key={c.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{c.name}</td><td className="px-4 py-3">{c.level ?? "—"}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectsTab() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const { data } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("*").order("name")).data ?? [] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("subjects").insert({ name, code: code || null });
    if (error) return toast.error(error.message);
    toast.success("Subject added"); setName(""); setCode(""); qc.invalidateQueries({ queryKey: ["subjects"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a subject</h3>
        <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" /></div>
        <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MTH" /></div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Code</th></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No subjects yet.</td></tr>}
            {data?.map((s) => (<tr key={s.id} className="border-t border-border"><td className="px-4 py-3 font-medium">{s.name}</td><td className="px-4 py-3">{s.code ?? "—"}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", term: "first" as "first" | "second" | "third", start_date: "", end_date: "" });
  const { data } = useQuery({ queryKey: ["sessions"], queryFn: async () => (await supabase.from("academic_sessions").select("*").order("name", { ascending: false })).data ?? [] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("academic_sessions").insert({ name: form.name, term: form.term, start_date: form.start_date || null, end_date: form.end_date || null });
    if (error) return toast.error(error.message);
    toast.success("Session added"); setForm({ name: "", term: "first", start_date: "", end_date: "" });
    qc.invalidateQueries({ queryKey: ["sessions"] });
  }
  async function makeCurrent(id: string) {
    await supabase.from("academic_sessions").update({ is_current: false }).neq("id", id);
    await supabase.from("academic_sessions").update({ is_current: true }).eq("id", id);
    toast.success("Set as current"); qc.invalidateQueries({ queryKey: ["sessions"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a session</h3>
        <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2025/2026" /></div>
        <div><Label>Term</Label>
          <Select value={form.term} onValueChange={(v: any) => setForm({ ...form, term: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="first">First</SelectItem><SelectItem value="second">Second</SelectItem><SelectItem value="third">Third</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Term</th><th className="px-4 py-3 font-medium"></th></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No sessions.</td></tr>}
            {data?.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.name} {s.is_current && <span className="ml-2 text-xs bg-success/15 text-success px-2 py-0.5 rounded-full">current</span>}</td>
                <td className="px-4 py-3 capitalize">{s.term}</td>
                <td className="px-4 py-3 text-right">{!s.is_current && <Button size="sm" variant="outline" onClick={() => makeCurrent(s.id)}>Set current</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
