import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/announcements")({ component: ParentAnn });

function ParentAnn() {
  const { data } = useQuery({ queryKey: ["announcements"], queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold flex items-center gap-2"><Megaphone /> Announcements</h1>
      <div className="space-y-3">
        {data?.length === 0 && <p className="text-muted-foreground">No announcements yet.</p>}
        {data?.map((a) => (
          <div key={a.id} className="card-soft p-5">
            <h3 className="font-semibold">{a.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
