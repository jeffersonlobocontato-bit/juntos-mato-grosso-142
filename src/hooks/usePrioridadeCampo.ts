import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';

export interface LocalPrioridadeCampo {
  nmMunicipio: string;
  dsEndereco: string;
  nmLocalVotacao: string | null;
  lat: number | null;
  lng: number | null;
  votos2018: number;
  total2018: number;
  pct2018: number;
  votos2022: number;
  total2022: number;
  pct2022: number;
  diffPp: number;
  temCoberturaCampo: boolean;
}

/** Candidatos que concorreram ao cargo nos dois anos (2018 e 2022) — só esses têm oscilação comparável. */
export function useCandidatosSecoesComuns(cdCargo: number) {
  return useQuery({
    queryKey: ['candidatos-secoes-comuns', cdCargo],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db.rpc('candidatos_secoes_comuns' as any, { p_cd_cargo: cdCargo });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => r.nm_candidato as string);
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Locais de votação: histórico 2018x2022 do candidato x cobertura de tracking de campo. */
export function usePrioridadeCampo(cdCargo: number, nmCandidato: string | null) {
  return useQuery({
    queryKey: ['prioridade-campo', cdCargo, nmCandidato],
    enabled: !!nmCandidato,
    queryFn: async (): Promise<LocalPrioridadeCampo[]> => {
      const { data, error } = await db.rpc('locais_prioridade_campo' as any, {
        p_cd_cargo: cdCargo,
        p_nm_candidato: nmCandidato,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        nmMunicipio: r.nm_municipio as string,
        dsEndereco: r.ds_endereco as string,
        nmLocalVotacao: r.nm_local_votacao as string | null,
        lat: r.latitude != null ? Number(r.latitude) : null,
        lng: r.longitude != null ? Number(r.longitude) : null,
        votos2018: Number(r.votos_2018 ?? 0),
        total2018: Number(r.total_2018 ?? 0),
        pct2018: Number(r.pct_2018 ?? 0),
        votos2022: Number(r.votos_2022 ?? 0),
        total2022: Number(r.total_2022 ?? 0),
        pct2022: Number(r.pct_2022 ?? 0),
        diffPp: Number(r.diff_pp ?? 0),
        temCoberturaCampo: Boolean(r.tem_cobertura_campo),
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}
