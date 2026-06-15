import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/students")({ component: TeacherStudents });

function TeacherStudents() {
  const { user } = useSession();
  const { data: teacher } = useQuery({
    queryKey: ["teacher-me", user?.id], enabled: !!user?.id,
    queryFn: async () => (await supabase.from("teachers").select("id, class_id, classes(name)").eq("profile_id", user!.id).maybeSingle()).data,
  });
  const { data: students } = useQuery({
    queryKey: ["class-students", teacher?.class_id], enabled: !!teacher?.class_id,
    queryFn: async () => (await supabase.from("students").select("*").eq("class_id", teacher!.class_id!).order("full_name")).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><GraduationCap /> My students</h1>
        <p className="text-muted-foreground">{(teacher as any)?.classes?.name ?? "Your class"}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {students?.length === 0 && <p className="text-muted-foreground">No students.</p>}
        {students?.map((s) => (
          <Link key={s.id} to="/student/$id" params={{ id: s.id }} className="card-soft p-5 hover:shadow-pop transition-shadow">
            <div className="font-semibold">{s.full_name}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.school_id} • {s.gender ?? "—"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
