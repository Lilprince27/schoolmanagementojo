import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/attendance")({ component: TeacherAttendance });

type Status = "present" | "absent" | "late";

function TeacherAttendance() {
  const { user } = useSession();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const { data: teacher } = useQuery({
    queryKey: ["teacher-me", user?.id], enabled: !!user?.id,
    queryFn: async () => (await supabase.from("teachers").select("id, class_id, classes(name)").eq("profile_id", user!.id).maybeSingle()).data,
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", teacher?.class_id], enabled: !!teacher?.class_id,
    queryFn: async () => (await supabase.from("students").select("id, full_name, school_id").eq("class_id", teacher!.class_id!).order("full_name")).data ?? [],
  });

  const { data: existing } = useQuery({
    queryKey: ["attendance", date, teacher?.class_id], enabled: !!teacher?.class_id,
    queryFn: async () => (await supabase.from("attendance").select("*").eq("date", date).in("student_id", (students ?? []).map((s) => s.id))).data ?? [],
  });

  const [marks, setMarks] = useState<Record<string, Status>>({});
  useEffect(() => {
    const m: Record<string, Status> = {};
    (existing ?? []).forEach((a) => (m[a.student_id] = a.status as Status));
    setMarks(m);
  }, [existing]);

  async function save() {
    if (!user || !students) return;
    const rows = students.map((s) => ({
      student_id: s.id, date, status: (marks[s.id] ?? "present") as Status, recorded_by: user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) return toast.error(error.message);
    const absent = rows.filter((r) => r.status === "absent").length;
    toast.success(`Attendance saved${absent ? ` • ${absent} absent — parents will be notified` : ""}`);
  }

  if (!teacher) return <p className="text-muted-foreground">You are not assigned to a class yet.</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><ClipboardCheck /> Attendance</h1>
          <p className="text-muted-foreground">{(teacher as any).classes?.name ?? "Your class"}</p>
        </div>
        <div className="flex items-end gap-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <Button onClick={save}>Save</Button>
        </div>
      </div>

      <div className="card-soft divide-y divide-border">
        {students?.length === 0 && <p className="p-6 text-center text-muted-foreground">No students in this class.</p>}
        {students?.map((s) => {
          const status = marks[s.id] ?? "present";
          return (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs text-muted-foreground">{s.school_id}</div>
              </div>
              <div className="flex gap-1">
                <Pill active={status === "present"} onClick={() => setMarks({ ...marks, [s.id]: "present" })} color="success"><Check className="h-3 w-3" /> Present</Pill>
                <Pill active={status === "late"} onClick={() => setMarks({ ...marks, [s.id]: "late" })} color="warning"><Clock className="h-3 w-3" /> Late</Pill>
                <Pill active={status === "absent"} onClick={() => setMarks({ ...marks, [s.id]: "absent" })} color="destructive"><X className="h-3 w-3" /> Absent</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: "success" | "warning" | "destructive"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${active ? map[color] + " border-transparent" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
      {children}
    </button>
  );
}
