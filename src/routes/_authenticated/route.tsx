import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles, useProfile } from "@/lib/hooks/use-auth";
import { primaryRole, ROLE_LABELS, isTeacher } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, GraduationCap, UserSquare2, BookOpen, ClipboardCheck,
  FileBarChart, Megaphone, LogOut, School, Baby, Bus
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const { user } = useSession();
  const { data: roles } = useRoles(user?.id);
  const { data: profile } = useProfile(user?.id);
  const role = primaryRole(roles);
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const navItems = buildNav(role);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-sidebar-border">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-bold">EduConnect</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground" }}>
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{profile?.full_name || user?.email}</div>
            <div className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] : "No role"}</div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between px-6 lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-5 w-5 text-primary" /> EduConnect
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function buildNav(role: ReturnType<typeof primaryRole>) {
  const base = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  if (role === "super_admin") {
    return [
      ...base,
      { to: "/admin/students", label: "Students", icon: GraduationCap },
      { to: "/admin/teachers", label: "Teachers", icon: UserSquare2 },
      { to: "/admin/parents", label: "Parents", icon: Users },
      { to: "/admin/classes", label: "Classes & Subjects", icon: School },
      { to: "/transport", label: "School Bus", icon: Bus },
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    ];
  }
  if (role === "transport_manager") {
    return [
      ...base,
      { to: "/transport", label: "School Bus", icon: Bus },
    ];
  }
  if (isTeacher(role)) {
    return [
      ...base,
      { to: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
      { to: "/teacher/results", label: "Results", icon: FileBarChart },
      { to: "/teacher/students", label: "My Students", icon: GraduationCap },
    ];
  }
  if (role === "parent") {
    return [
      ...base,
      { to: "/parent/children", label: "My Children", icon: Baby },
      { to: "/my-bus", label: "My Bus", icon: Bus },
      { to: "/parent/announcements", label: "Announcements", icon: Megaphone },
    ];
  }
  if (role === "student") {
    return [
      ...base,
      { to: "/student/results", label: "My Results", icon: FileBarChart },
      { to: "/student/attendance", label: "My Attendance", icon: ClipboardCheck },
      { to: "/my-bus", label: "My Bus", icon: Bus },
    ];
  }
  return base;
}
