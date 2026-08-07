import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { AttendanceHistory } from "@/components/attendance-history";

export const Route = createFileRoute("/_authenticated/student/attendance")({
  component: StudentAttendance,
});

function StudentAttendance() {
  const { user } = useSession();
  const { data: student, isLoading } = useQuery({
    queryKey: ["self-student", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("students")
          .select("id, full_name, classes(name)")
          .eq("profile_id", user!.id)
          .maybeSingle()
      ).data,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!student) return <p className="text-muted-foreground">No student record linked to your account.</p>;

  return (
    <AttendanceHistory
      title="My attendance"
      subtitle={`${(student as any).classes?.name ?? "Your class"} · view only`}
      students={[{ id: student.id, full_name: student.full_name, class_name: (student as any).classes?.name ?? null }]}
    />
  );
}
