import { createFileRoute, Outlet, redirect, Link, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useRoles, useProfile } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import { useSchoolBranding } from "@/lib/hooks/use-branding";
import { primaryRole, ROLE_LABELS, isTeacher } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, GraduationCap, UserSquare2, ClipboardCheck,
  FileBarChart, Megaphone, LogOut, School, Baby, Bus, ShieldCheck, Inbox, Menu
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
  const { data: membership } = useMembership(user?.id, user?.email ?? profile?.email);
  const role = primaryRole(roles);
  const router = useRouter();
  const location = useLocation();
  const qc = useQueryClient();

  // Route unassigned users to /onboarding (except platform admin)
  useEffect(() => {
    if (!membership) return;
    const path = location.pathname;
    const needsOnboarding = !membership.isPlatformAdmin && !membership.schoolId;
    if (needsOnboarding && path !== "/onboarding") {
      router.navigate({ to: "/onboarding", replace: true });
    }
  }, [membership, location.pathname, router]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const { data: branding } = useSchoolBranding(membership?.schoolId ?? null);
  const navItems = buildNav(role, membership);
  const schoolName = branding?.name ?? membership?.schoolName ?? "EduConnect";
  const logoUrl = branding?.logo_url ?? null;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-sidebar">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-sidebar-border">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
          )}
          <span className="font-bold truncate">{schoolName}</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLinks items={navItems} />
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{profile?.full_name || user?.email}</div>
            <div className="text-xs text-muted-foreground">
              {membership?.isPlatformAdmin ? "Platform Admin" : role ? ROLE_LABELS[role] : "Awaiting approval"}
            </div>
            {membership?.schoolName && (
              <div className="text-xs text-muted-foreground truncate">{membership.schoolName}</div>
            )}
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur flex items-center justify-between px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Open school administration areas</SheetDescription>
              </SheetHeader>
              <div className="h-16 px-5 flex items-center gap-2 border-b border-border">
                {logoUrl ? (
                  <img src={logoUrl} alt={schoolName} className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                )}
                <span className="font-bold truncate">{schoolName}</span>
              </div>
              <nav className="p-3 space-y-1">
                <NavLinks items={navItems} />
              </nav>
              <div className="p-3 border-t border-border">
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Link to={membership?.isPlatformAdmin ? "/platform" : "/dashboard"} className="flex min-w-0 items-center gap-2 font-bold">
            {logoUrl ? <img src={logoUrl} alt="" className="h-6 w-6 rounded object-cover" /> : <GraduationCap className="h-5 w-5 text-primary" />}
            <span className="truncate">{schoolName}</span>
          </Link>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

type NavItem = { to: string; label: string; icon: any };

function NavLinks({ items }: { items: NavItem[] }) {
  return items.map((item) => (
    <Link key={`${item.to}-${item.label}`} to={item.to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
      activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground" }}>
      <item.icon className="h-4 w-4" /> {item.label}
    </Link>
  ));
}

function buildNav(role: ReturnType<typeof primaryRole>, membership: ReturnType<typeof useMembership>["data"]): NavItem[] {
  const base: NavItem[] = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

  if (membership?.isPlatformAdmin) {
    base.push({ to: "/platform", label: "Schools", icon: ShieldCheck });
    return base;
  }

  // Unassigned (not platform admin, no school): only show onboarding
  if (!membership?.isPlatformAdmin && !membership?.schoolId) {
    return [{ to: "/onboarding", label: "Choose your school", icon: School }];
  }

  if (membership?.isSchoolAdmin || role === "super_admin") {
    return [
      ...base,
      { to: "/dashboard", label: "Join requests", icon: Inbox },
      { to: "/admin/students", label: "Students", icon: GraduationCap },
      { to: "/admin/teachers", label: "Teachers", icon: UserSquare2 },
      { to: "/admin/parents", label: "Parents", icon: Users },
      { to: "/admin/classes", label: "Classes & Subjects", icon: School },
      { to: "/transport", label: "School Bus", icon: Bus },
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    ];
  }
  if (role === "transport_manager") {
    return [...base, { to: "/transport", label: "School Bus", icon: Bus }];
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
