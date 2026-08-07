import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/routes/_authenticated/student.results";

export type AttendanceStudent = { id: string; full_name: string; class_name?: string | null };

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Read-only attendance history with student/class and date filters. No edit controls. */
export function AttendanceHistory({
  students,
  title = "Attendance",
  subtitle,
}: {
  students: AttendanceStudent[];
  title?: string;
  subtitle?: string;
}) {
  const [studentId, setStudentId] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[],
    [students],
  );

  const visible = useMemo(
    () =>
      students.filter(
        (s) =>
          (classFilter === "all" || s.class_name === classFilter) &&
          (studentId === "all" || s.id === studentId),
      ),
    [students, classFilter, studentId],
  );

  const ids = visible.map((s) => s.id);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["attendance-history", ids.join(","), from, to],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, date, status, student_id")
        .in("student_id", ids)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameOf = (id: string) => students.find((s) => s.id === id)?.full_name ?? "—";
  const total = rows?.length ?? 0;
  const present = rows?.filter((r) => r.status === "present").length ?? 0;
  const absent = rows?.filter((r) => r.status === "absent").length ?? 0;
  const late = rows?.filter((r) => r.status === "late").length ?? 0;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="card-soft p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {classes.length > 1 && (
          <div>
            <Label>Class</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setStudentId("all");
              }}
            >
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        {students.length > 1 && (
          <div>
            <Label>Student</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="all">All</option>
              {students
                .filter((s) => classFilter === "all" || s.class_name === classFilter)
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
            </select>
          </div>
        )}
        <div>
          <Label>From</Label>
          <Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="Days recorded" value={total} />
        <Stat label="Present" value={present} tone="success" />
        <Stat label="Absent" value={absent} tone="destructive" />
        <Stat label="Attendance rate" value={`${rate}%`} tone="primary" />
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              {students.length > 1 && <th className="px-4 py-3 font-medium">Student</th>}
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(isLoading || ids.length === 0 || total === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  {isLoading ? "Loading…" : "No attendance records for this period."}
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{r.date}</td>
                {students.length > 1 && <td className="px-4 py-3">{nameOf(r.student_id)}</td>}
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {late > 0 && <p className="text-xs text-muted-foreground">{late} day(s) marked late.</p>}
      <p className="text-xs text-muted-foreground">This view is read-only. Only teachers and administrators can record or adjust attendance.</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "destructive" | "primary" }) {
  const color =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "";
  return (
    <div className="card-soft p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
