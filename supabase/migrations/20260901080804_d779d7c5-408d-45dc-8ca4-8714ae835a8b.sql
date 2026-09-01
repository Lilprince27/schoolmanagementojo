
UPDATE public.announcements a
SET school_org_id = s.id
FROM public.schools s
WHERE a.school_org_id IS NULL AND s.admin_profile_id = a.created_by;

DELETE FROM public.announcements WHERE school_org_id IS NULL;
