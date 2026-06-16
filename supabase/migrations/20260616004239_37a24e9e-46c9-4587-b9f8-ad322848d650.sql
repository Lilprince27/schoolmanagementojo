
ALTER TABLE public.results
  ADD COLUMN notes_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN attendance_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN test_score numeric NOT NULL DEFAULT 0;

UPDATE public.results SET test_score = LEAST(ca_score, 20);

ALTER TABLE public.results DROP COLUMN total;
ALTER TABLE public.results DROP COLUMN ca_score;
ALTER TABLE public.results ADD COLUMN total numeric;

ALTER TABLE public.results
  ADD CONSTRAINT results_notes_score_range CHECK (notes_score >= 0 AND notes_score <= 10),
  ADD CONSTRAINT results_attendance_score_range CHECK (attendance_score >= 0 AND attendance_score <= 10),
  ADD CONSTRAINT results_test_score_range CHECK (test_score >= 0 AND test_score <= 20),
  ADD CONSTRAINT results_exam_score_range CHECK (exam_score >= 0 AND exam_score <= 60);

CREATE OR REPLACE FUNCTION public.compute_grade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE t NUMERIC := COALESCE(NEW.notes_score,0) + COALESCE(NEW.attendance_score,0) + COALESCE(NEW.test_score,0) + COALESCE(NEW.exam_score,0);
BEGIN
  NEW.total := t;
  IF t >= 70 THEN NEW.grade := 'A';
  ELSIF t >= 60 THEN NEW.grade := 'B';
  ELSIF t >= 50 THEN NEW.grade := 'C';
  ELSIF t >= 45 THEN NEW.grade := 'D';
  ELSIF t >= 40 THEN NEW.grade := 'E';
  ELSE NEW.grade := 'F';
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS results_compute_grade ON public.results;
CREATE TRIGGER results_compute_grade
BEFORE INSERT OR UPDATE ON public.results
FOR EACH ROW EXECUTE FUNCTION public.compute_grade();

UPDATE public.results SET notes_score = notes_score;
