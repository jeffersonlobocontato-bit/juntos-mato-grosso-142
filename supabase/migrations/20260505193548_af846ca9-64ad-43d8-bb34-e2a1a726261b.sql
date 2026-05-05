
-- Phase 3: Audit triggers on sensitive tables
-- Uses existing public.audit_trigger_func() which writes to public.audit_logs

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_eixos ON public.user_eixos;
CREATE TRIGGER audit_user_eixos
AFTER INSERT OR UPDATE OR DELETE ON public.user_eixos
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_user_municipios ON public.user_municipios;
CREATE TRIGGER audit_user_municipios
AFTER INSERT OR UPDATE OR DELETE ON public.user_municipios
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_profiles_update ON public.profiles;
CREATE TRIGGER audit_profiles_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
