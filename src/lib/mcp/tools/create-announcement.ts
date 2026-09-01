import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_announcement",
  title: "Create announcement",
  description: "Post a new announcement. Requires an authorized role (admin or teacher).",
  inputSchema: {
    title: z.string().trim().min(1).describe("Announcement title."),
    body: z.string().trim().min(1).describe("Announcement body text."),
    audience: z
      .enum(["all", "teachers", "parents", "students"])
      .optional()
      .describe("Who should see the announcement (default all)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, body, audience }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data: school } = await sb
      .from("schools")
      .select("id")
      .eq("admin_profile_id", ctx.getUserId())
      .maybeSingle();
    if (!school) {
      return { content: [{ type: "text", text: "Only a school administrator can post announcements" }], isError: true };
    }
    const { data, error } = await sb
      .from("announcements")
      .insert({ title, body, audience: audience ?? "all", created_by: ctx.getUserId(), school_org_id: school.id } as any)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Created announcement ${data.id}` }],
      structuredContent: { announcement: data },
    };
  },
});
