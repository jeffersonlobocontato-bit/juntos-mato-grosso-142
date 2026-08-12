
CREATE TABLE public.midia_clipping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo text NOT NULL,
  titulo text,
  url_materia text,
  data_publicacao date,
  image_path text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.midia_clipping TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.midia_clipping TO authenticated;
GRANT ALL ON public.midia_clipping TO service_role;

ALTER TABLE public.midia_clipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clippings ativos sao publicos"
  ON public.midia_clipping FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins gerenciam clippings"
  ON public.midia_clipping FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Prints de midia sao legiveis"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'midia-clipping');

CREATE POLICY "Admins enviam prints de midia"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'midia-clipping' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins atualizam prints de midia"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'midia-clipping' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins removem prints de midia"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'midia-clipping' AND public.is_admin(auth.uid()));
