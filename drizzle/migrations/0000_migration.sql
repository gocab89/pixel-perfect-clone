CREATE TABLE public.chauffeurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prenom text NOT NULL CHECK (char_length(prenom) BETWEEN 1 AND 80),
  nom text NOT NULL CHECK (char_length(nom) BETWEEN 1 AND 80),
  immatriculation text NOT NULL UNIQUE CHECK (char_length(immatriculation) BETWEEN 4 AND 20),
  couleur_vehicule text NOT NULL CHECK (couleur_vehicule IN ('Blanc','Noir','Gris','Argent','Rouge','Bleu','Vert','Jaune','Beige','Marron','Autre')),
  telephone text NOT NULL CHECK (telephone ~ '^\+[1-9][0-9]{6,14}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.chauffeurs TO anon, authenticated;
GRANT ALL ON public.chauffeurs TO service_role;
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can register" ON public.chauffeurs FOR INSERT TO anon, authenticated WITH CHECK (true);