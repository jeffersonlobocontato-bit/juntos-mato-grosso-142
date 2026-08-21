// Re-export the canonical Supabase client to avoid duplicate instances
export { supabase as db } from '@/integrations/supabase/client';

/**
 * Pagina qualquer query do PostgREST contornando o limite padrão de 1000 linhas.
 * Recebe uma factory que reconstrói o builder (filtros/order/select) a cada página.
 *
 * Uso:
 *   const rows = await fetchAllRows<MyRow>(() =>
 *     db.from('political_assets').select('*').is('deleted_at', null).order('name')
 *   );
 */
export async function fetchAllRows<T = any>(
  builderFactory: () => any,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Hard cap defensivo para não travar caso a tabela cresça indefinidamente
  const HARD_CAP = 200_000;
  while (from < HARD_CAP) {
    const to = from + pageSize - 1;
    const { data, error } = await builderFactory().range(from, to);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
