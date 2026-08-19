CREATE OR REPLACE FUNCTION public.get_moldura_avatares_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT COALESCE(visitor_id, session_id))
  FROM public.page_analytics_events
  WHERE page_path LIKE '/moldura%'
    AND event_type = 'moldura_download';
$$;

REVOKE ALL ON FUNCTION public.get_moldura_avatares_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_moldura_avatares_count() TO anon, authenticated, service_role;