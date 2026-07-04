import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_join_requests",
  title: "List join requests",
  description: "List school join requests visible to the signed-in user (school admins see pending requests for their school).",
  inputSchema: {
    status: z.enum(["pending", "approved", "rejected"]).optional().describe("Filter by status (default pending)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("join_requests")
      .select("id, school_id, user_id, email, requested_role, status, created_at")
      .eq("status", status ?? "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { requests: data ?? [] },
    };
  },
});
