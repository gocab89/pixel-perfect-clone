ALTER TABLE public.chauffeurs
  ADD COLUMN ai_resume text,
  ADD COLUMN ai_incomplet boolean,
  ADD COLUMN ai_points text[],
  ADD COLUMN ai_analyse_le timestamptz;