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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bus, Plus, Trash2, Route as RouteIcon, Users, Wallet, UserCog, MapPin, Pencil, Archive, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { inviteDriver } from "@/lib/api/transport.functions";

export const Route = createFileRoute("/_authenticated/transport")({ component: TransportPage });

const anySb = supabase as any;

function TransportPage() {
  const { user } = useSession();
  const { data: roles } = useRoles(user?.id);
  const allowed = canManageTransport(roles);

  const { data: school } = useQuery({
    queryKey: ["my-school"],
    queryFn: async () => (await supabase.from("schools").select("id, name").limit(1).maybeSingle()).data,
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
        <p className="text-muted-foreground">Buses, drivers, routes, student assignments, and fees for {school.name}.</p>
      </div>
      <Tabs defaultValue="buses">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="buses"><Bus className="h-4 w-4 mr-1" /> Buses</TabsTrigger>
          <TabsTrigger value="drivers"><UserCog className="h-4 w-4 mr-1" /> Drivers</TabsTrigger>
          <TabsTrigger value="routes"><RouteIcon className="h-4 w-4 mr-1" /> Routes</TabsTrigger>
          <TabsTrigger value="assignments"><Users className="h-4 w-4 mr-1" /> Assignments</TabsTrigger>
          <TabsTrigger value="fees"><Wallet className="h-4 w-4 mr-1" /> Fees</TabsTrigger>
        </TabsList>
        <TabsContent value="buses"><BusesTab schoolId={school.id} /></TabsContent>
        <TabsContent value="drivers"><DriversTab schoolId={school.id} /></TabsContent>
        <TabsContent value="routes"><RoutesTab schoolId={school.id} /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="fees"><FeesTab schoolId={school.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------ BUSES ------------------ */

const emptyBus = {
  plate_number: "", registration_no: "", model: "", vehicle_type: "Bus",
  capacity: 30, color: "", assigned_driver_id: "",
  assistant_name: "", assistant_phone: "",
  gps_enabled: true, insurance_expiry: "", inspection_date: "",
  status: "active",
};

function BusesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyBus);

  const { data: drivers } = useQuery({
    queryKey: ["drivers-list"],
    queryFn: async () => (await anySb.from("drivers").select("id,full_name")).data ?? [],
  });
  const { data: buses } = useQuery({
    queryKey: ["buses"],
    queryFn: async () => (await anySb.from("buses").select("*, drivers:assigned_driver_id(full_name)").order("plate_number")).data ?? [],
  });

  function openNew() { setEditing(null); setForm(emptyBus); setOpen(true); }
  function openEdit(b: any) {
    setEditing(b);
    setForm({
      plate_number: b.plate_number ?? "", registration_no: b.registration_no ?? "",
      model: b.model ?? "", vehicle_type: b.vehicle_type ?? "Bus",
      capacity: b.capacity ?? 30, color: b.color ?? "",
      assigned_driver_id: b.assigned_driver_id ?? "",
      assistant_name: b.assistant_name ?? "", assistant_phone: b.assistant_phone ?? "",
      gps_enabled: b.gps_enabled ?? true,
      insurance_expiry: b.insurance_expiry ?? "", inspection_date: b.inspection_date ?? "",
      status: b.status ?? "active",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      ...form,
      school_id: schoolId,
      assigned_driver_id: form.assigned_driver_id || null,
      insurance_expiry: form.insurance_expiry || null,
      inspection_date: form.inspection_date || null,
    };
    const { error } = editing
      ? await anySb.from("buses").update(payload).eq("id", editing.id)
      : await anySb.from("buses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Bus updated" : "Bus added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  async function archive(id: string) {
    if (!confirm("Archive this bus? It will be hidden from active lists.")) return;
    const { error } = await anySb.from("buses").update({ archived_at: new Date().toISOString(), status: "out_of_service" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this bus permanently?")) return;
    const { error } = await anySb.from("buses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  async function quickStatus(id: string, status: string) {
    const { error } = await anySb.from("buses").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["buses"] });
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add bus</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit bus" : "Register a new bus"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Bus / plate number *</Label><Input required value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} /></div>
              <div><Label>Vehicle registration number</Label><Input value={form.registration_no} onChange={(e) => setForm({ ...form, registration_no: e.target.value })} /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Toyota Coaster" /></div>
              <div><Label>Vehicle type</Label>
                <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Mini-bus">Mini-bus</SelectItem>
                    <SelectItem value="Coaster">Coaster</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value || "0") })} /></div>
              <div><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Yellow" /></div>
              <div><Label>Assigned driver</Label>
                <Select value={form.assigned_driver_id} onValueChange={(v) => setForm({ ...form, assigned_driver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose driver" /></SelectTrigger>
                  <SelectContent>{drivers?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Assistant name</Label><Input value={form.assistant_name} onChange={(e) => setForm({ ...form, assistant_name: e.target.value })} /></div>
              <div><Label>Assistant phone</Label><Input value={form.assistant_phone} onChange={(e) => setForm({ ...form, assistant_phone: e.target.value })} /></div>
              <div><Label>Insurance expiry</Label><Input type="date" value={form.insurance_expiry} onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} /></div>
              <div><Label>Inspection date</Label><Input type="date" value={form.inspection_date} onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.gps_enabled} onChange={(e) => setForm({ ...form, gps_enabled: e.target.checked })} />
                  GPS enabled
                </label>
              </div>
              <DialogFooter className="sm:col-span-2"><Button type="submit">{editing ? "Save changes" : "Add bus"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Bus</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Capacity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Insurance</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {buses?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No buses yet.</td></tr>}
            {buses?.map((b: any) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">
                  {b.plate_number}
                  <div className="text-xs text-muted-foreground">{b.model} · {b.color} · {b.vehicle_type}</div>
                  <div className="text-xs text-muted-foreground">Reg: {b.registration_no || "—"}</div>
                </td>
                <td className="px-4 py-3">{b.drivers?.full_name || <span className="text-muted-foreground">Unassigned</span>}</td>
                <td className="px-4 py-3">{b.capacity}</td>
                <td className="px-4 py-3">
                  <Select value={b.status} onValueChange={(v) => quickStatus(b.id, v)}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="out_of_service">Out of service</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-xs">{b.insurance_expiry || "—"}</td>
                <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => archive(b.id)}><Archive className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ DRIVERS ------------------ */

const emptyDriver = {
  full_name: "", phone: "", email: "", license_no: "", license_expiry: "",
  address: "", emergency_contact: "", assigned_bus_id: "", employment_status: "active", photo_url: "",
};

function DriversTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyDriver);
  const invite = useServerFn(inviteDriver);

  const { data: buses } = useQuery({
    queryKey: ["buses-simple"],
    queryFn: async () => (await anySb.from("buses").select("id,plate_number")).data ?? [],
  });
  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => (await anySb.from("drivers").select("*, buses:assigned_bus_id(plate_number)").order("full_name")).data ?? [],
  });

  function openNew() { setEditing(null); setForm(emptyDriver); setOpen(true); }
  function openEdit(d: any) {
    setEditing(d);
    setForm({ ...emptyDriver, ...d, assigned_bus_id: d.assigned_bus_id ?? "", license_expiry: d.license_expiry ?? "" });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      ...form,
      school_id: schoolId,
      assigned_bus_id: form.assigned_bus_id || null,
      license_expiry: form.license_expiry || null,
    };
    const { data, error } = editing
      ? await anySb.from("drivers").update(payload).eq("id", editing.id).select().single()
      : await anySb.from("drivers").insert(payload).select().single();
    if (error) return toast.error(error.message);
    // Sync assignment onto the bus too
    if (payload.assigned_bus_id) {
      await anySb.from("buses").update({ assigned_driver_id: data?.id ?? editing?.id }).eq("id", payload.assigned_bus_id);
    }
    toast.success(editing ? "Driver updated" : "Driver added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["drivers"] });
    qc.invalidateQueries({ queryKey: ["buses"] });
  }
  async function remove(id: string) {
    if (!confirm("Remove this driver?")) return;
    const { error } = await anySb.from("drivers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["drivers"] });
  }
  async function sendInvite(d: any) {
    if (!d.email) return toast.error("Add an email for this driver first.");
    try {
      const res: any = await invite({ data: { driver_id: d.id, email: d.email, full_name: d.full_name } });
      if (res.tempPassword) {
        toast.success(`Login created. Temp password: ${res.tempPassword}`, { duration: 20000 });
      } else {
        toast.success("Existing account linked to this driver.");
      }
      qc.invalidateQueries({ queryKey: ["drivers"] });
    } catch (e: any) { toast.error(e.message ?? "Invite failed"); }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add driver</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit driver" : "New driver"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email (for driver login)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Driver license number</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} /></div>
              <div><Label>License expiry</Label><Input type="date" value={form.license_expiry} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Emergency contact</Label><Input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} /></div>
              <div><Label>Photo URL</Label><Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Assigned bus</Label>
                <Select value={form.assigned_bus_id} onValueChange={(v) => setForm({ ...form, assigned_bus_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose bus" /></SelectTrigger>
                  <SelectContent>{buses?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Employment status</Label>
                <Select value={form.employment_status} onValueChange={(v) => setForm({ ...form, employment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On leave</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="sm:col-span-2"><Button type="submit">{editing ? "Save changes" : "Add driver"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Bus</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {drivers?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No drivers yet.</td></tr>}
            {drivers?.map((d: any) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {d.photo_url ? <img src={d.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-muted" />}
                    <div>
                      {d.full_name}
                      <div className="text-xs text-muted-foreground capitalize">{d.employment_status.replace("_", " ")}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{d.phone || "—"}<div className="text-xs text-muted-foreground">{d.email}</div></td>
                <td className="px-4 py-3 text-xs">{d.license_no || "—"}<div className="text-muted-foreground">Exp {d.license_expiry || "—"}</div></td>
                <td className="px-4 py-3">{d.buses?.plate_number || "—"}</td>
                <td className="px-4 py-3">
                  {d.profile_id
                    ? <Badge variant="secondary">Linked</Badge>
                    : <Button size="sm" variant="outline" onClick={() => sendInvite(d)}><Send className="h-3 w-3 mr-1" /> Create login</Button>}
                </td>
                <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ ROUTES ------------------ */

function RoutesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", bus_id: "", pickup_time: "", dropoff_time: "", monthly_fee: 0,
    description: "", destination_name: "", destination_lat: "", destination_lng: "",
    distance_km: "", travel_minutes: "",
  });
  const { data: buses } = useQuery({ queryKey: ["buses-simple"], queryFn: async () => (await anySb.from("buses").select("id,plate_number")).data ?? [] });
  const { data: routes } = useQuery({
    queryKey: ["bus_routes"],
    queryFn: async () => (await anySb.from("bus_routes").select("*, buses(plate_number), route_stops(id,name,latitude,longitude,stop_order,pickup_time)").order("name")).data ?? [],
  });

  async function addRoute(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await anySb.from("bus_routes").insert({
      school_id: schoolId,
      name: form.name,
      bus_id: form.bus_id || null,
      pickup_time: form.pickup_time || null,
      dropoff_time: form.dropoff_time || null,
      monthly_fee: form.monthly_fee,
      description: form.description || null,
      destination_name: form.destination_name || null,
      destination_lat: form.destination_lat ? parseFloat(form.destination_lat) : null,
      destination_lng: form.destination_lng ? parseFloat(form.destination_lng) : null,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
      travel_minutes: form.travel_minutes ? parseInt(form.travel_minutes) : null,
      stops: [],
    });
    if (error) return toast.error(error.message);
    toast.success("Route added");
    setForm({ name: "", bus_id: "", pickup_time: "", dropoff_time: "", monthly_fee: 0, description: "", destination_name: "", destination_lat: "", destination_lng: "", distance_km: "", travel_minutes: "" });
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }
  async function removeRoute(id: string) {
    if (!confirm("Remove this route?")) return;
    await anySb.from("bus_routes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={addRoute} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Add a route</h3>
        <div><Label>Route name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Morning Route A" /></div>
        <div><Label>Assigned bus</Label>
          <Select value={form.bus_id} onValueChange={(v) => setForm({ ...form, bus_id: v })}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>{buses?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.plate_number}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Pickup time</Label><Input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></div>
          <div><Label>Dropoff time</Label><Input type="time" value={form.dropoff_time} onChange={(e) => setForm({ ...form, dropoff_time: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Distance (km)</Label><Input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} /></div>
          <div><Label>Travel (mins)</Label><Input type="number" value={form.travel_minutes} onChange={(e) => setForm({ ...form, travel_minutes: e.target.value })} /></div>
        </div>
        <div><Label>Destination name</Label><Input value={form.destination_name} onChange={(e) => setForm({ ...form, destination_name: e.target.value })} placeholder="School Campus" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Destination lat</Label><Input value={form.destination_lat} onChange={(e) => setForm({ ...form, destination_lat: e.target.value })} placeholder="6.5244" /></div>
          <div><Label>Destination lng</Label><Input value={form.destination_lng} onChange={(e) => setForm({ ...form, destination_lng: e.target.value })} placeholder="3.3792" /></div>
        </div>
        <div><Label>Monthly fee (₦)</Label><Input type="number" min={0} value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: parseFloat(e.target.value || "0") })} /></div>
        <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button><Plus className="h-4 w-4 mr-1" /> Add route</Button>
        <p className="text-xs text-muted-foreground">Stops (with lat/lng) can be added to each route below after it is created.</p>
      </form>

      <div className="space-y-3">
        {routes?.length === 0 && <div className="card-soft p-6 text-center text-muted-foreground text-sm">No routes yet.</div>}
        {routes?.map((r: any) => <RouteCard key={r.id} route={r} onDelete={() => removeRoute(r.id)} />)}
      </div>
    </div>
  );
}

function RouteCard({ route, onDelete }: { route: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const [stop, setStop] = useState({ name: "", latitude: "", longitude: "", pickup_time: "" });
  const stops = (route.route_stops || []).sort((a: any, b: any) => a.stop_order - b.stop_order);

  async function addStop(e: React.FormEvent) {
    e.preventDefault();
    const nextOrder = (stops[stops.length - 1]?.stop_order ?? 0) + 1;
    const { error } = await anySb.from("route_stops").insert({
      route_id: route.id,
      name: stop.name,
      latitude: stop.latitude ? parseFloat(stop.latitude) : null,
      longitude: stop.longitude ? parseFloat(stop.longitude) : null,
      pickup_time: stop.pickup_time || null,
      stop_order: nextOrder,
    });
    if (error) return toast.error(error.message);
    setStop({ name: "", latitude: "", longitude: "", pickup_time: "" });
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }
  async function removeStop(id: string) {
    await anySb.from("route_stops").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["bus_routes"] });
  }

  return (
    <div className="card-soft p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold">{route.name}</h4>
          <p className="text-xs text-muted-foreground">
            Bus: {route.buses?.plate_number || "—"} · Pickup {route.pickup_time || "—"} · Drop {route.dropoff_time || "—"} · ₦{Number(route.monthly_fee).toLocaleString()}/mo
          </p>
          {route.destination_name && <p className="text-xs text-muted-foreground">→ {route.destination_name}</p>}
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div>
        <div className="text-xs font-semibold mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Stops ({stops.length})</div>
        {stops.length === 0 && <p className="text-xs text-muted-foreground">No stops yet.</p>}
        <ol className="text-sm space-y-1">
          {stops.map((s: any, i: number) => (
            <li key={s.id} className="flex items-center justify-between text-muted-foreground">
              <span>{i + 1}. <span className="text-foreground">{s.name}</span>{s.pickup_time ? ` · ${s.pickup_time}` : ""}{s.latitude ? ` · ${Number(s.latitude).toFixed(4)},${Number(s.longitude).toFixed(4)}` : ""}</span>
              <Button size="sm" variant="ghost" onClick={() => removeStop(s.id)}><Trash2 className="h-3 w-3" /></Button>
            </li>
          ))}
        </ol>
        <form onSubmit={addStop} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          <Input required placeholder="Stop name" value={stop.name} onChange={(e) => setStop({ ...stop, name: e.target.value })} className="col-span-2" />
          <Input placeholder="Latitude" value={stop.latitude} onChange={(e) => setStop({ ...stop, latitude: e.target.value })} />
          <Input placeholder="Longitude" value={stop.longitude} onChange={(e) => setStop({ ...stop, longitude: e.target.value })} />
          <Input type="time" value={stop.pickup_time} onChange={(e) => setStop({ ...stop, pickup_time: e.target.value })} />
          <Button size="sm" className="col-span-2 sm:col-span-5"><Plus className="h-3 w-3 mr-1" /> Add stop</Button>
        </form>
      </div>
    </div>
  );
}

/* ------------------ ASSIGNMENTS ------------------ */

function AssignmentsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ student_id: "", route_id: "", pickup_stop_id: "", dropoff_stop_id: "", pickup_time: "", seat_number: "" });
  const { data: students } = useQuery({ queryKey: ["students-list"], queryFn: async () => (await anySb.from("students").select("id,full_name").order("full_name")).data ?? [] });
  const { data: routes } = useQuery({ queryKey: ["routes-with-stops"], queryFn: async () => (await anySb.from("bus_routes").select("id,name,route_stops(id,name,stop_order)").order("name")).data ?? [] });
  const { data: assigns } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => (await anySb.from("student_bus_assignments").select("*, students(full_name), bus_routes(name), pickup_stop:pickup_stop_id(name), dropoff_stop:dropoff_stop_id(name)").order("created_at", { ascending: false })).data ?? [],
  });
  const selectedRoute = useMemo(() => routes?.find((r: any) => r.id === form.route_id), [routes, form.route_id]);
  const routeStops = ((selectedRoute as any)?.route_stops ?? []).sort((a: any, b: any) => a.stop_order - b.stop_order);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await anySb.from("student_bus_assignments").insert({
      student_id: form.student_id, route_id: form.route_id,
      pickup_stop_id: form.pickup_stop_id || null,
      dropoff_stop_id: form.dropoff_stop_id || null,
      pickup_time: form.pickup_time || null,
      seat_number: form.seat_number || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Assignment saved");
    setForm({ student_id: "", route_id: "", pickup_stop_id: "", dropoff_stop_id: "", pickup_time: "", seat_number: "" });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  }
  async function remove(id: string) {
    if (!confirm("Remove assignment?")) return;
    await anySb.from("student_bus_assignments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["assignments"] });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      <form onSubmit={add} className="card-soft p-5 space-y-3">
        <h3 className="font-semibold">Assign student to route</h3>
        <div><Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
            <SelectContent>{students?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Route</Label>
          <Select value={form.route_id} onValueChange={(v) => setForm({ ...form, route_id: v, pickup_stop_id: "", dropoff_stop_id: "" })}>
            <SelectTrigger><SelectValue placeholder="Pick a route" /></SelectTrigger>
            <SelectContent>{routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Pickup stop</Label>
            <Select value={form.pickup_stop_id} onValueChange={(v) => setForm({ ...form, pickup_stop_id: v })}>
              <SelectTrigger><SelectValue placeholder="Stop" /></SelectTrigger>
              <SelectContent>{routeStops.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Dropoff stop</Label>
            <Select value={form.dropoff_stop_id} onValueChange={(v) => setForm({ ...form, dropoff_stop_id: v })}>
              <SelectTrigger><SelectValue placeholder="Stop" /></SelectTrigger>
              <SelectContent>{routeStops.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Pickup time</Label><Input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></div>
          <div><Label>Seat #</Label><Input value={form.seat_number} onChange={(e) => setForm({ ...form, seat_number: e.target.value })} /></div>
        </div>
        <Button disabled={!form.student_id || !form.route_id}><Plus className="h-4 w-4 mr-1" /> Assign</Button>
      </form>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Pickup</th><th className="px-4 py-3 font-medium">Dropoff</th><th className="px-4 py-3 font-medium">Seat</th><th /></tr></thead>
          <tbody>
            {assigns?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No assignments yet.</td></tr>}
            {assigns?.map((a: any) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{a.students?.full_name}</td>
                <td className="px-4 py-3">{a.bus_routes?.name}</td>
                <td className="px-4 py-3">{a.pickup_stop?.name || a.stop_name || "—"}<div className="text-xs text-muted-foreground">{a.pickup_time || ""}</div></td>
                <td className="px-4 py-3">{a.dropoff_stop?.name || "—"}</td>
                <td className="px-4 py-3">{a.seat_number || "—"}</td>
                <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------ FEES ------------------ */

function FeesTab({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();

  // Fee rates
  const [rate, setRate] = useState({ route_id: "", session_id: "", term: "First Term", amount: 0 });
  const { data: sessions } = useQuery({ queryKey: ["sessions"], queryFn: async () => (await anySb.from("academic_sessions").select("id,name").order("name", { ascending: false })).data ?? [] });
  const { data: routes } = useQuery({ queryKey: ["routes-list-fees"], queryFn: async () => (await anySb.from("bus_routes").select("id,name,monthly_fee")).data ?? [] });
  const { data: rates } = useQuery({
    queryKey: ["fee-rates"],
    queryFn: async () => (await anySb.from("transport_fee_rates").select("*, bus_routes(name), academic_sessions(name)").order("created_at", { ascending: false })).data ?? [],
  });

  async function addRate(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await anySb.from("transport_fee_rates").upsert({
      school_id: schoolId, route_id: rate.route_id || null, session_id: rate.session_id || null,
      term: rate.term, amount: rate.amount,
    }, { onConflict: "route_id,session_id,term" });
    if (error) return toast.error(error.message);
    toast.success("Fee rate saved");
    setRate({ route_id: "", session_id: "", term: "First Term", amount: 0 });
    qc.invalidateQueries({ queryKey: ["fee-rates"] });
  }
  async function removeRate(id: string) {
    await anySb.from("transport_fee_rates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fee-rates"] });
  }

  // Payments
  const [pay, setPay] = useState({ student_id: "", route_id: "", session_id: "", term: "First Term", amount: 0, method: "bank_transfer", reference: "", status: "paid", period: new Date().toISOString().slice(0, 7) });
  const { data: students } = useQuery({ queryKey: ["students-list"], queryFn: async () => (await anySb.from("students").select("id,full_name").order("full_name")).data ?? [] });
  const { data: fees } = useQuery({
    queryKey: ["bus-fees"],
    queryFn: async () => (await anySb.from("bus_fee_payments").select("*, students(full_name), bus_routes(name)").order("created_at", { ascending: false })).data ?? [],
  });

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    const receipt_no = "TRP-" + Date.now().toString(36).toUpperCase();
    const { error } = await anySb.from("bus_fee_payments").insert({
      student_id: pay.student_id,
      route_id: pay.route_id || null,
      session_id: pay.session_id || null,
      term: pay.term,
      period: pay.period,
      amount: pay.amount,
      method: pay.method,
      reference: pay.reference || null,
      receipt_no,
      status: pay.status,
      paid_at: pay.status === "paid" ? new Date().toISOString() : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded · " + receipt_no);
    setPay({ ...pay, student_id: "", amount: 0, reference: "" });
    qc.invalidateQueries({ queryKey: ["bus-fees"] });
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={addRate} className="card-soft p-5 space-y-3">
          <h3 className="font-semibold">Set transport fee rate</h3>
          <div><Label>Route</Label>
            <Select value={rate.route_id} onValueChange={(v) => {
              const r: any = routes?.find((x: any) => x.id === v);
              setRate({ ...rate, route_id: v, amount: r?.monthly_fee ?? rate.amount });
            }}>
              <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
              <SelectContent>{routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Session</Label>
              <Select value={rate.session_id} onValueChange={(v) => setRate({ ...rate, session_id: v })}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>{sessions?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Term</Label>
              <Select value={rate.term} onValueChange={(v) => setRate({ ...rate, term: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Amount (₦)</Label><Input type="number" min={0} value={rate.amount} onChange={(e) => setRate({ ...rate, amount: parseFloat(e.target.value || "0") })} /></div>
          <Button disabled={!rate.route_id || !rate.term}><Plus className="h-4 w-4 mr-1" /> Save rate</Button>
        </form>

        <div className="card-soft overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">Configured rates</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-2">Route</th><th className="px-4 py-2">Session</th><th className="px-4 py-2">Term</th><th className="px-4 py-2">Amount</th><th /></tr></thead>
            <tbody>
              {rates?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No rates yet.</td></tr>}
              {rates?.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">{r.bus_routes?.name}</td>
                  <td className="px-4 py-2">{r.academic_sessions?.name || "—"}</td>
                  <td className="px-4 py-2">{r.term}</td>
                  <td className="px-4 py-2">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => removeRate(r.id)}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={addPayment} className="card-soft p-5 space-y-3">
          <h3 className="font-semibold">Record a payment</h3>
          <div><Label>Student</Label>
            <Select value={pay.student_id} onValueChange={(v) => setPay({ ...pay, student_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
              <SelectContent>{students?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Route</Label>
              <Select value={pay.route_id} onValueChange={(v) => {
                const r: any = routes?.find((x: any) => x.id === v);
                setPay({ ...pay, route_id: v, amount: r?.monthly_fee ?? pay.amount });
              }}>
                <SelectTrigger><SelectValue placeholder="Route" /></SelectTrigger>
                <SelectContent>{routes?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Session</Label>
              <Select value={pay.session_id} onValueChange={(v) => setPay({ ...pay, session_id: v })}>
                <SelectTrigger><SelectValue placeholder="Session" /></SelectTrigger>
                <SelectContent>{sessions?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Term</Label>
              <Select value={pay.term} onValueChange={(v) => setPay({ ...pay, term: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Period tag</Label><Input value={pay.period} onChange={(e) => setPay({ ...pay, period: e.target.value })} placeholder="2026-06" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (₦)</Label><Input type="number" min={0} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: parseFloat(e.target.value || "0") })} /></div>
            <div><Label>Method</Label>
              <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="paystack">Paystack (online)</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Reference / txn no.</Label><Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={pay.status} onValueChange={(v) => setPay({ ...pay, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!pay.student_id}><Plus className="h-4 w-4 mr-1" /> Record payment</Button>
        </form>

        <div className="card-soft overflow-x-auto">
          <div className="px-4 py-3 border-b border-border font-semibold text-sm">Payment ledger</div>
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-2">Student</th><th className="px-4 py-2">Term</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Method</th><th className="px-4 py-2">Receipt</th><th className="px-4 py-2">Status</th></tr></thead>
            <tbody>
              {fees?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payments yet.</td></tr>}
              {fees?.map((f: any) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{f.students?.full_name}<div className="text-xs text-muted-foreground">{f.bus_routes?.name}</div></td>
                  <td className="px-4 py-2 text-xs">{f.term || "—"}<div className="text-muted-foreground">{f.period}</div></td>
                  <td className="px-4 py-2">₦{Number(f.amount).toLocaleString()}</td>
                  <td className="px-4 py-2 capitalize text-xs">{(f.method || "—").replace("_", " ")}</td>
                  <td className="px-4 py-2 text-xs">{f.receipt_no || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === "paid" ? "bg-success/15 text-success" : f.status === "overdue" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
