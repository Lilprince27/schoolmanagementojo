import { createFileRoute, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, GraduationCap } from "lucide-react";
import { StatusBadge } from "./student.results";
import { useSchoolBranding } from "@/lib/hooks/use-branding";

export const Route = createFileRoute("/_authenticated/student/$id")({ component: StudentDetail });

function StudentDetail() {
  const { id } = useParams({ from: "/_authenticated/student/$id" });
  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => (await supabase.from("students").select("*, classes(name), academic_sessions(name,term)").eq("id", id).maybeSingle()).data,
  });
  const { data: attendance } = useQuery({
    queryKey: ["student-att", id],
    queryFn: async () => (await supabase.from("attendance").select("*").eq("student_id", id).order("date", { ascending: false }).limit(60)).data ?? [],
  });
  const { data: results } = useQuery({
    queryKey: ["student-results", id],
    queryFn: async () => (await supabase.from("results").select("*, subjects(name,code), academic_sessions(name,term)").eq("student_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  if (!student) return <p className="text-muted-foreground">Loading…</p>;

  const att = attendance ?? [];
  const present = att.filter((a) => a.status === "present").length;
  const absent = att.filter((a) => a.status === "absent").length;
  const late = att.filter((a) => a.status === "late").length;

  return (
    <div className="space-y-6">
      <div className="card-soft p-6 flex items-center gap-4">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><GraduationCap /></span>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{student.full_name}</h1>
          <p className="text-sm text-muted-foreground">{student.school_id} • {(student as any).classes?.name ?? "No class"} • {(student as any).academic_sessions?.name ?? "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="report">Report card</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="Present" value={present} tone="success" />
            <Stat label="Absent" value={absent} tone="destructive" />
            <Stat label="Late" value={late} tone="warning" />
          </div>
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <div className="card-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Status</th></tr></thead>
              <tbody>
                {att.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No records.</td></tr>}
                {att.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3">{a.date}</td><td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="results" className="mt-4">
          <ResultsTable results={results ?? []} />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <ReportCard student={student} results={results ?? []} present={present} absent={absent} late={late} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "success" | "destructive" | "warning" }) {
  const map = { success: "text-success", destructive: "text-destructive", warning: "text-warning-foreground" };
  return (
    <div className="card-soft p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold ${map[tone]}`}>{value}</div>
    </div>
  );
}

function ResultsTable({ results }: { results: any[] }) {
  return (
    <div className="card-soft overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
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
          {results.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No results.</td></tr>}
          {results.map((r) => (
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
  );
}

function ReportCard({ student, results, present, absent, late }: { student: any; results: any[]; present: number; absent: number; late: number }) {
  const [term, setTerm] = useState<"first" | "second" | "third">("first");
  const filtered = results.filter((r) => r.term === term);
  const totals = filtered.reduce((a, r) => a + Number(r.total), 0);
  const avg = filtered.length ? (totals / filtered.length).toFixed(1) : "—";
  const overall = filtered.length ? (totals / filtered.length >= 70 ? "A" : totals / filtered.length >= 60 ? "B" : totals / filtered.length >= 50 ? "C" : totals / filtered.length >= 45 ? "D" : totals / filtered.length >= 40 ? "E" : "F") : "—";

  return (
    <div>
      <div className="no-print flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Term:</span>
          <Select value={term} onValueChange={(v: any) => setTerm(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="first">First</SelectItem><SelectItem value="second">Second</SelectItem><SelectItem value="third">Third</SelectItem></SelectContent>
          </Select>
        </div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print / Save PDF</Button>
      </div>

      <div className="bg-white text-slate-900 rounded-2xl border border-border p-10 print:rounded-none print:border-0 print:p-12 print:shadow-none shadow-pop max-w-4xl mx-auto">
        <div className="text-center border-b-2 border-slate-200 pb-4">
          <h1 className="text-3xl font-extrabold">EduConnect Academy</h1>
          <p className="text-slate-500">Student Report Card</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <Field label="Student" value={student.full_name} />
          <Field label="School ID" value={student.school_id} />
          <Field label="Class" value={student.classes?.name ?? "—"} />
          <Field label="Session" value={student.academic_sessions?.name ?? "—"} />
          <Field label="Term" value={term} capitalize />
          <Field label="Date issued" value={new Date().toLocaleDateString()} />
        </div>

        <h2 className="mt-8 mb-2 font-bold text-lg">Subject scores</h2>
        <table className="w-full text-xs border border-slate-200">
          <thead className="bg-slate-50 text-left"><tr>
            <th className="px-2 py-2 border-b border-slate-200">Subject</th>
            <th className="px-2 py-2 border-b border-slate-200">Notes /10</th>
            <th className="px-2 py-2 border-b border-slate-200">Attd /10</th>
            <th className="px-2 py-2 border-b border-slate-200">Test /20</th>
            <th className="px-2 py-2 border-b border-slate-200">Exam /60</th>
            <th className="px-2 py-2 border-b border-slate-200">Total /100</th>
            <th className="px-2 py-2 border-b border-slate-200">Grade</th>
            <th className="px-2 py-2 border-b border-slate-200">Remark</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-6 text-slate-400">No results for this term.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-2 font-medium">{r.subjects?.name}</td>
                <td className="px-2 py-2">{r.notes_score}</td>
                <td className="px-2 py-2">{r.attendance_score}</td>
                <td className="px-2 py-2">{r.test_score}</td>
                <td className="px-2 py-2">{r.exam_score}</td>
                <td className="px-2 py-2 font-semibold">{r.total}</td>
                <td className="px-2 py-2 font-bold">{r.grade}</td>
                <td className="px-2 py-2 text-slate-600">{r.remark ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
          <SummaryRow label="Total" value={totals || "—"} />
          <SummaryRow label="Average" value={avg} />
          <SummaryRow label="Overall grade" value={overall} />
          <SummaryRow label="Attendance" value={`${present} P • ${absent} A • ${late} L`} />
        </div>
        <div className="grid grid-cols-2 gap-6 mt-8 text-sm">
          <div><div className="text-slate-500">Class teacher's remark</div><div className="mt-2 border-b border-slate-300 pb-6">{overall === "A" || overall === "B" ? "Excellent performance. Keep it up!" : overall === "C" ? "Good effort. Continue to work hard." : "Needs improvement. More effort required."}</div></div>
          <div><div className="text-slate-500">Principal's remark</div><div className="mt-2 border-b border-slate-300 pb-6">An admirable term. We are proud of you.</div></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, capitalize }: { label: string; value: any; capitalize?: boolean }) {
  return (
    <div><div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div><div className={`font-medium ${capitalize ? "capitalize" : ""}`}>{value}</div></div>
  );
}
function SummaryRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between bg-slate-50 px-3 py-2 rounded"><span className="text-slate-500">{label}</span><span className="font-bold">{value}</span></div>
  );
}
