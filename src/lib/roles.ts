export type AppRole = "super_admin" | "class_teacher" | "subject_teacher" | "parent" | "student" | "transport_manager";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Administrator",
  class_teacher: "Class Teacher",
  subject_teacher: "Subject Teacher",
  parent: "Parent",
  student: "Student",
  transport_manager: "Transport Manager",
};

export function primaryRole(roles: AppRole[] | undefined): AppRole | null {
  if (!roles || roles.length === 0) return null;
  const order: AppRole[] = ["super_admin", "class_teacher", "subject_teacher", "transport_manager", "parent", "student"];
  for (const r of order) if (roles.includes(r)) return r;
  return roles[0];
}

export function isTeacher(role: AppRole | null) {
  return role === "class_teacher" || role === "subject_teacher";
}

export function canManageTransport(roles: AppRole[] | undefined) {
  return !!roles?.some((r) => r === "super_admin" || r === "transport_manager");
}
