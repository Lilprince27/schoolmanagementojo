import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Baby } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/children")({ component: ParentChildren });

function ParentChildren() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["my-children", user?.id], enabled: !!user?.id,
    queryFn: async () => {
      const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", user!.id).maybeSingle();
      if (!parent) return [];
      const { data } = await supabase
        .from("parent_students")
        .select("students(*, classes(name))")
        .eq("parent_id", parent.id);
      return (data ?? []).map((d: any) => d.students).filter(Boolean);
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Baby /> My children</h1>
        <p className="text-muted-foreground">Open each child to view attendance, results and report cards.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.length === 0 && <p className="text-muted-foreground">No children linked yet.</p>}
        {data?.map((s: any) => (
          <Link key={s.id} to="/student/$id" params={{ id: s.id }} className="card-soft p-5 hover:shadow-pop transition-shadow">
            <div className="font-semibold">{s.full_name}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.school_id} • {s.classes?.name ?? "—"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
