
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','class_teacher','subject_teacher','parent','student');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late');
CREATE TYPE public.teacher_type AS ENUM ('class_teacher','subject_teacher');
CREATE TYPE public.term_type AS ENUM ('first','second','third');
CREATE TYPE public.gender_type AS ENUM ('male','female','other');
CREATE TYPE public.announcement_audience AS ENUM ('all','teachers','parents','students');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_any_teacher(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'class_teacher') OR public.has_role(_user_id,'subject_teacher')
$$;

-- Profiles policies
CREATE POLICY "Users read own profile or admin reads all" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_any_teacher(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admin manages profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles policies
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ACADEMIC SESSIONS ============
CREATE TABLE public.academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  term public.term_type NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_sessions TO authenticated;
GRANT ALL ON public.academic_sessions TO service_role;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read sessions" ON public.academic_sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages sessions" ON public.academic_sessions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.academic_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CLASSES ============
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read classes" ON public.classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages classes" ON public.classes
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUBJECTS ============
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth read subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages subjects" ON public.subjects
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  school_id TEXT NOT NULL UNIQUE,
  gender public.gender_type,
  date_of_birth DATE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  address TEXT,
  photo_url TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARENTS ============
CREATE TABLE public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occupation TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_parents_updated BEFORE UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TEACHERS ============
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  qualification TEXT,
  teacher_type public.teacher_type NOT NULL DEFAULT 'subject_teacher',
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARENT-STUDENT links ============
CREATE TABLE public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- ============ TEACHER-SUBJECT assignments ============
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subjects TO authenticated;
GRANT ALL ON public.teacher_subjects TO service_role;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Helper: is parent of student
CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE p.profile_id = _user_id AND ps.student_id = _student_id
  )
$$;

-- Helper: is the student
CREATE OR REPLACE FUNCTION public.is_student_self(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.students WHERE id=_student_id AND profile_id=_user_id)
$$;

-- Helper: teacher teaches student's class
CREATE OR REPLACE FUNCTION public.teacher_can_see_student(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teachers t ON t.profile_id = _user_id
    WHERE s.id = _student_id AND (
      t.class_id = s.class_id
      OR EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.teacher_id=t.id AND ts.class_id=s.class_id)
    )
  )
$$;

-- Students policies
CREATE POLICY "Admin manages students" ON public.students FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Self read student" ON public.students FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "Parent reads child" ON public.students FOR SELECT TO authenticated
  USING (public.is_parent_of(auth.uid(), id));
CREATE POLICY "Teacher reads class students" ON public.students FOR SELECT TO authenticated
  USING (public.teacher_can_see_student(auth.uid(), id));

-- Parents policies
CREATE POLICY "Admin manages parents" ON public.parents FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Self read parent" ON public.parents FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "Teachers read parents" ON public.parents FOR SELECT TO authenticated
  USING (public.is_any_teacher(auth.uid()));

-- Teachers policies
CREATE POLICY "Admin manages teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Self read teacher" ON public.teachers FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "All teachers visible to teachers" ON public.teachers FOR SELECT TO authenticated
  USING (public.is_any_teacher(auth.uid()));

-- parent_students policies
CREATE POLICY "Admin manages parent_students" ON public.parent_students FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Parent reads own links" ON public.parent_students FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.parents p WHERE p.id=parent_id AND p.profile_id=auth.uid()));
CREATE POLICY "Teacher reads links" ON public.parent_students FOR SELECT TO authenticated
  USING (public.is_any_teacher(auth.uid()));

-- teacher_subjects policies
CREATE POLICY "Admin manages teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Teacher reads own assignments" ON public.teacher_subjects FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.teachers t WHERE t.id=teacher_id AND t.profile_id=auth.uid()));

-- ============ ATTENDANCE ============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin manages attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Teacher manages class attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.teacher_can_see_student(auth.uid(), student_id))
  WITH CHECK (public.teacher_can_see_student(auth.uid(), student_id));
CREATE POLICY "Parent reads child attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.is_parent_of(auth.uid(), student_id));
CREATE POLICY "Self reads attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.is_student_self(auth.uid(), student_id));

-- ============ RESULTS ============
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.academic_sessions(id) ON DELETE CASCADE,
  term public.term_type NOT NULL,
  ca_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (ca_score >= 0 AND ca_score <= 40),
  exam_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (exam_score >= 0 AND exam_score <= 60),
  total NUMERIC(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade TEXT,
  remark TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, session_id, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.results TO authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.compute_grade()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t NUMERIC := COALESCE(NEW.ca_score,0) + COALESCE(NEW.exam_score,0);
BEGIN
  IF t >= 70 THEN NEW.grade := 'A';
  ELSIF t >= 60 THEN NEW.grade := 'B';
  ELSIF t >= 50 THEN NEW.grade := 'C';
  ELSIF t >= 45 THEN NEW.grade := 'D';
  ELSIF t >= 40 THEN NEW.grade := 'E';
  ELSE NEW.grade := 'F';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_results_grade BEFORE INSERT OR UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.compute_grade();
CREATE TRIGGER trg_results_updated BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin manages results" ON public.results FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Teacher manages results" ON public.results FOR ALL TO authenticated
  USING (public.teacher_can_see_student(auth.uid(), student_id))
  WITH CHECK (public.teacher_can_see_student(auth.uid(), student_id));
CREATE POLICY "Parent reads child results" ON public.results FOR SELECT TO authenticated
  USING (public.is_parent_of(auth.uid(), student_id));
CREATE POLICY "Self reads results" ON public.results FOR SELECT TO authenticated
  USING (public.is_student_self(auth.uid(), student_id));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience public.announcement_audience NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin manages announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Read announcements by audience" ON public.announcements FOR SELECT TO authenticated
  USING (
    audience = 'all'
    OR (audience='teachers' AND public.is_any_teacher(auth.uid()))
    OR (audience='parents' AND public.has_role(auth.uid(),'parent'))
    OR (audience='students' AND public.has_role(auth.uid(),'student'))
    OR public.is_admin(auth.uid())
  );

-- ============ SEED a default session ============
INSERT INTO public.academic_sessions (name, term, is_current, start_date, end_date)
VALUES ('2025/2026','first',true, '2025-09-01','2025-12-15');
