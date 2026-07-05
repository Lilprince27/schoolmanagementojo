import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_ADMIN_EMAIL = "princelaw4u.pl@gmail.com";

export type Membership = {
  isPlatformAdmin: boolean;
  schoolId: string | null;
  schoolName: string | null;
  isSchoolAdmin: boolean;
  hasPendingRequest: boolean;
  pendingSchoolName: string | null;
};

export function useMembership(userId: string | undefined, email: string | undefined | null) {
  return useQuery<Membership>({
    queryKey: ["membership", userId, email?.toLowerCase() ?? null],
    enabled: !!userId && !!email,
    queryFn: async () => {
      const isPlatformAdmin = !!email && email.toLowerCase() === PLATFORM_ADMIN_EMAIL;

      // Look for a school assignment across all entity tables + school admin
      const [t, p, s, admin, pending] = await Promise.all([
        supabase.from("teachers").select("school_org_id").eq("profile_id", userId!).maybeSingle(),
        supabase.from("parents").select("school_org_id").eq("profile_id", userId!).maybeSingle(),
        supabase.from("students").select("school_org_id").eq("profile_id", userId!).maybeSingle(),
        supabase.from("schools").select("id, name").eq("admin_profile_id", userId!).maybeSingle(),
        supabase.from("join_requests").select("id, school_id, status, schools(name)")
          .eq("user_id", userId!).eq("status", "pending").maybeSingle(),
      ]);

      const schoolId =
        admin.data?.id ??
        t.data?.school_org_id ??
        p.data?.school_org_id ??
        s.data?.school_org_id ??
        null;

      let schoolName: string | null = admin.data?.name ?? null;
      if (schoolId && !schoolName) {
        const { data } = await supabase.from("schools").select("name").eq("id", schoolId).maybeSingle();
        schoolName = data?.name ?? null;
      }

      return {
        isPlatformAdmin,
        schoolId,
        schoolName,
        isSchoolAdmin: !!admin.data,
        hasPendingRequest: !!pending.data,
        pendingSchoolName: (pending.data as any)?.schools?.name ?? null,
      };
    },
  });
}
