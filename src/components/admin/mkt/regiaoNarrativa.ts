// Gera a narrativa regional (leitura + foco de mídia) a partir dos dados
// reais já carregados no painel, quando não existe narrativa curada no banco.
import { contarPalavras } from './textAnalysis';

export interface NarrativaInput {
  regiao: string;
  total: number;
  totalEstado: number;
  temas: Array<{ eixo: string; total: number }>;
  femPct: number;
  mascPct: number;
  dor: { categoria: string; pct: number } | null;
  textos: string[];
}

const FOCO_POR_EIXO: Record<string, string> = {
  'Desenvolvimento Social': 'Peças com rosto e rotina: saúde, escola e creche contados em tempo de espera e vaga conquistada, não em verba. Priorizar vídeo curto vertical e depoimento real de moradora da região.',
  'Desenvolvimento das Cidades e Infraestrutura': 'Territorialidade nomeada: citar o trecho, a estrada, o bairro. Imagem de campo/rodovia com dado de prejuízo por hora parada converte mais que discurso de obra.',
  'Desenvolvimento Econômico Sustentável': 'Linguagem de produtividade e escoamento — prazo, custo, mercado. Formatos: reels com produtor local e carrossel com número de geração de emprego da microrregião.',
  'Segurança, Justiça, Combate à Corrupção': 'Tom de competência técnica, nunca bravata. Dado local + autoridade técnica no mesmo enquadramento; evitar imagem de choque.',
  'Gestão Pública Eficiente': 'Prova de eficiência: menos fila, menos papel, mais resposta. Peças comparativas discretas e linguagem de resultado medido.',
  'Geral': 'Público de expectativa ampla: conteúdo que narra resultado concreto na vida da pessoa, sem categoria de governo. Awareness e convite à participação.',
};

export function gerarNarrativaRegiao(i: NarrativaInput): { nota: string; foco: string } {
  const share = i.totalEstado > 0 ? (i.total / i.totalEstado) * 100 : 0;
  const [t1, t2] = i.temas;
  const totalTemas = i.temas.reduce((s, t) => s + Number(t.total), 0) || 1;
  const pct1 = t1 ? Math.round((Number(t1.total) / totalTemas) * 100) : 0;
  const pct2 = t2 ? Math.round((Number(t2.total) / totalTemas) * 100) : 0;
  const palavras = contarPalavras(i.textos, 6).map(p => p.palavra);

  const peso =
    share >= 15 ? `região de peso alto na base (${share.toFixed(1)}% de tudo que o estado enviou)`
    : share >= 7 ? `região de peso médio na base (${share.toFixed(1)}% do total do estado)`
    : `região de baixo volume na base (${share.toFixed(1)}% do total) — o silêncio aqui é sintoma de alcance de mídia, não de falta de demanda`;

  const genero =
    Math.abs(i.femPct - i.mascPct) <= 8
      ? 'A escuta está equilibrada entre homens e mulheres, o que permite peça única sem recorte de gênero.'
      : i.femPct > i.mascPct
        ? `Quem fala aqui é majoritariamente mulher (${i.femPct}%) — o vocabulário de cuidado, tempo e fila pesa mais que o de investimento.`
        : `Quem fala aqui é majoritariamente homem (${i.mascPct}%) — o vocabulário de trabalho, custo e escoamento pesa mais que o de cuidado.`;

  const tema = t1
    ? `A demanda dominante é ${t1.eixo} (${pct1}% das sugestões classificadas)${t2 ? `, seguida de ${t2.eixo} (${pct2}%)` : ''}.`
    : 'Ainda não há tema dominante estatisticamente claro nesta região.';

  const dor = i.dor
    ? ` A dor mais citada no texto livre é ${i.dor.categoria}, presente em ${i.dor.pct}% das mensagens da região.`
    : '';

  const voz = palavras.length
    ? ` As palavras que mais aparecem na voz do eleitor daqui: ${palavras.join(', ')}.`
    : '';

  const nota = `${i.regiao} é ${peso}, com ${i.total.toLocaleString('pt-BR')} sugestões. ${tema}${dor} ${genero}${voz}`;

  const focoBase = FOCO_POR_EIXO[t1?.eixo ?? 'Geral'] ?? FOCO_POR_EIXO['Geral'];
  const focoVolume = share < 7
    ? ' Prioridade tática: ampliar alcance pago local e presença física antes de prometer política pública específica.'
    : ' Prioridade tática: aprofundar a mensagem já validada e usar depoimento local como prova.';

  return { nota, foco: `${focoBase}${focoVolume}` };
}
