import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/attendance")({
  component: AdminAttendance,
});

function AdminAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState<string>("all");

  const { data: classes } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => (await supabase.from("classes").select("id, name").order("name")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: ["admin-attendance", date, classId],
    queryFn: async () => {
      const q = supabase
        .from("attendance")
        .select("id, status, date, student_id, students!inner(full_name, school_id, class_id, classes(name))")
        .eq("date", date);
      const { data, error } = await q;
      if (error) throw error;
      const list = data ?? [];
      return classId === "all"
        ? list
        : list.filter((r: any) => r.students?.class_id === classId);
    },
  });

  const total = rows?.length ?? 0;
  const present = rows?.filter((r: any) => r.status === "present").length ?? 0;
  const absent = rows?.filter((r: any) => r.status === "absent").length ?? 0;
  const late = rows?.filter((r: any) => r.status === "late").length ?? 0;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><ClipboardCheck /> Attendance</h1>
          <p className="text-muted-foreground">School-wide attendance overview (read-only)</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Class</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="all">All classes</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Marked" value={total} />
        <Stat label="Present" value={present} tone="success" />
        <Stat label="Absent" value={absent} tone="destructive" />
        <Stat label="Attendance rate" value={`${rate}%`} tone="primary" />
      </div>

      <div className="card-soft divide-y divide-border">
        {(!rows || rows.length === 0) && (
          <p className="p-6 text-center text-muted-foreground">No attendance recorded for this date.</p>
        )}
        {rows?.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{r.students?.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {r.students?.school_id} · {r.students?.classes?.name ?? "—"}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              r.status === "present" ? "bg-success text-success-foreground"
                : r.status === "late" ? "bg-warning text-warning-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}>{r.status}</span>
          </div>
        ))}
      </div>
      {late > 0 && <p className="text-xs text-muted-foreground">{late} student(s) marked late.</p>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "success" | "destructive" | "primary" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "";
  return (
    <div className="card-soft p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
