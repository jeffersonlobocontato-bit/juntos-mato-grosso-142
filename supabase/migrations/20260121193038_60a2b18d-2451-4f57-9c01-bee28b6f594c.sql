-- =============================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA RLS
-- =============================================

-- 1.1 TABELA LEADS - Corrigir policies
-- Dropar policies existentes problemáticas
DROP POLICY IF EXISTS "Authorized users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Curators can view leads from their municipality" ON public.leads;

-- Criar policy restritiva: apenas roles autorizados podem ver leads
CREATE POLICY "Authorized roles can view leads"
ON public.leads
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin_master'::app_role) OR
  has_role(auth.uid(), 'lider_tematico'::app_role) OR
  has_role(auth.uid(), 'curador_municipal'::app_role)
);

-- Curators podem ver leads do seu município (policy específica)
CREATE POLICY "Curators view leads from their municipality"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_municipios um
    JOIN public.municipios m ON m.id = um.municipio_id
    WHERE um.user_id = auth.uid() 
    AND m.nome = leads.municipio
  )
);

-- 1.2 TABELA SUGESTOES_POPULARES - Criar VIEW pública segura
-- Criar VIEW que exclui dados sensíveis para uso público
CREATE OR REPLACE VIEW public.sugestoes_publicas AS
SELECT 
  id,
  municipio,
  eixo,
  descricao,
  publico,
  created_at
FROM public.sugestoes_populares
WHERE publico = true;

-- Garantir que a VIEW é acessível publicamente
GRANT SELECT ON public.sugestoes_publicas TO anon;
GRANT SELECT ON public.sugestoes_publicas TO authenticated;

-- Corrigir policies da tabela original
DROP POLICY IF EXISTS "Admins can view all suggestions" ON public.sugestoes_populares;

-- Apenas roles autorizados podem ver dados completos (com email/whatsapp)
CREATE POLICY "Authorized roles view full suggestions"
ON public.sugestoes_populares
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin_master'::app_role) OR
  has_role(auth.uid(), 'lider_tematico'::app_role) OR
  has_role(auth.uid(), 'curador_municipal'::app_role)
);

-- 1.3 TABELA PROFILES - Reforçar policies
-- Verificar e garantir que não há bypass
-- A policy existente "Users can view their own profile" já está correta
-- Adicionar policy explícita para admin_master
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins and admin_master can view all profiles"
ON public.profiles
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin_master'::app_role)
);

-- 1.4 TABELA PROPOSTAS_POLITICAS - Corrigir INSERT para formulário público
-- Atualmente não há policy de INSERT, vamos adicionar
CREATE POLICY "Anyone can submit political proposals"
ON public.propostas_politicas
FOR INSERT
WITH CHECK (true);

-- =============================================
-- FASE 2: AUDITORIA BÁSICA
-- =============================================

-- Criar tabela de audit_logs para rastrear ações críticas
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de audit
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'admin_master'::app_role)
);

-- Permitir INSERT via triggers (usando SECURITY DEFINER nas funções)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Aplicar triggers de auditoria em tabelas críticas
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_propostas_tecnicas ON public.propostas_tecnicas;
CREATE TRIGGER audit_propostas_tecnicas
AFTER INSERT OR UPDATE OR DELETE ON public.propostas_tecnicas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_propostas_politicas ON public.propostas_politicas;
CREATE TRIGGER audit_propostas_politicas
AFTER INSERT OR UPDATE OR DELETE ON public.propostas_politicas
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();