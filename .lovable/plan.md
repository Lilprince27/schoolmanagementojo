## EduConnect MVP Build Plan

### Scope (this build)
- 5 roles with Lovable Cloud auth (email/password + Google), separate `user_roles` table
- Admin: register students/teachers/parents, manage classes & subjects, view stats
- Teacher: take attendance, upload scores, view class
- Parent: view children's attendance & results, download PDF report card
- Student: view own results & attendance
- Attendance triggers absence email to parent (DB trigger → server route → email queue)
- Auto-graded results (A–F bands), report card with PDF export

Premium features (fees, SMS, CBT, timetable, bus tracking, AI analysis) are NOT in this build.

### Database
Tables (all RLS-enabled, `has_role` security-definer helper):
- `profiles` (id→auth.users, full_name, phone, avatar_url)
- `user_roles` (user_id, role enum: super_admin | class_teacher | subject_teacher | parent | student)
- `academic_sessions` (name, term, is_current)
- `classes` (name, level)
- `subjects` (name, code)
- `students` (profile_id, school_id, gender, dob, class_id, session_id, address, photo_url, emergency_contact)
- `parents` (profile_id, occupation, address)
- `teachers` (profile_id, employee_id, qualification, teacher_type, class_id)
- `parent_students` (parent_id, student_id)
- `teacher_subjects` (teacher_id, subject_id, class_id)
- `attendance` (student_id, date, status enum, recorded_by)
- `results` (student_id, subject_id, session_id, ca_score, exam_score, total, grade, term)
- `announcements` (title, body, audience, created_by)

### Server
- `createServerFn`: register users (admin), bulk attendance, upsert results, generate report card data
- Server route `/api/public/email/absence` triggered by DB function on absence insert; uses Lovable Emails (will set up email domain prereq)
- Storage bucket `student-photos`

### UI
- Friendly modern edu aesthetic: indigo primary + mint accent, rounded cards, soft shadows, Plus Jakarta Sans
- Public landing page
- `/auth` sign-in/sign-up (admin creates non-admin accounts; self sign-up disabled for non-admin)
- `_authenticated` shell with role-aware sidebar
- Dashboards per role + entity management screens
- Report card view + PDF download (browser print-to-PDF via styled view)

### Out of scope this turn
- Email domain setup (will prompt user once UI works)
- Messaging between users
- Two-factor auth
- DOCX export (PDF only)

Building immediately after you approve.