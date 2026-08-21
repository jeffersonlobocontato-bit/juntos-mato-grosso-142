// Estrutura portada do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br),
// que usa a matriz de convergência de O'Cathain, Murphy & Nicholl (2010) para cruzar
// pesquisa quantitativa (survey) com pesquisa qualitativa (grupos focais).
//
// [PENDENTE — Cruzamento Wellington]
// O conteúdo de dados original (fontes, achados, classificação Agreement/Partial
// Agreement/Dissonance/Silence, insights de marketing) é pesquisa eleitoral REAL e
// específica da campanha de Sergio Moro no Paraná (fonte: VOX Brasil TSE PR-09668/2026;
// pesquisa qualitativa mai/2026, 16 grupos focais em 5 cidades do PR) — não pode ser
// reaproveitado trocando nomes para Wellington/Mato Grosso, pois isso fabricaria
// pesquisa eleitoral inexistente. Preencher com pesquisa quali-quanti REAL de Mato
// Grosso quando disponível, seguindo exatamente esta mesma estrutura de tipos.

export const DATA_CRUZAMENTO_WELLINGTON = {
  fontes: {
    quanti: "",
    quali: "",
  },
  limitacoes: [] as string[],
  analiseQualitativaIsolada: null as null | {
    descricao: string;
    fichaMetodologica: {
      cobertura: string;
      lacunas: string[];
      recomendacao: string;
    };
    diagnosticoMacro?: {
      titulo: string;
      achado: string;
      forcaDoAchado: string;
      leituraLula?: string;
    };
    tipologiaDireitaParanaense?: { subtipo: string; descricao: string }[];
    ratinhoEixoGravitacional?: { leitura: string; limiteDoEfeitoHalo: string };
    moroLeituraFechada?: {
      forca: string[];
      vulnerabilidadeCentral: string;
      autocriticaDoRelatorio?: string;
      segmentacaoInterna: string;
      condicionanteMaisCritico: string;
    };
    achadoMoroDeltanSubstituicao?: { titulo: string; achado: string; implicacao: string };
    outrosPlayers?: Record<string, string>;
    pautasEstaduaisTestadas?: Record<string, string>;
    tensaoInternaNaoResolvida?: { titulo: string; achado: string; implicacao: string };
  },
  abas: [] as {
    id: string;
    label: string;
    classificacao: 'agreement' | 'partial_agreement' | 'dissonance' | 'silence';
    classificacaoNota: string;
    media: number | null;
    barras: { seg: string; v: number }[];
    tema: string;
    leitura: string;
    gap: string;
    implicacao: string;
  }[],
  sintese: {
    agreement: [] as string[],
    partial_agreement: [] as string[],
    dissonance: [] as string[],
    silence: [] as string[],
    recomendacoes: [] as string[],
  },
  insightsMarketing: {
    avisoMetodologico: "",
    mapaEnfase: [] as { termo: string; peso: number; valencia: 'positiva' | 'negativa' | 'neutra' }[],
    obrigatorios: [] as { tema: string; justificativa: string; alvo: string }[],
    possiveis: [] as { tema: string; justificativa: string; alvo: string }[],
    irrelevantes: [] as { tema: string; risco: string; alvo: string }[],
  },
};

export type CruzamentoWellingtonData = typeof DATA_CRUZAMENTO_WELLINGTON;
