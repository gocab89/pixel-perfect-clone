CREATE OR REPLACE FUNCTION public.plate_key(_p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT regexp_replace(upper(coalesce(_p,'')), '[^A-Z0-9]', '', 'g') $$;

CREATE INDEX IF NOT EXISTS chauffeurs_plate_key_idx ON public.chauffeurs (public.plate_key(immatriculation));

CREATE OR REPLACE FUNCTION public.chauffeurs_unique_plate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text := public.plate_key(NEW.immatriculation);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('chauffeur_plate:' || k));
  IF EXISTS (SELECT 1 FROM public.chauffeurs WHERE public.plate_key(immatriculation) = k AND id <> NEW.id) THEN
    RAISE EXCEPTION 'Immatriculation deja enregistree' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chauffeurs_unique_plate_trg ON public.chauffeurs;
CREATE TRIGGER chauffeurs_unique_plate_trg BEFORE INSERT OR UPDATE OF immatriculation ON public.chauffeurs FOR EACH ROW EXECUTE FUNCTION public.chauffeurs_unique_plate();