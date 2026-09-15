import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Visibilidade global dos módulos do painel.
 * Módulos sem registro na tabela são considerados visíveis.
 * Admin e Admin Master enxergam tudo, mesmo o que estiver desativado.
 */
export const useModuleVisibility = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['module-visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_visibility')
        .select('module_key, visible');
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((r) => {
        map[r.module_key as string] = r.visible as boolean;
      });
      return map;
    },
    enabled: !!user,
  });

  const visibilityMap = data ?? {};

  const isModuleVisible = (key?: string) => {
    if (!key) return true;
    return visibilityMap[key] !== false;
  };

  return { visibilityMap, isModuleVisible, isLoading, refetch };
};
