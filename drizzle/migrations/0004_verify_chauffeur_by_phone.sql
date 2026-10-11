CREATE OR REPLACE FUNCTION public.verify_chauffeur(_telephone text)
RETURNS TABLE(
  prenom text,
  nom text,
  immatriculation text,
  type_vehicule text,
  couleur_vehicule text,
  telephone text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT prenom, nom, immatriculation, type_vehicule, couleur_vehicule, telephone, created_at
  FROM public.chauffeurs
  WHERE telephone = _telephone
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.verify_chauffeur(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_chauffeur(text) TO authenticated;