import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap, ClipboardCheck, BarChart3, BellRing, FileText, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduConnect — Smart School Management System" },
      { name: "description", content: "Run your school from one place: attendance, grading, report cards, parent communication and announcements." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-hero text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            EduConnect
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" }}><Button>Get started</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Built for modern schools
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight">
            One platform for your <span className="text-primary">whole school</span>.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            EduConnect brings administrators, teachers, parents and students together — attendance, results, report cards and announcements in a single, secure place.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}><Button size="lg">Create your school</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Sign in</Button></Link>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            <Feature icon={ClipboardCheck} title="Daily attendance" desc="Mark present, absent or late. Parents get notified the moment a child is marked absent." />
            <Feature icon={FileText} title="Auto-graded results" desc="Enter CA and exam scores — grades, totals and remarks compute automatically." />
            <Feature icon={BarChart3} title="Beautiful report cards" desc="Generate term report cards parents can view online or download as PDF." />
            <Feature icon={Users} title="Role-based access" desc="Admins, teachers, parents and students each see exactly what they need." />
            <Feature icon={BellRing} title="Announcements" desc="Broadcast to the whole school or target teachers, parents or students." />
            <Feature icon={GraduationCap} title="Secure by default" desc="Row-level security on every record. Your data stays where it belongs." />
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EduConnect
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="card-soft p-5">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
