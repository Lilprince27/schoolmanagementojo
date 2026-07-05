GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_any_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student_self(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_see_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.assign_school_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_parent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_parent(uuid) TO authenticated;