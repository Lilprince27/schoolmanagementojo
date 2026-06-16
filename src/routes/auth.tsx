import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — EduConnect" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already signed in, jump straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function goToDashboard() {
    // Wait briefly to be sure the session is persisted before the auth guard checks.
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function assignFirstUserAsAdmin(userId: string) {
    try {
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });
      if ((count ?? 0) === 0) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "super_admin" });
      }
    } catch {
      /* non-fatal */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;

        // With auto-confirm on, signUp returns a session. If not, sign in now.
        let userId = data.user?.id ?? null;
        if (!data.session) {
          const { data: signed, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signErr) throw signErr;
          userId = signed.user?.id ?? userId;
        }
        if (userId) await assignFirstUserAsAdmin(userId);

        toast.success("Account created");
        await goToDashboard();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        await goToDashboard();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (res.error) {
        toast.error(res.error.message ?? "Google sign-in failed");
        return;
      }
      if (!res.redirected) await goToDashboard();
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between gradient-hero p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap /> EduConnect
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">
            Welcome to your school's command center.
          </h2>
          <p className="mt-3 opacity-90">
            Attendance, results, report cards and parent updates — all in one place.
          </p>
        </div>
        <p className="text-xs opacity-80">© {new Date().getFullYear()} EduConnect</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md card-soft p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-bold mb-6">
            <GraduationCap className="h-5 w-5 text-primary" /> EduConnect
          </Link>

          <h1 className="text-2xl font-bold">
            {mode === "signin" ? "Sign in" : "Create your school"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Enter your email and password to continue."
              : "The first account becomes the school administrator."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@school.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="At least 6 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google} disabled={loading}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create a school" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
