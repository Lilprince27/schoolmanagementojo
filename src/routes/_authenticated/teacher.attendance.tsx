import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/attendance")({ component: TeacherAttendance });

type Status = "present" | "absent" | "late";

function TeacherAttendance() {
  const { user } = useSession();
  const { data: membership } = useMembership(user?.id, user?.email);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: teacher } = useQuery({
    queryKey: ["teacher-me", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("teachers").select("id, class_id, school_org_id, classes(name)").eq("profile_id", user!.id).maybeSingle()).data,
  });

  const schoolId = (teacher as any)?.school_org_id ?? membership?.schoolId ?? null;

  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", schoolId],
    enabled: !!schoolId,
    queryFn: async () =>
      (await supabase.from("classes").select("id, name").eq("school_org_id", schoolId!).order("name")).data ?? [],
  });

  useEffect(() => {
    if (classId) return;
    if (teacher?.class_id) setClassId(teacher.class_id);
    else if (classes && classes.length > 0) setClassId(classes[0].id);
  }, [teacher, classes, classId]);

  const { data: students } = useQuery({
    queryKey: ["class-students", classId],
    enabled: !!classId,
    queryFn: async () =>
      (await supabase.from("students").select("id, full_name, school_id").eq("class_id", classId).order("full_name")).data ?? [],
  });

  const studentIds = useMemo(() => (students ?? []).map((s) => s.id), [students]);

  const { data: existing } = useQuery({
    queryKey: ["attendance", date, classId, studentIds.length],
    enabled: !!classId && studentIds.length > 0,
    queryFn: async () =>
      (await supabase.from("attendance").select("*").eq("date", date).in("student_id", studentIds)).data ?? [],
  });

  const [marks, setMarks] = useState<Record<string, Status>>({});
  useEffect(() => {
    const m: Record<string, Status> = {};
    (existing ?? []).forEach((a) => (m[a.student_id] = a.status as Status));
    setMarks(m);
  }, [existing, date, classId]);

  const alreadySubmitted = (existing?.length ?? 0) > 0;
  const counts = (students ?? []).reduce(
    (acc, s) => {
      const st = marks[s.id] ?? "present";
      acc[st] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 } as Record<Status, number>,
  );

  function setAll(status: Status) {
    const m: Record<string, Status> = {};
    (students ?? []).forEach((s) => (m[s.id] = status));
    setMarks(m);
  }

  async function save() {
    if (!user || !students || students.length === 0) return;
    setSaving(true);
    const rows = students.map((s) => ({
      student_id: s.id,
      date,
      status: (marks[s.id] ?? "present") as Status,
      recorded_by: user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["attendance"] });
    qc.invalidateQueries({ queryKey: ["attendance-history"] });
    qc.invalidateQueries({ queryKey: ["admin-attendance"] });
    toast.success(
      `Attendance ${alreadySubmitted ? "updated" : "submitted"}${counts.absent ? ` • ${counts.absent} absent — parents will be notified` : ""}`,
    );
  }

  const className = classes?.find((c) => c.id === classId)?.name ?? "Select a class";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2"><ClipboardCheck /> Attendance</h1>
          <p className="text-muted-foreground">
            {className} · {alreadySubmitted ? "already submitted — you can adjust it" : "not submitted yet"}
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Class</Label>
            <select
              className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date</Label>
            <Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving || !students || students.length === 0}>
            {saving ? "Saving…" : alreadySubmitted ? "Update attendance" : "Submit attendance"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Students" value={students?.length ?? 0} />
        <Stat label="Present" value={counts.present} tone="success" />
        <Stat label="Late" value={counts.late} />
        <Stat label="Absent" value={counts.absent} tone="destructive" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setAll("present")}>Mark all present</Button>
        <Button variant="outline" size="sm" onClick={() => setAll("absent")}>Mark all absent</Button>
      </div>

      <div className="card-soft divide-y divide-border">
        {(!students || students.length === 0) && (
          <p className="p-6 text-center text-muted-foreground">No students in this class.</p>
        )}
        {students?.map((s) => {
          const status = marks[s.id] ?? "present";
          return (
            <div key={s.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
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

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "destructive" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="card-soft p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</div>
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
