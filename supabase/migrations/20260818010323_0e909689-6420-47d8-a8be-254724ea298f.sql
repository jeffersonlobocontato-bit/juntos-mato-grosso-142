CREATE TABLE public.moldura_config (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  feed_zoom double precision NOT NULL DEFAULT 0.9 CHECK (feed_zoom BETWEEN 0.5 AND 3),
  feed_x double precision NOT NULL DEFAULT 0 CHECK (feed_x BETWEEN -1 AND 1),
  feed_y double precision NOT NULL DEFAULT 0.08 CHECK (feed_y BETWEEN -1 AND 1),
  story_zoom double precision NOT NULL DEFAULT 1.04 CHECK (story_zoom BETWEEN 0.5 AND 3),
  story_x double precision NOT NULL DEFAULT 0 CHECK (story_x BETWEEN -1 AND 1),
  story_y double precision NOT NULL DEFAULT 0.03 CHECK (story_y BETWEEN -1 AND 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moldura_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.moldura_config TO authenticated;
GRANT ALL ON public.moldura_config TO service_role;

ALTER TABLE public.moldura_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read moldura config"
ON public.moldura_config
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert moldura config"
ON public.moldura_config
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update moldura config"
ON public.moldura_config
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete moldura config"
ON public.moldura_config
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

INSERT INTO public.moldura_config (id) VALUES ('default');