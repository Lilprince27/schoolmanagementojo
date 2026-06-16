import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/results")({ component: TeacherResults });

type Entry = { notes: string; attendance: string; test: string; exam: string; remark: string };
const emptyEntry: Entry = { notes: "", attendance: "", test: "", exam: "", remark: "" };

function gradeFor(total: number): string {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
}

function TeacherResults() {
  const { user } = useSession();
  const [subjectId, setSubjectId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [term, setTerm] = useState<"first" | "second" | "third">("first");

  const { data: teacher } = useQuery({
    queryKey: ["teacher-me", user?.id], enabled: !!user?.id,
    queryFn: async () => (await supabase.from("teachers").select("id, class_id").eq("profile_id", user!.id).maybeSingle()).data,
  });

  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await supabase.from("subjects").select("*").order("name")).data ?? [] });
  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const r = (await supabase.from("academic_sessions").select("*").order("name", { ascending: false })).data ?? [];
      const current = r.find((s) => s.is_current);
      if (current && !sessionId) setSessionId(current.id);
      return r;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", teacher?.class_id], enabled: !!teacher?.class_id,
    queryFn: async () => (await supabase.from("students").select("id, full_name, school_id").eq("class_id", teacher!.class_id!).order("full_name")).data ?? [],
  });

  const { data: existing } = useQuery({
    queryKey: ["results", subjectId, sessionId, term, teacher?.class_id],
    enabled: !!subjectId && !!sessionId && !!students && students.length > 0,
    queryFn: async () => (await supabase.from("results").select("*").eq("subject_id", subjectId).eq("session_id", sessionId).eq("term", term).in("student_id", students!.map((s) => s.id))).data ?? [],
  });

  const [scores, setScores] = useState<Record<string, Entry>>({});
  useEffect(() => {
    const m: Record<string, Entry> = {};
    (existing ?? []).forEach((r: any) => (m[r.student_id] = {
      notes: String(r.notes_score ?? ""),
      attendance: String(r.attendance_score ?? ""),
      test: String(r.test_score ?? ""),
      exam: String(r.exam_score ?? ""),
      remark: r.remark ?? "",
    }));
    setScores(m);
  }, [existing]);

  function update(studentId: string, field: keyof Entry, value: string) {
    setScores((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? emptyEntry), [field]: value } }));
  }

  async function save() {
    if (!user || !students || !subjectId || !sessionId) return toast.error("Select subject and session");
    const rows = students
      .filter((s) => {
        const e = scores[s.id];
        return e && (e.notes || e.attendance || e.test || e.exam || e.remark);
      })
      .map((s) => ({
        student_id: s.id, subject_id: subjectId, session_id: sessionId, term,
        notes_score: Number(scores[s.id]?.notes || 0),
        attendance_score: Number(scores[s.id]?.attendance || 0),
        test_score: Number(scores[s.id]?.test || 0),
        exam_score: Number(scores[s.id]?.exam || 0),
        remark: scores[s.id]?.remark || null,
        recorded_by: user.id,
      }));
    if (!rows.length) return toast.error("Enter at least one score");
    const { error } = await supabase.from("results").upsert(rows, { onConflict: "student_id,subject_id,session_id,term" });
    if (error) return toast.error(error.message);
    toast.success("Results saved");
  }

  if (!teacher) return <p className="text-muted-foreground">You are not assigned to a class yet.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><FileBarChart /> Results</h1>
        <p className="text-muted-foreground">Notes /10 · Attendance /10 · Test /20 · Exam /60 — total & grade auto-compute.</p>
      </div>
      <div className="card-soft p-4 grid sm:grid-cols-4 gap-3">
        <div><Label>Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{subjects?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Session</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{sessions?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} • {s.term}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Term</Label>
          <Select value={term} onValueChange={(v: any) => setTerm(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="first">First</SelectItem><SelectItem value="second">Second</SelectItem><SelectItem value="third">Third</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end"><Button className="w-full" onClick={save}>Save results</Button></div>
      </div>

      <div className="card-soft overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="px-3 py-3 font-medium">Student</th>
            <th className="px-2 py-3 font-medium w-20">Notes /10</th>
            <th className="px-2 py-3 font-medium w-20">Attd /10</th>
            <th className="px-2 py-3 font-medium w-20">Test /20</th>
            <th className="px-2 py-3 font-medium w-20">Exam /60</th>
            <th className="px-2 py-3 font-medium w-16">Total</th>
            <th className="px-2 py-3 font-medium w-14">Grade</th>
            <th className="px-2 py-3 font-medium min-w-[160px]">Remark</th>
          </tr></thead>
          <tbody>
            {!subjectId || !sessionId ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Select subject and session.</td></tr> :
              students?.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No students.</td></tr> :
              students?.map((s) => {
                const e = scores[s.id] ?? emptyEntry;
                const n = Number(e.notes || 0), a = Number(e.attendance || 0), t = Number(e.test || 0), x = Number(e.exam || 0);
                const total = n + a + t + x;
                const has = e.notes || e.attendance || e.test || e.exam;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{s.full_name}</td>
                    <td className="px-2 py-2"><Input type="number" min={0} max={10} value={e.notes} onChange={(ev) => update(s.id, "notes", ev.target.value)} /></td>
                    <td className="px-2 py-2"><Input type="number" min={0} max={10} value={e.attendance} onChange={(ev) => update(s.id, "attendance", ev.target.value)} /></td>
                    <td className="px-2 py-2"><Input type="number" min={0} max={20} value={e.test} onChange={(ev) => update(s.id, "test", ev.target.value)} /></td>
                    <td className="px-2 py-2"><Input type="number" min={0} max={60} value={e.exam} onChange={(ev) => update(s.id, "exam", ev.target.value)} /></td>
                    <td className="px-2 py-2 font-semibold">{has ? total : "—"}</td>
                    <td className="px-2 py-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">{has ? gradeFor(total) : "—"}</span></td>
                    <td className="px-2 py-2"><Input placeholder="e.g. Excellent" value={e.remark} onChange={(ev) => update(s.id, "remark", ev.target.value)} /></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
