
-- Phase 4: Lock down SECURITY DEFINER functions and view

-- 1) Recreate view as SECURITY INVOKER (resolves linter ERROR 0010)
DROP VIEW IF EXISTS public.sugestoes_publicas;
CREATE VIEW public.sugestoes_publicas
WITH (security_invoker = true) AS
SELECT id, municipio, eixo, descricao, publico, created_at
FROM public.sugestoes_populares
WHERE publico = true;

GRANT SELECT ON public.sugestoes_publicas TO anon, authenticated;

-- 2) Trigger-only functions: revoke EXECUTE from everyone (triggers run as owner)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_evaluation_stale() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_lead_from_proposta() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_lead_from_proposta_politica() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_lead_from_sugestao() FROM PUBLIC, anon, authenticated;

-- 3) Sensitive admin/leader read functions: revoke from anon, keep authenticated
REVOKE ALL ON FUNCTION public.get_inactive_users(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inactive_users(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_stale_proposals(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stale_proposals(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.match_document_chunks(extensions.vector, double precision, integer, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(extensions.vector, double precision, integer, uuid[]) TO authenticated;

-- 4) Auth helper functions used inside RLS policies: keep callable by authenticated only
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 5) Intentionally public (used by anon viewers of shared presentation pages)
-- Keep EXECUTE for anon + authenticated, revoke broad PUBLIC default
REVOKE ALL ON FUNCTION public.get_shared_presentation_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_presentation_public(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.increment_shared_presentation_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_shared_presentation_view(text) TO anon, authenticated;
