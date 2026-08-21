// Portado da plataforma Politiza IA (politiza.ia.br)
import { useQuery } from '@tanstack/react-query';
import { supabase as db } from '@/integrations/supabase/client';

export interface AssociationInfo {
  id: string;
  acronym: string;
  name: string;
}

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function useMunicipalityAssociationMap() {
  return useQuery({
    queryKey: ['municipality-association-map'],
    queryFn: async () => {
      const [{ data: assocs, error: e1 }, { data: members, error: e2 }] = await Promise.all([
        (db as any).from('municipality_associations').select('id, acronym, name'),
        (db as any).from('association_members').select('association_id, municipality_name'),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byId = new Map<string, AssociationInfo>();
      (assocs ?? []).forEach((a: any) => byId.set(a.id, a));
      const map = new Map<string, AssociationInfo>();
      (members ?? []).forEach((m: any) => {
        const a = byId.get(m.association_id);
        if (a) map.set(normalize(m.municipality_name), a);
      });
      return map;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useAssociationForCity(city: string | null | undefined): AssociationInfo | null {
  const { data: map } = useMunicipalityAssociationMap();
  if (!city || !map) return null;
  return map.get(normalize(city)) ?? null;
}
