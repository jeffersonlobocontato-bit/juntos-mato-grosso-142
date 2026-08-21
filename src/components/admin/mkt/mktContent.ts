// Conteúdo curado — personas, argumentos por eixo e cases de sucesso.
// Números e narrativas regionais são ao vivo (vêm do banco); este arquivo
// guarda só o conteúdo analítico estável, no mesmo padrão do artefato
// original construído no chat.
//
// [PENDENTE — Juntos Mato Grosso 142]
// Este arquivo foi esvaziado intencionalmente na adaptação da plataforma
// Juntos Paraná 399 para Mato Grosso. O conteúdo original (personas,
// argumentos por eixo, cases de sucesso e riscos/vulnerabilidades) foi
// construído em cima de pesquisa qualitativa real do Paraná (16 grupos
// focais, mai/2026, cidades específicas do PR) e de vulnerabilidades
// pessoais específicas do candidato Sergio Moro — não pode ser reaproveitado
// para Mato Grosso trocando nomes, pois isso fabricaria pesquisa eleitoral
// inexistente. Preencher com pesquisa qualitativa/quantitativa real de MT
// quando disponível.

export interface Persona {
  nome: string;
  regioes: string;
  desc: string;
  emocional: string;
  racional: string;
  insights: string[];
  ganchos: string[];
  cuidados: string;
}

export const PERSONAS: Persona[] = [];

export interface CaseSucesso {
  eixo: string;
  titulo: string;
  local: string;
  dor: string;
  estrategia: string;
  resultado: string;
  licao: string;
}

export const CASES: CaseSucesso[] = [];

// Argumentos por eixo — extraídos do campo semântico das sugestões (ver
// nuvem de palavras ao vivo na própria aba Temas).
export const ARGUMENTOS_POR_EIXO: Record<string, string[]> = {};

// Riscos e vulnerabilidades — achados de pesquisa qualitativa real que a
// equipe de conteúdo não deve ignorar ao produzir peças pra campanha ao
// governo. Preencher com pesquisa real de Mato Grosso.
export interface RiscoVulnerabilidade {
  titulo: string;
  achado: string;
  implicacao: string;
  recomendacao: string;
}

export const RISCOS_VULNERABILIDADES: RiscoVulnerabilidade[] = [];
