import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["super_admin", "class_teacher", "subject_teacher", "parent", "student"]);

const RegisterInput = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  role: RoleEnum,
  // student
  student: z
    .object({
      school_id: z.string().min(1).max(40),
      gender: z.enum(["male", "female", "other"]).optional().nullable(),
      date_of_birth: z.string().optional().nullable(),
      class_id: z.string().uuid().optional().nullable(),
      session_id: z.string().uuid().optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      emergency_contact: z.string().max(80).optional().nullable(),
    })
    .optional(),
  parent: z
    .object({
      occupation: z.string().max(120).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
    })
    .optional(),
  teacher: z
    .object({
      employee_id: z.string().min(1).max(40),
      qualification: z.string().max(120).optional().nullable(),
      teacher_type: z.enum(["class_teacher", "subject_teacher"]),
      class_id: z.string().uuid().optional().nullable(),
    })
    .optional(),
});

export const registerUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof RegisterInput>) => RegisterInput.parse(data))
  .handler(async ({ data, context }) => {
    // Authorize: only super_admin can register users
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role" as any, {
      _user_id: context.userId,
      _role: "super_admin",
    } as any);
    if (roleErr || !isAdmin) {
      // Fallback: check directly
      const { data: rows } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "super_admin");
      if (!rows || rows.length === 0) throw new Error("Forbidden: admin only");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create auth user with a temporary password
    const tempPassword = "Edu-" + crypto.randomUUID().slice(0, 10) + "!";
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");
    const newUserId = created.user.id;

    // Update profile phone
    if (data.phone) {
      await supabaseAdmin.from("profiles").update({ phone: data.phone, full_name: data.full_name }).eq("id", newUserId);
    }

    // Assign role
    await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: data.role });

    // Entity-specific
    if (data.role === "student" && data.student) {
      const { error } = await supabaseAdmin.from("students").insert({
        profile_id: newUserId,
        full_name: data.full_name,
        school_id: data.student.school_id,
        gender: data.student.gender ?? null,
        date_of_birth: data.student.date_of_birth || null,
        class_id: data.student.class_id || null,
        session_id: data.student.session_id || null,
        address: data.student.address ?? null,
        emergency_contact: data.student.emergency_contact ?? null,
      });
      if (error) throw new Error(error.message);
    } else if (data.role === "parent" && data.parent) {
      const { error } = await supabaseAdmin.from("parents").insert({
        profile_id: newUserId,
        occupation: data.parent.occupation ?? null,
        address: data.parent.address ?? null,
      });
      if (error) throw new Error(error.message);
    } else if ((data.role === "class_teacher" || data.role === "subject_teacher") && data.teacher) {
      const { error } = await supabaseAdmin.from("teachers").insert({
        profile_id: newUserId,
        employee_id: data.teacher.employee_id,
        qualification: data.teacher.qualification ?? null,
        teacher_type: data.teacher.teacher_type,
        class_id: data.teacher.class_id || null,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true, userId: newUserId, tempPassword };
  });

const StudentOnlyInput = z.object({
  full_name: z.string().min(1).max(120),
  school_id: z.string().min(1).max(40),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  session_id: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergency_contact: z.string().max(80).optional().nullable(),
});

// Create a student without a login (kept simple - admin can invite later)
export const createStudentNoLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof StudentOnlyInput>) => StudentOnlyInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "super_admin");
    if (!rows || rows.length === 0) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student, error } = await supabaseAdmin.from("students").insert({
      full_name: data.full_name,
      school_id: data.school_id,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth || null,
      class_id: data.class_id || null,
      session_id: data.session_id || null,
      address: data.address ?? null,
      emergency_contact: data.emergency_contact ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, student };
  });

const LinkParentInput = z.object({
  parent_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export const linkParentStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof LinkParentInput>) => LinkParentInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "super_admin");
    if (!rows || rows.length === 0) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("parent_students").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
