CREATE TABLE public.site_video_config (
  chave TEXT PRIMARY KEY,
  video_url TEXT,
  poster_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.site_video_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_video_config TO authenticated;
GRANT ALL ON public.site_video_config TO service_role;
ALTER TABLE public.site_video_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_video_config public read" ON public.site_video_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_video_config admin insert" ON public.site_video_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_master'));
CREATE POLICY "site_video_config admin update" ON public.site_video_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_master')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'admin_master'));
INSERT INTO public.site_video_config (chave) VALUES ('metodologia') ON CONFLICT DO NOTHING;