import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertTransportAdmin(context: any) {
  const { data: rows } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["super_admin", "transport_manager"]);
  if (!rows || rows.length === 0) throw new Error("Forbidden");
}

const InviteDriverInput = z.object({
  driver_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1).max(160),
});

export const inviteDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof InviteDriverInput>) => InviteDriverInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertTransportAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tempPassword = "Bus-" + crypto.randomUUID().slice(0, 10) + "!";
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: "driver" },
    });
    if (createErr || !created.user) {
      // If already exists, try to find by email
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const found = existing?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!found) throw new Error(createErr?.message ?? "Failed to create driver login");
      await supabaseAdmin.from("drivers").update({ profile_id: found.id, email: data.email }).eq("id", data.driver_id);
      return { ok: true, tempPassword: null, existing: true };
    }
    await supabaseAdmin.from("drivers").update({ profile_id: created.user.id, email: data.email }).eq("id", data.driver_id);
    return { ok: true, tempPassword, existing: false };
  });
