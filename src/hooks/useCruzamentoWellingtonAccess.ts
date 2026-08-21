import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Retorna se o usuário logado pode acessar a tela "Cruzamento Wellington".
 * Regras:
 *  - admin_master sempre pode
 *  - qualquer outro papel só pode se tiver registro em `cruzamento_wellington_access`
 *
 * Também expõe `cruzamentoOnly`: usuário só tem grant de cruzamento e nenhum
 * papel funcional (roles vazio) — nesse caso a plataforma inteira é restrita
 * à página /admin/cruzamento-wellington.
 *
 * Portado do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br).
 */
export function useCruzamentoWellingtonAccess() {
  const { user, roles, isLoading: authLoading } = useAuth();
  const isMaster = roles?.includes('admin_master' as any);

  const q = useQuery({
    queryKey: ['cruzamento-wellington-access', user?.id],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cruzamento_wellington_access')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
  });

  const hasGrant = !!q.data;
  const canAccess = isMaster || hasGrant;
  const cruzamentoOnly =
    !isMaster && hasGrant && (!roles || roles.length === 0);

  return {
    canAccess,
    isMaster,
    hasGrant,
    cruzamentoOnly,
    loading: authLoading || q.isLoading,
  };
}
