GRANT UPDATE, DELETE ON public.chauffeurs TO authenticated;

CREATE POLICY "Admins update chauffeurs"
ON public.chauffeurs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete chauffeurs"
ON public.chauffeurs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));