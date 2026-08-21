// ============================================================
// Typed data model for electoral research (pesquisas)
// Portado da plataforma Politiza IA (politiza.ia.br).
// Arrays de dados mockados/PR removidos — dados reais de MT
// entram via banco (electoral_surveys/survey_questions/survey_results),
// ver src/hooks/useSurveys.ts
// ============================================================

export type Cargo = 'governador' | 'senador' | 'presidente';
export type QuestionType = 'espontanea' | 'estimulada' | 'rejeicao' | 'aprovacao';
export type FilterType =
  | 'genero' | 'faixa_etaria' | 'escolaridade' | 'renda' | 'religiosidade'
  | 'regiao' | 'sexo' | 'idade' | 'posicionamento' | 'presidente'
  | (string & {});

export interface CandidateResult {
  candidate: string;
  percentage: number;
  color?: string;
}

export interface CrossTabRow {
  label: string;
  values: Record<string, number>;
}

export interface CrossTab {
  filterType: FilterType;
  filterLabel: string;
  /** 'segmento' = % dentro de cada segmento · 'perfil' = composição do eleitorado do candidato */
  basis?: 'segmento' | 'perfil';
  candidates: string[];
  rows: CrossTabRow[];
}


export interface PollQuestion {
  id: string;
  waveId: string;
  cargo: Cargo;
  questionType: QuestionType;
  scenarioLabel: string;
  results: CandidateResult[];
  crossTabs: CrossTab[];
  note?: string;
  isMultipleChoice?: boolean;
  isMainScenario?: boolean;
}

export interface ComparativoRow {
  wave: string;
  values: Record<string, number>;
}

export interface PollComparativo {
  id: string;
  waveId: string;
  cargo: Cargo;
  questionType: QuestionType;
  scenarioLabel: string;
  candidates: string[];
  rows: ComparativoRow[];
}

export interface PollWave {
  id: string;
  institute: string;
  territory: string;
  cargos: Cargo[];
  collectionStart: string;
  collectionEnd: string;
  releaseDate: string;
  sampleSize: number;
  marginOfError: number;
  methodology: string;
  tseRegistration: string;
  fileName?: string;
}

// Sem dados mockados/fallback — a Home busca tudo do banco via useSurveys().
export const pollWaves: PollWave[] = [];
export const pollQuestions: PollQuestion[] = [];
export const pollComparativos: PollComparativo[] = [];

// Cores por candidato — Governo/Senado de Mato Grosso 2026 (pesquisa PercentBrasil ago/2026)
export const CANDIDATE_COLORS: Record<string, string> = {
  'Wellington Fagundes':      '#0f7a32',
  'Otaviano Pivetta':         '#3b82f6',
  'Natasha Slhessarenko':     '#f59e0b',
  'Rafael Millas':            '#8b5cf6',
  'Sargento Lau':             '#14b8a6',
  'Maurício Coelho':          '#f97316',
  'Mauro Mendes':             '#3b82f6',
  'Janaina Riva':             '#ef4444',
  'José Medeiros':            '#0f7a32',
  'Carlos Fávaro':            '#a855f7',
  'Pedro Taques':             '#f59e0b',
  'Antonio Galvan':           '#6366f1',
  'Coronel Darwin':           '#14b8a6',
  'Margareth Buzetti':        '#f97316',
  'Professor Nelson Ferreira':'#22c55e',
  'Beny Godoy':               '#ec4899',
  'Nenhum/Branco/Nulo':       '#6b7280',
  'Nulo/Branco':              '#6b7280',
  'Nenhum':                   '#6b7280',
  'Não Sabe/Não Respondeu':   '#9ca3af',
  'NS/Indeciso':              '#9ca3af',
  'NS':                       '#9ca3af',
  'NR':                       '#9ca3af',
};
