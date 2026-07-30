CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.login_attempts TO service_role;

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON public.login_attempts (ip_hash, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  p_ip_hash TEXT,
  p_max_attempts INT DEFAULT 8,
  p_window_minutes INT DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.login_attempts
  WHERE ip_hash = p_ip_hash
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO public.login_attempts (ip_hash) VALUES (p_ip_hash);
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '1 day';
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_login_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(TEXT, INT, INT) TO service_role;