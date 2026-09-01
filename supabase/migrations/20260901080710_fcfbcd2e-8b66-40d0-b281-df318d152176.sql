
REVOKE EXECUTE ON FUNCTION public.approve_teacher(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_teacher(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_parent(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_parent(uuid) FROM authenticated, anon, PUBLIC;
