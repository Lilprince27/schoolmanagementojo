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

  const [scores, setScores] = useState<Record<string, { ca: string; exam: string }>>({});
  useEffect(() => {
    const m: Record<string, { ca: string; exam: string }> = {};
    (existing ?? []).forEach((r) => (m[r.student_id] = { ca: String(r.ca_score), exam: String(r.exam_score) }));
    setScores(m);
  }, [existing]);

  async function save() {
    if (!user || !students || !subjectId || !sessionId) return toast.error("Select subject and session");
    const rows = students
      .filter((s) => scores[s.id]?.ca || scores[s.id]?.exam)
      .map((s) => ({
        student_id: s.id, subject_id: subjectId, session_id: sessionId, term,
        ca_score: Number(scores[s.id]?.ca || 0), exam_score: Number(scores[s.id]?.exam || 0),
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
        <p className="text-muted-foreground">Enter CA (0–40) and exam (0–60). Total & grade compute automatically.</p>
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

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium w-24">CA /40</th>
            <th className="px-4 py-3 font-medium w-24">Exam /60</th>
            <th className="px-4 py-3 font-medium w-20">Total</th>
            <th className="px-4 py-3 font-medium w-16">Grade</th>
          </tr></thead>
          <tbody>
            {!subjectId || !sessionId ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Select subject and session.</td></tr> :
              students?.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No students.</td></tr> :
              students?.map((s) => {
                const ca = Number(scores[s.id]?.ca || 0); const ex = Number(scores[s.id]?.exam || 0);
                const total = ca + ex;
                const grade = total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{s.full_name}</td>
                    <td className="px-4 py-2"><Input type="number" min={0} max={40} value={scores[s.id]?.ca ?? ""} onChange={(e) => setScores({ ...scores, [s.id]: { ca: e.target.value, exam: scores[s.id]?.exam ?? "" } })} /></td>
                    <td className="px-4 py-2"><Input type="number" min={0} max={60} value={scores[s.id]?.exam ?? ""} onChange={(e) => setScores({ ...scores, [s.id]: { ca: scores[s.id]?.ca ?? "", exam: e.target.value } })} /></td>
                    <td className="px-4 py-2 font-semibold">{total || "—"}</td>
                    <td className="px-4 py-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">{(ca || ex) ? grade : "—"}</span></td>
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
