import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — EduConnect" }] }),
  validateSearch: (s: Record<string, unknown>): { next?: string; mode?: string } => ({
    ...(typeof s.next === "string" ? { next: s.next } : {}),
    ...(typeof s.mode === "string" ? { mode: s.mode } : {}),
  }),
  component: AuthPage,
});

function safeNext(next: string | undefined): string {
  if (!next) return "/dashboard";
  // Only allow same-origin relative paths.
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  
  const { next } = Route.useSearch();
  const target = safeNext(next);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.assign(target);
    });
  }, [target]);

  async function goToTarget() {
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    window.location.assign(target);
  }

  async function google() {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + target,
      });
      if (res.error) return toast.error(res.error.message ?? "Google sign-in failed");
      if (!res.redirected) await goToTarget();
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }


  async function emailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fall back to sign up for new emails
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        if (signUpErr) throw error;
        const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
        if (retryErr) throw retryErr;
        toast.success("Account created");
      } else {
        toast.success("Welcome back");
      }
      await goToTarget();
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between gradient-hero p-12 text-primary-foreground">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <GraduationCap /> EduConnect
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Welcome to EduConnect</h2>
          <p className="mt-3 opacity-90">
            Sign in with Google, then choose your school to get started.
          </p>
        </div>
        <p className="text-xs opacity-80">© {new Date().getFullYear()} EduConnect</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md card-soft p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 font-bold mb-6">
            <GraduationCap className="h-5 w-5 text-primary" /> EduConnect
          </Link>

          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your Google account. New here? Sign in and pick your school on the next screen.
          </p>

          <Button className="w-full mt-6" onClick={google} disabled={loading} size="lg">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          {!showEmail ? (
            <Button variant="outline" className="w-full" onClick={() => setShowEmail(true)}>
              Continue with email
            </Button>
          ) : (
            <form onSubmit={emailSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <Button type="submit" className="w-full" disabled={loading} variant="outline">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign in / create account
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
