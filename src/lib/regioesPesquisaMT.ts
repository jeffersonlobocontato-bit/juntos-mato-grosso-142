// Regiões usadas nas pesquisas (metodologia PercentBrasil) → mesorregiões IBGE
// do cadastro de municípios. Mapeamento é N:1 (várias regiões de pesquisa podem
// cair na mesma mesorregião) — é a mesma aproximação usada para pintar os pins
// de pesquisa no mapa de Histórico Eleitoral.
export const REGIAO_PESQUISA_TO_MESO: Record<string, string[]> = {
  'Norte': ['Norte Mato-grossense'],
  'Médio Norte': ['Norte Mato-grossense'],
  'Noroeste': ['Norte Mato-grossense'],
  'Nordeste': ['Nordeste Mato-grossense'],
  'Oeste': ['Sudoeste Mato-grossense'],
  'Centro Sul': ['Centro-Sul Mato-grossense'],
  'Sudeste': ['Sudeste Mato-grossense'],
};
