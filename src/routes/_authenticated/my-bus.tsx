import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-auth";
import { usePay } from "@/lib/hooks/use-pay";
import { Button } from "@/components/ui/button";
import { Bus, CreditCard, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-bus")({ component: MyBusPage });

function MyBusPage() {
  const { user } = useSession();
  const { pay, isPending } = usePay();
  const { data, isLoading } = useQuery({
    queryKey: ["my-bus", user?.id],
    queryFn: async () => {
      if (!user) return { assignments: [], fees: [] };
      // Find student ids: either the user IS a student, or via parent_students
      const { data: ownStudent } = await supabase.from("students").select("id, full_name").eq("profile_id", user.id);
      let studentIds = (ownStudent ?? []).map((s) => s.id);
      let studentMap = new Map((ownStudent ?? []).map((s) => [s.id, s.full_name]));
      const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", user.id).maybeSingle();
      if (parent) {
        const { data: links } = await supabase.from("parent_students").select("student_id, students(id, full_name)").eq("parent_id", parent.id);
        (links ?? []).forEach((l: any) => {
          if (l.students) {
            studentIds.push(l.students.id);
            studentMap.set(l.students.id, l.students.full_name);
          }
        });
      }
      if (studentIds.length === 0) return { assignments: [], fees: [], studentMap };
      const [{ data: assignments }, { data: fees }] = await Promise.all([
        supabase.from("student_bus_assignments")
          .select("*, bus_routes(name, pickup_time, dropoff_time, stops, monthly_fee, buses(plate_number, driver_name, driver_phone))")
          .in("student_id", studentIds),
        supabase.from("bus_fee_payments")
          .select("*, bus_routes(name)")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false }),
      ]);
      return { assignments: assignments ?? [], fees: fees ?? [], studentMap };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Bus /> My Bus</h1>
        <p className="text-muted-foreground">Your assigned route, stop and bus fee history.</p>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && (data?.assignments?.length ?? 0) === 0 && (
        <div className="card-soft p-6 text-sm text-muted-foreground">No bus assignment yet. Speak to the school administrator.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.assignments?.map((a: any) => (
          <div key={a.id} className="card-soft p-5 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{data.studentMap?.get(a.student_id)}</div>
            <h3 className="font-semibold text-lg">{a.bus_routes?.name}</h3>
            <div className="text-sm">
              <p>Pickup: <b>{a.bus_routes?.pickup_time || "—"}</b> · Dropoff: <b>{a.bus_routes?.dropoff_time || "—"}</b></p>
              <p>Your stop: <b>{a.stop_name || "—"}</b></p>
              <p>Monthly fee: ₦{Number(a.bus_routes?.monthly_fee ?? 0).toLocaleString()}</p>
            </div>
            {a.bus_routes?.buses && (
              <div className="text-sm border-t border-border pt-2 mt-2">
                <p>Bus: <b>{a.bus_routes.buses.plate_number}</b></p>
                <p>Driver: {a.bus_routes.buses.driver_name || "—"} {a.bus_routes.buses.driver_phone && <a className="text-primary" href={`tel:${a.bus_routes.buses.driver_phone}`}>· {a.bus_routes.buses.driver_phone}</a>}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {(data?.fees?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Bus fee history</h2>
          <div className="card-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Period</th><th className="px-4 py-3 font-medium">Route</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
              <tbody>
                {data!.fees.map((f: any) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-4 py-3">{f.period}</td>
                    <td className="px-4 py-3">{f.bus_routes?.name || "—"}</td>
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
      )}
    </div>
  );
}
