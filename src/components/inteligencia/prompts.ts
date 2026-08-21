// Portado (versão genérica, sem táticas específicas contra adversários) da
// plataforma Politiza IA (politiza.ia.br). O original tinha uma tese de
// posicionamento e regras de contraste por adversário construídas em cima de
// pesquisa qualitativa real do Paraná — não reaproveitável para MT sem
// fabricar estratégia. Aqui ficam só as regras genéricas de rigor
// estatístico, vocabulário responsável e estrutura de resposta, que são
// boas práticas e não dados fabricados.

export const SUGESTOES_ANALISE: string[] = [
  'Transforme os dados atuais da pesquisa em um resumo executivo.',
  'Quais segmentos ou regiões merecem mais atenção com base nos dados disponíveis?',
  'Compare o desempenho de Wellington Fagundes entre os cenários espontânea e estimulada.',
  'O que os dados de rejeição sugerem sobre pontos de atenção?',
];

export interface AcaoRapida {
  id: string;
  label: string;
  prompt: string;
}

export const ACOES_RAPIDAS: AcaoRapida[] = [
  {
    id: 'resumo-executivo',
    label: 'Resumo executivo',
    prompt: 'Gere um RESUMO EXECUTIVO da pesquisa mais recente disponível no painel: principais números, cenários e o que eles indicam, citando sempre instituto, percentual e data.',
  },
  {
    id: 'leitura-regional',
    label: 'Leitura regional',
    prompt: 'A partir dos dados regionais disponíveis no painel (se houver), destaque onde Wellington Fagundes está mais forte e mais fraco.',
  },
  {
    id: 'segundo-turno',
    label: 'Cenários de 2º turno',
    prompt: 'Compare os cenários de segundo turno disponíveis no painel e explique o que cada um indica sobre a competitividade da candidatura.',
  },
];

export const INSIGHTS_JSON_PROMPT = `Gere uma LEITURA ESTRATÉGICA da pesquisa eleitoral de Mato Grosso disponível no contexto do painel, para a candidatura de Wellington Fagundes ao Governo do Estado.

Responda APENAS com um bloco JSON entre \`\`\`json e \`\`\` no formato exato abaixo. Sem texto antes ou depois. Sem comentários. Não invente números — cite institutos, percentuais e datas presentes no contexto. Se o contexto não tiver dado suficiente para preencher algum campo com honestidade, escreva "dados insuficientes no painel" nesse campo em vez de inventar.

\`\`\`json
{
  "leitura_principal":     { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "risco": "" },
  "ponto_de_atencao":      { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "risco": "" },
  "oportunidade":          { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "risco": "" },
  "publico_a_observar":    { "titulo": "", "dado_origem": "", "leitura": "", "acao": "", "risco": "" },
  "recomendacoes": ["", "", ""]
}
\`\`\`

Regras: vocabulário responsável (indícios/apontamentos/segundo pesquisa, nunca acusações não fundamentadas); nunca citar nomes de partidos ao falar de alianças; basear-se exclusivamente nos dados do contexto, nunca em conhecimento genérico ou suposição sobre o cenário eleitoral de MT.`;

export interface InsightItem {
  titulo: string;
  dado_origem: string;
  leitura: string;
  acao: string;
  risco: string;
}

export interface InsightsPayload {
  leitura_principal: InsightItem;
  ponto_de_atencao: InsightItem;
  oportunidade: InsightItem;
  publico_a_observar: InsightItem;
  recomendacoes: string[];
}
