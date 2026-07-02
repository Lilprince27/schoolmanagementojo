import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles, useProfile } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { primaryRole, ROLE_LABELS, isTeacher } from "@/lib/roles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, GraduationCap, UserSquare2, ClipboardCheck, FileBarChart, Megaphone, Check, X, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: roles, isLoading, isFetching, refetch } = useRoles(user?.id);
  const { data: membership } = useMembership(user?.id, profile?.email);
  const role = primaryRole(roles);
  const isAdminView = membership?.isSchoolAdmin || membership?.isPlatformAdmin || role === "super_admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
        <p className="text-muted-foreground">
          {membership?.isPlatformAdmin ? "Platform administrator" : role ? ROLE_LABELS[role] : isLoading ? "…" : "Awaiting approval"}
          {membership?.schoolName && ` · ${membership.schoolName}`}
        </p>
      </div>

      {isAdminView && membership?.schoolId && <JoinRequestsPanel schoolId={membership.schoolId} />}
      {role === "super_admin" && <AdminDashboard />}
      {isTeacher(role) && <TeacherDashboard userId={user!.id} />}
      {role === "parent" && <ParentDashboard userId={user!.id} />}
      {role === "student" && <StudentDashboard userId={user!.id} />}
      {!role && !isLoading && (
        <div className="card-soft p-6">
          <h2 className="font-semibold">Access role is still being set up</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If your administrator role was just added, refresh access to open your portal.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isFetching ? "Refreshing…" : "Refresh access"}
          </button>
        </div>
      )}
    </div>
  );
}

function JoinRequestsPanel({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const { data: requests, refetch } = useQuery({
    queryKey: ["join-requests", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from("join_requests")
        .select("id, requested_role, message, created_at, user_id, profiles:user_id(full_name, email)")
        .eq("school_id", schoolId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function act(id: string, approve: boolean) {
    const fn = approve ? "approve_join_request" : "reject_join_request";
    const { error } = await supabase.rpc(fn, { _request_id: id });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    refetch();
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  if (!requests || requests.length === 0) return null;

  return (
    <div className="card-soft p-5">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <Inbox className="h-4 w-4" /> Pending join requests
        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{requests.length}</span>
      </h2>
      <div className="divide-y divide-border">
        {requests.map((r: any) => (
          <div key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">{r.profiles?.full_name || r.profiles?.email || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">
                {r.profiles?.email} · wants to join as <b>{ROLE_LABELS[r.requested_role as keyof typeof ROLE_LABELS] ?? r.requested_role}</b>
                {r.message && ` · "${r.message}"`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => act(r.id, true)}><Check className="h-4 w-4 mr-1" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => act(r.id, false)}><X className="h-4 w-4 mr-1" /> Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: students }, { count: teachers }, { count: parents }, { count: classes }, attendanceRows] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("parents").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("attendance").select("status").gte("date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
      ]);
      const att = attendanceRows.data ?? [];
      const present = att.filter((a) => a.status === "present").length;
      const rate = att.length ? Math.round((present / att.length) * 100) : 0;
      return { students: students ?? 0, teachers: teachers ?? 0, parents: parents ?? 0, classes: classes ?? 0, rate };
    },
  });
  const items = [
    { label: "Students", value: stats?.students ?? "—", icon: GraduationCap },
    { label: "Teachers", value: stats?.teachers ?? "—", icon: UserSquare2 },
    { label: "Parents", value: stats?.parents ?? "—", icon: Users },
    { label: "Classes", value: stats?.classes ?? "—", icon: Megaphone },
    { label: "Attendance (7d)", value: stats ? `${stats.rate}%` : "—", icon: ClipboardCheck },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((s) => (
        <div key={s.label} className="card-soft p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <s.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-extrabold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function TeacherDashboard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["teacher-dash", userId],
    queryFn: async () => {
      const { data: teacher } = await supabase.from("teachers").select("id, class_id").eq("profile_id", userId).maybeSingle();
      if (!teacher) return { students: 0, today: 0 };
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: students }, { count: today_marked }] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("class_id", teacher.class_id ?? "00000000-0000-0000-0000-000000000000"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today),
      ]);
      return { students: students ?? 0, today: today_marked ?? 0 };
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="Class students" value={data?.students ?? "—"} icon={GraduationCap} />
      <Stat label="Marked today" value={data?.today ?? "—"} icon={ClipboardCheck} />
      <Stat label="Open results to enter" value={"—"} icon={FileBarChart} />
    </div>
  );
}

function ParentDashboard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["parent-dash", userId],
    queryFn: async () => {
      const { data: parent } = await supabase.from("parents").select("id").eq("profile_id", userId).maybeSingle();
      if (!parent) return { children: 0 };
      const { count } = await supabase.from("parent_students").select("id", { count: "exact", head: true }).eq("parent_id", parent.id);
      return { children: count ?? 0 };
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="My children" value={data?.children ?? "—"} icon={GraduationCap} />
    </div>
  );
}

function StudentDashboard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["student-dash", userId],
    queryFn: async () => {
      const { data: student } = await supabase.from("students").select("id").eq("profile_id", userId).maybeSingle();
      if (!student) return { results: 0, attendance: 0 };
      const [{ count: results }, { count: attendance }] = await Promise.all([
        supabase.from("results").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("student_id", student.id),
      ]);
      return { results: results ?? 0, attendance: attendance ?? 0 };
    },
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Stat label="Results recorded" value={data?.results ?? "—"} icon={FileBarChart} />
      <Stat label="Attendance days" value={data?.attendance ?? "—"} icon={ClipboardCheck} />
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="card-soft p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
