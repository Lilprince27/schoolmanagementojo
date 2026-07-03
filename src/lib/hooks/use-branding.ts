import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SchoolBranding = {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  login_background_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  motto: string | null;
};

export function useSchoolBranding(schoolId: string | null | undefined) {
  const q = useQuery<SchoolBranding | null>({
    queryKey: ["school-branding", schoolId],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, logo_url, banner_url, favicon_url, login_background_url, primary_color, secondary_color, motto")
        .eq("id", schoolId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  useEffect(() => {
    const b = q.data;
    const root = document.documentElement;
    // Keys we override
    const keys = [
      "--primary", "--ring", "--sidebar-primary", "--sidebar-ring",
      "--accent", "--primary-foreground", "--sidebar-primary-foreground",
    ];
    if (!b) {
      keys.forEach((k) => root.style.removeProperty(k));
      // reset favicon handled elsewhere
      return;
    }
    if (b.primary_color) {
      const fg = readableForeground(b.primary_color);
      root.style.setProperty("--primary", b.primary_color);
      root.style.setProperty("--ring", b.primary_color);
      root.style.setProperty("--sidebar-primary", b.primary_color);
      root.style.setProperty("--sidebar-ring", b.primary_color);
      root.style.setProperty("--primary-foreground", fg);
      root.style.setProperty("--sidebar-primary-foreground", fg);
    }
    if (b.secondary_color) {
      root.style.setProperty("--accent", b.secondary_color);
    }
    if (b.favicon_url) {
      setFavicon(b.favicon_url);
    } else if (b.logo_url) {
      setFavicon(b.logo_url);
    }
    if (b.name) document.title = b.name;
  }, [q.data]);

  return q;
}

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

function readableForeground(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 3 && c.length !== 6) return "#ffffff";
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}
