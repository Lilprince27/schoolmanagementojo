import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/results")({ component: () => <StudentSelf kind="results" /> });

export function StudentSelf({ kind }: { kind: "results" | "attendance" }) {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["self-student", user?.id], enabled: !!user?.id,
    queryFn: async () => (await supabase.from("students").select("id, full_name").eq("profile_id", user!.id).maybeSingle()).data,
  });
  const { data: results } = useQuery({
    queryKey: ["my-results", data?.id], enabled: !!data?.id && kind === "results",
    queryFn: async () => (await supabase.from("results").select("*, subjects(name,code), academic_sessions(name,term)").eq("student_id", data!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: attendance } = useQuery({
    queryKey: ["my-attendance", data?.id], enabled: !!data?.id && kind === "attendance",
    queryFn: async () => (await supabase.from("attendance").select("*").eq("student_id", data!.id).order("date", { ascending: false }).limit(60)).data ?? [],
  });

  if (!data) return <p className="text-muted-foreground">No student record linked to your account.</p>;

  if (kind === "results") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><FileBarChart /> My results</h1>
        <div className="card-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr>
              <th className="px-3 py-3 font-medium">Subject</th>
              <th className="px-3 py-3 font-medium">Term</th>
              <th className="px-3 py-3 font-medium">Notes /10</th>
              <th className="px-3 py-3 font-medium">Attd /10</th>
              <th className="px-3 py-3 font-medium">Test /20</th>
              <th className="px-3 py-3 font-medium">Exam /60</th>
              <th className="px-3 py-3 font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Grade</th>
              <th className="px-3 py-3 font-medium">Remark</th>
            </tr></thead>
            <tbody>
              {results?.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No results yet.</td></tr>}
              {results?.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-3 font-medium">{r.subjects?.name}</td>
                  <td className="px-3 py-3 capitalize">{r.term}</td>
                  <td className="px-3 py-3">{r.notes_score}</td>
                  <td className="px-3 py-3">{r.attendance_score}</td>
                  <td className="px-3 py-3">{r.test_score}</td>
                  <td className="px-3 py-3">{r.exam_score}</td>
                  <td className="px-3 py-3 font-semibold">{r.total}</td>
                  <td className="px-3 py-3"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">{r.grade}</span></td>
                  <td className="px-3 py-3 text-muted-foreground">{r.remark ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold flex items-center gap-2"><ClipboardCheck /> My attendance</h1>
      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            {attendance?.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No records yet.</td></tr>}
            {attendance?.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3">{a.date}</td>
                <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: "bg-success/15 text-success", absent: "bg-destructive/15 text-destructive", late: "bg-warning/20 text-warning-foreground",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${map[status]}`}>{status}</span>;
}
