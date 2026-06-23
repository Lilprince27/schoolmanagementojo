import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useRoles } from "@/lib/hooks/use-auth";
import { canManageTransport } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bus, Plus, Trash2, Route as RouteIcon, Users, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transport")({ component: TransportPage });

function TransportPage() {
  const { user } = useSession();
  const { data: roles } = useRoles(user?.id);
  const allowed = canManageTransport(roles);

  const { data: school } = useQuery({
    queryKey: ["my-school"],
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id, name").limit(1).maybeSingle();
      return data;
    },
  });

  if (!allowed) {
    return (
      <div className="card-soft p-6">
        <h1 className="text-xl font-bold">Transport</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to manage the school bus program. Ask an administrator for access.
        </p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="card-soft p-6">
        <h1 className="text-xl font-bold">Transport</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create your school first to set up the bus program.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Bus /> School Bus Program</h1>
        <p className="text-muted-foreground">Manage vehicles, routes, student assignments and bus fees.</p>
      </div>
      <Tabs defaultValue="buses">
        <TabsList>
          <TabsTrigger value="buses"><Bus className="h-4 w-4 mr-1" /> Buses</TabsTrigger>
          <TabsTrigger value="routes"><RouteIcon className="h-4 w-4 mr-1" /> Routes</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="h-4 w-4 mr-1" /> Assignments</TabsTrigger>
          <TabsTrigger value="fees"><Wallet className="h-4 w-4 mr-1" /> Fees</TabsTrigger>
        </TabsList>
        <TabsContent value="buses"><BusesTab schoolId={school.id} /></TabsContent>
        <TabsContent value="routes"><RoutesTab schoolId={school.id} /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="fees"><FeesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function BusesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ plate_number: "", model: "", capacity: 30, driver_name: "", driver_phone: "" });
  const { data } = useQuery({
    queryKey: ["buses"],
    queryFn: async () => (await supabase.from("buses").select("*").order("plate_number")).data ?? [],
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("buses").insert({ ...form, school_id: schoolId });
    if (error) return toast.error(error.message);
    toast.success("Bus added");
    setForm({ plate_number: "", model: "", capacity: 30, driver_name: "", driver_phone: "" });
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  async function remove(id: string) {
    if (!confirm("Remove this bus?")) return;
    const { error } = await supabase.from("buses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a bus</h3>
        <div><Label>Plate number</Label><Input required value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} placeholder="e.g. LAG-123-AB" /></div>
        <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Toyota Coaster" /></div>
        <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "0") })} /></div>
        <div><Label>Driver name</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
        <div><Label>Driver phone</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add bus</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr><th className="px-4 py-3 font-medium">Plate</th><th className="px-4 py-3 font-medium">Driver</th><th className="px-4 py-3 font-medium">Capacity</th><th /></tr>
          </thead>
          <tbody>
            {data?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No buses yet.</td></tr>}
            {data?.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{b.plate_number}<div className="text-xs text-muted-foreground">{b.model}</div></td>
                <td className="px-4 py-3">{b.driver_name || "—"}<div className="text-xs text-muted-foreground">{b.driver_phone}</div></td>
                <td className="px-4 py-3">{b.capacity}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Stop = { name: string; time: string };

function RoutesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", bus_id: "", pickup_time: "", dropoff_time: "", monthly_fee: 0, description: "" });
  const [stopsText, setStopsText] = useState("");
  const { data: buses } = useQuery({ queryKey: ["buses"], queryFn: async () => (await supabase.from("buses").select("id,plate_number")).data ?? [] });
  const { data: routes } = useQuery({
    queryKey: ["bus_routes"],
    queryFn: async () => (await supabase.from("bus_routes").select("*, buses(plate_number)").order("name")).data ?? [],
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const stops: Stop[] = stopsText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [name, time] = l.split("|").map((s) => s?.trim() ?? "");
      return { name, time: time || "" };
    });
    const { error } = await supabase.from("bus_routes").insert({
      school_id: schoolId,
      name: form.name,
      bus_id: form.bus_id || null,
      pickup_time: form.pickup_time || null,
      dropoff_time: form.dropoff_time || null,
      monthly_fee: form.monthly_fee,
      description: form.description || null,
      stops: stops as any,
    });
    if (error) return toast.error(error.message);
    toast.success("Route added");
    setForm({ name: "", bus_id: "", pickup_time: "", dropoff_time: "", monthly_fee: 0, description: "" });
    setStopsText("");
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }
  async function remove(id: string) {
    if (!confirm("Remove this route?")) return;
    const { error } = await supabase.from("bus_routes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a route</h3>
        <div><Label>Route name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ikeja Loop" /></div>
        <div><Label>Assigned bus</Label>
          <Select value={form.bus_id} onValueChange={(v) => setForm({ ...form, bus_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choose a bus (optional)" /></SelectTrigger>
            <SelectContent>{buses?.map((b) => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Pickup time</Label><Input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></div>
          <div><Label>Dropoff time</Label><Input type="time" value={form.dropoff_time} onChange={(e) => setForm({ ...form, dropoff_time: e.target.value })} /></div>
        </div>
        <div><Label>Monthly fee (₦)</Label><Input type="number" min={0} value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: parseFloat(e.target.value || "0") })} /></div>
        <div>
          <Label>Stops</Label>
          <Textarea rows={4} value={stopsText} onChange={(e) => setStopsText(e.target.value)} placeholder={"One per line: Stop name | 07:15"} />
          <p className="text-xs text-muted-foreground mt-1">Format: <code>Stop name | HH:MM</code></p>
        </div>
        <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add route</Button>
      </form>
      <div className="space-y-3">
        {routes?.length === 0 && <div className="card-soft p-6 text-center text-muted-foreground text-sm">No routes yet.</div>}
        {routes?.map((r: any) => (
          <div key={r.id} className="card-soft p-5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold">{r.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Bus: {r.buses?.plate_number || "—"} · Pickup {r.pickup_time || "—"} · Drop {r.dropoff_time || "—"} · ₦{Number(r.monthly_fee).toLocaleString()}/mo
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {Array.isArray(r.stops) && r.stops.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {r.stops.map((s: Stop, i: number) => <li key={i}>{s.name}{s.time ? ` — ${s.time}` : ""}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ student_id: "", route_id: "", stop_name: "" });
  const { data: students } = useQuery({ queryKey: ["students-list"], queryFn: async () => (await supabase.from("students").select("id,full_name").order("full_name")).data ?? [] });
  const { data: routes } = useQuery({ queryKey: ["routes-list"], queryFn: async () => (await supabase.from("bus_routes").select("id,name,stops").order("name")).data ?? [] });
  const { data: assigns } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => (await supabase.from("student_bus_assignments").select("*, students(full_name), bus_routes(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const selectedRoute = useMemo(() => routes?.find((r: any) => r.id === form.route_id), [routes, form.route_id]);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("student_bus_assignments").insert({
      student_id: form.student_id, route_id: form.route_id, stop_name: form.stop_name || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Assignment saved");
    setForm({ student_id: "", route_id: "", stop_name: "" });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  }
  async function remove(id: string) {
    if (!confirm("Remove assignment?")) return;
    await supabase.from("student_bus_assignments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["assignments"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Assign student to route</h3>
        <div><Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Route</Label>
          <Select value={form.route_id} onValueChange={(v) => setForm({ ...form, route_id: v, stop_name: "" })}>
            <SelectTrigger><SelectValue placeholder="Pick a route" /></SelectTrigger>
            <SelectContent>{routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Stop</Label>
          {Array.isArray((selectedRoute as any)?.stops) && (selectedRoute as any).stops.length > 0 ? (
            <Select value={form.stop_name} onValueChange={(v) => setForm({ ...form, stop_name: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a stop" /></SelectTrigger>
              <SelectContent>{((selectedRoute as any).stops as Stop[]).map((s, i) => <SelectItem key={i} value={s.name}>{s.name}{s.time ? ` (${s.time})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <Input value={form.stop_name} onChange={(e) => setForm({ ...form, stop_name: e.target.value })} placeholder="Stop name" />
          )}
        </div>
        <Button disabled={!form.student_id || !form.route_id}><Plus className="h-4 w-4 mr-1" /> Assign</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Stop</th><th /></tr></thead>
          <tbody>
            {assigns?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No assignments yet.</td></tr>}
            {assigns?.map((a: any) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{a.students?.full_name}</td>
                <td className="px-4 py-3">{a.bus_routes?.name}</td>
                <td className="px-4 py-3">{a.stop_name || "—"}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ student_id: "", route_id: "", amount: 0, period: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
  const { data: students } = useQuery({ queryKey: ["students-list"], queryFn: async () => (await supabase.from("students").select("id,full_name").order("full_name")).data ?? [] });
  const { data: routes } = useQuery({ queryKey: ["routes-list"], queryFn: async () => (await supabase.from("bus_routes").select("id,name,monthly_fee")).data ?? [] });
  const { data: fees } = useQuery({
    queryKey: ["bus-fees"],
    queryFn: async () => (await supabase.from("bus_fee_payments").select("*, students(full_name), bus_routes(name)").order("created_at", { ascending: false })).data ?? [],
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("bus_fee_payments").insert({
      student_id: form.student_id,
      route_id: form.route_id || null,
      amount: form.amount,
      period: form.period,
      status: form.status,
      note: form.note || null,
      paid_at: form.status === "paid" ? new Date().toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Fee recorded");
    setForm({ student_id: "", route_id: "", amount: 0, period: new Date().toISOString().slice(0, 7), status: "paid", note: "" });
    qc.invalidateQueries({ queryKey: ["bus-fees"] });
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Record a bus fee</h3>
        <div><Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>{students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Route</Label>
          <Select value={form.route_id} onValueChange={(v) => {
            const r: any = routes?.find((x: any) => x.id === v);
            setForm({ ...form, route_id: v, amount: r?.monthly_fee ?? form.amount });
          }}>
            <SelectTrigger><SelectValue placeholder="Pick a route" /></SelectTrigger>
            <SelectContent>{routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Period</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="2026-06" /></div>
          <div><Label>Amount (₦)</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value || "0") })} /></div>
        </div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Note</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        <Button disabled={!form.student_id}><Plus className="h-4 w-4 mr-1" /> Record fee</Button>
      </form>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Period</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {fees?.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No fee records yet.</td></tr>}
            {fees?.map((f: any) => (
              <tr key={f.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{f.students?.full_name}<div className="text-xs text-muted-foreground">{f.bus_routes?.name}</div></td>
                <td className="px-4 py-3">{f.period}</td>
                <td className="px-4 py-3">₦{Number(f.amount).toLocaleString()}</td>
                <td className="px-4 py-3 capitalize">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === "paid" ? "bg-success/15 text-success" : f.status === "overdue" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
