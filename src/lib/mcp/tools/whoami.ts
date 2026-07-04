import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in user's profile, roles, and school membership.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [profile, roles, membership] = await Promise.all([
      sb.from("profiles").select("id, email, full_name").eq("id", userId!).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId!),
      sb.from("school_memberships").select("school_id, role, schools(name)").eq("user_id", userId!),
    ]);
    const data = {
      user_id: userId,
      email: ctx.getUserEmail(),
      profile: profile.data,
      roles: (roles.data ?? []).map((r) => r.role),
      schools: membership.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
});
