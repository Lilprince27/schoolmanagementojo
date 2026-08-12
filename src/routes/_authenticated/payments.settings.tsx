import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSession } from "@/lib/hooks/use-auth";
import { useMembership } from "@/lib/hooks/use-membership";
import {
  getPaymentSettings,
  savePaymentSettings,
  testPaymentKey,
} from "@/lib/api/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, ShieldCheck, Loader2, FlaskConical, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payments settings — Smart Schools" },
      { name: "description", content: "Switch between Flutterwave Live and Test mode and store your school payment keys securely." },
      { property: "og:title", content: "Payments settings — Smart Schools" },
      { property: "og:description", content: "Switch between Flutterwave Live and Test mode and store your payment keys securely." },
    ],
  }),
  component: PaymentsSettingsPage,
});

function PaymentsSettingsPage() {
  const { user } = useSession();
  const { data: membership } = useMembership(user?.id, user?.email);
  const load = useServerFn(getPaymentSettings);
  const save = useServerFn(savePaymentSettings);
  const check = useServerFn(testPaymentKey);
  const qc = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["payment-settings"],
    enabled: !!membership?.isPlatformAdmin,
    queryFn: () => load({}),
  });

  const [mode, setMode] = useState<"live" | "test">("test");
  const [liveKey, setLiveKey] = useState("");
  const [testKey, setTestKey] = useState("");
  const [hash, setHash] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (settings?.mode) setMode(settings.mode);
  }, [settings?.mode]);

  if (!membership?.isPlatformAdmin) {
    return <p className="text-muted-foreground">Only the platform administrator can manage payment settings.</p>;
  }
  if (isLoading) return <p className="text-muted-foreground">Loading settings…</p>;
  if (error) return <p className="text-destructive">{(error as Error).message}</p>;

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          mode,
          ...(liveKey ? { live_secret_key: liveKey } : {}),
          ...(testKey ? { test_secret_key: testKey } : {}),
          ...(hash ? { secret_hash: hash } : {}),
        },
      });
      setLiveKey("");
      setTestKey("");
      setHash("");
      toast.success("Payment settings saved");
      qc.invalidateQueries({ queryKey: ["payment-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function onCheck() {
    setChecking(true);
    try {
      const res = await check({});
      res.ok ? toast.success(res.message) : toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Key check failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold flex flex-wrap items-center gap-2">
          <Settings2 /> Payments settings
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
              settings?.activeMode === "live" && settings?.configured
                ? "bg-success text-success-foreground"
                : "bg-warning text-warning-foreground"
            }`}
          >
            {settings?.activeMode === "live" ? "Live" : "Test"}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Keys are stored privately on the server — they are never sent to browsers, only a masked preview is shown.
        </p>
        {!settings?.configured && (
          <p className="mt-2 text-sm text-destructive">
            Payments are not yet configured for live transactions. Save your live Flutterwave secret key below to start accepting real payments.
          </p>
        )}
      </div>


      <div className="card-soft p-5 space-y-4">
        <div>
          <Label>Environment</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("test")}
              className={`rounded-xl border p-4 text-left ${mode === "test" ? "border-primary bg-accent-soft" : "border-border"}`}
            >
              <span className="flex items-center gap-2 font-semibold"><FlaskConical className="h-4 w-4" /> Test</span>
              <span className="text-xs text-muted-foreground">Sandbox checkouts, no real money.</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`rounded-xl border p-4 text-left ${mode === "live" ? "border-primary bg-accent-soft" : "border-border"}`}
            >
              <span className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Live</span>
              <span className="text-xs text-muted-foreground">Real payments settle to school accounts.</span>
            </button>
          </div>
        </div>

        <div>
          <Label>Live secret key</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings?.liveKeyMasked ?? "FLWSECK-…"}
            value={liveKey}
            onChange={(e) => setLiveKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {settings?.liveKeyMasked ? `Saved: ${settings.liveKeyMasked}` : "Not set yet."} Leave blank to keep it unchanged.
          </p>
        </div>

        <div>
          <Label>Test secret key</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings?.testKeyMasked ?? "FLWSECK_TEST-…"}
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {settings?.testKeyMasked ? `Saved: ${settings.testKeyMasked}` : "Not set yet."} Leave blank to keep it unchanged.
          </p>
        </div>

        <div>
          <Label>Webhook secret hash</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings?.hasSecretHash ? "••••••••" : "Paste the same value used in Flutterwave"}
            value={hash}
            onChange={(e) => setHash(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Flutterwave → Settings → Webhooks. URL:{" "}
            <span className="font-mono break-all">https://schoolmanagementojo.lovable.app/api/public/flutterwave-webhook</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={onCheck} disabled={checking}>
            {checking && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Test connection
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Currently active: <span className="font-semibold">{settings?.activeMode ?? "test"}</span> mode
          {settings?.configured ? "" : " — no key configured yet"}
          {settings?.updated_at && ` · updated ${new Date(settings.updated_at).toLocaleString()}`}
        </p>
      </div>
    </div>
  );
}
