import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';

export interface CandidatoAgg {
  nome: string;
  partido: string;
  numero: string;
  votos: number;
  pct: number;
}

export interface MunicipioAgg {
  codigoIbge: string;
  nome: string;
  votos: number;
  pct: number;
  lat: number | null;
  lng: number | null;
}

/** Combinações disponíveis (ano / turno / cargo). */
export function useCombinacoesDisponiveis() {
  return useQuery({
    queryKey: ['resultados-historicos-combos'],
    queryFn: async () => {
      const { data, error } = await db.rpc('hist_combos' as any);
      if (error) throw error;
      return ((data ?? []) as any[])
        .map(r => ({
          ano: Number(r.ano),
          turno: Number(r.turno),
          cargo: Number(r.cargo),
          label: r.label as string,
        }))
        .sort((a, b) => a.ano - b.ano || a.cargo - b.cargo || a.turno - b.turno);
    },
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
}

/** Ranking estadual de candidatos do recorte (agregado no banco). */
export function useCandidatosHistoricos(ano: number, turno: number, cargo: number) {
  return useQuery({
    queryKey: ['hist-candidatos', ano, turno, cargo],
    queryFn: async (): Promise<CandidatoAgg[]> => {
      const { data, error } = await db.rpc('hist_candidatos' as any, {
        p_ano: ano,
        p_turno: turno,
        p_cargo: cargo,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        nome: r.nm_candidato as string,
        partido: r.sg_partido as string,
        numero: r.nr_candidato as string,
        votos: Number(r.votos),
        pct: Number(r.pct ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Votos por município do candidato selecionado (agregado no banco). */
export function useMunicipiosHistoricos(
  ano: number,
  turno: number,
  cargo: number,
  candidato: string | null,
) {
  return useQuery({
    queryKey: ['hist-municipios', ano, turno, cargo, candidato],
    enabled: !!candidato,
    queryFn: async (): Promise<MunicipioAgg[]> => {
      const { data, error } = await db.rpc('hist_municipios' as any, {
        p_ano: ano,
        p_turno: turno,
        p_cargo: cargo,
        p_candidato: candidato,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        codigoIbge: String(r.cd_municipio_ibge),
        nome: r.nm_municipio as string,
        votos: Number(r.votos),
        pct: Number(r.pct ?? 0),
        lat: r.lat != null ? Number(r.lat) : null,
        lng: r.lng != null ? Number(r.lng) : null,
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

export interface RegiaoAgg {
  regiao: string;
  votos: number;
  totalRegiao: number;
  pct: number;
}

/** Percentual do candidato/recorte agregado por mesorregião IBGE (para cruzar com pesquisas). */
export function useRegioesHistoricas(
  ano: number,
  turno: number,
  cargo: number,
  candidato: string | null,
) {
  return useQuery({
    queryKey: ['hist-regioes', ano, turno, cargo, candidato],
    enabled: !!candidato,
    queryFn: async (): Promise<RegiaoAgg[]> => {
      const { data, error } = await db.rpc('hist_regioes' as any, {
        p_ano: ano,
        p_turno: turno,
        p_cargo: cargo,
        p_candidato: candidato,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        regiao: r.regiao as string,
        votos: Number(r.votos),
        totalRegiao: Number(r.total_regiao),
        pct: Number(r.pct ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}

export interface MunicipioBase {
  codigoIbge: string;
  nome: string;
  regiao: string | null;
  lat: number | null;
  lng: number | null;
}

/** Cadastro dos municípios de MT (nome, região, centróide). */
export function useMunicipiosMT() {
  return useQuery({
    queryKey: ['municipios-mt-base'],
    queryFn: async (): Promise<MunicipioBase[]> => {
      const { data, error } = await db
        .from('municipios' as any)
        .select('codigo_ibge, nome, regiao, latitude, longitude')
        .order('nome');
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        codigoIbge: String(r.codigo_ibge),
        nome: r.nome as string,
        regiao: (r.regiao as string) ?? null,
        lat: r.latitude != null ? Number(r.latitude) : null,
        lng: r.longitude != null ? Number(r.longitude) : null,
      }));
    },
    staleTime: 1000 * 60 * 60,
  });
}

export interface LocalVotacaoAgg {
  key: string;
  nome: string;
  municipio: string;
  endereco: string | null;
  lat: number;
  lng: number;
  votos: number;
  totalLocal: number;
  pct: number;
}

/** Votos agregados por local de votação (dados por seção com geolocalização). */
export function useLocaisVotacao(
  ano: number,
  turno: number,
  cargo: number,
  candidato: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['hist-locais', ano, turno, cargo, candidato],
    enabled: enabled && !!candidato,
    queryFn: async (): Promise<LocalVotacaoAgg[]> => {
      const { data, error } = await db.rpc('hist_locais_votacao' as any, {
        p_ano: ano,
        p_turno: turno,
        p_cargo: cargo,
        p_candidato: candidato,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(r => ({
        key: String(r.local_key),
        nome: (r.nm_local as string) ?? 'Local de votação',
        municipio: r.nm_municipio as string,
        endereco: (r.ds_endereco as string) ?? null,
        lat: Number(r.lat),
        lng: Number(r.lng),
        votos: Number(r.votos),
        totalLocal: Number(r.total_local),
        pct: Number(r.pct ?? 0),
      }));
    },
    staleTime: 1000 * 60 * 30,
  });
}
