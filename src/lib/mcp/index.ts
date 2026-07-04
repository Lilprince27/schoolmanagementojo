import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listAnnouncementsTool from "./tools/list-announcements";
import createAnnouncementTool from "./tools/create-announcement";
import listJoinRequestsTool from "./tools/list-join-requests";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smart-schools-mcp",
  title: "Smart Schools MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Smart Schools platform. Use `whoami` to identify the signed-in user, `list_announcements` / `create_announcement` for school announcements, and `list_join_requests` to review pending school join requests.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listAnnouncementsTool, createAnnouncementTool, listJoinRequestsTool],
});
