import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Módulos do painel liberados para o usuário logado.
 * Admin e Admin Master têm acesso irrestrito.
 * Usuários sem nenhum módulo configurado mantêm o comportamento antigo (acesso por função).
 */
export const useUserModules = () => {
  const { user, isAdmin, isAdminMaster } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-modules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_modules')
        .select('module_key')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data.map((r) => r.module_key as string);
    },
    enabled: !!user,
  });

  const modules = data ?? [];
  const hasRestriction = !isAdmin && !isAdminMaster && modules.length > 0;

  const canAccessModule = (key?: string) => {
    if (!hasRestriction) return true;
    if (!key) return true;
    return modules.includes(key);
  };

  return { modules, isLoading, hasRestriction, canAccessModule };
};
