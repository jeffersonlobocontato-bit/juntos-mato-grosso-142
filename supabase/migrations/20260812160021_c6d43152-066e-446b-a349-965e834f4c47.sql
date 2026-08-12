CREATE TABLE public.metodologia_galeria (
  id uuid primary key default gen_random_uuid(),
  legenda text,
  image_path text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metodologia_galeria TO authenticated;
GRANT SELECT ON public.metodologia_galeria TO anon;
GRANT ALL ON public.metodologia_galeria TO service_role;
ALTER TABLE public.metodologia_galeria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fotos ativas sao publicas" ON public.metodologia_galeria FOR SELECT USING (ativo = true);
CREATE POLICY "Admins gerenciam galeria" ON public.metodologia_galeria FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));