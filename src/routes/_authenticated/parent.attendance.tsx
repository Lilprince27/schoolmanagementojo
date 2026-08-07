import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { AttendanceHistory } from "@/components/attendance-history";

export const Route = createFileRoute("/_authenticated/parent/attendance")({
  component: ParentAttendance,
});

function ParentAttendance() {
  const { user } = useSession();
  const { data: children, isLoading } = useQuery({
    queryKey: ["my-children-attendance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", user!.id).maybeSingle();
      if (!parent) return [];
      const { data } = await supabase
        .from("parent_students")
        .select("students(id, full_name, classes(name))")
        .eq("parent_id", parent.id);
      return (data ?? [])
        .map((d: any) => d.students)
        .filter(Boolean)
        .map((s: any) => ({ id: s.id, full_name: s.full_name, class_name: s.classes?.name ?? null }));
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!children || children.length === 0)
    return <p className="text-muted-foreground">No children are linked to your account yet.</p>;

  return (
    <AttendanceHistory
      title="Attendance"
      subtitle="Your children's attendance history · view only"
      students={children}
    />
  );
}
