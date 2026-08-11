// Utilitários de análise textual client-side — geram nuvem de palavras e
// detecção de "dor" dominante por região a partir do texto real das
// sugestões já carregadas (sem chamada extra ao banco).

const STOPWORDS_PT = new Set(`
a o os as um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre
que quem qual quais e ou mas se nao sim ja ainda muito mais menos tao pouco pouca
como quando onde porque pois entao assim ate desde apos ante contra entre perante
eu tu ele ela nos vos eles elas me te se lhe lhes meu minha meus minhas teu tua teus tuas
seu sua seus suas nosso nossa nossos nossas isso isto aquilo esse essa esses essas este esta
estes estas aquele aquela aqueles aquelas ser estar ter haver ir vir fazer poder dever
sou es e somos sois sao era eras eramos ereis eram fui foste foi fomos fostes foram
serei seras sera seremos sereis serao seria serias seriamos serieis seriam
tenho tens tem temos tendes tinha tinhas tinhamos tinheis tinham
vai vou vamos vao ia iam mais bem mal tudo nada todo toda todos todas algo alguem
ninguem cada outro outra outros outras tao la ca aqui ali foram sera seria pode podem
poderia poderiam meu minha nosso nossa vosso vossa etc tambem entretanto porem contudo
todavia sr sra dr dra vou pra pro pras pros num numa nesse nessa nesta neste naquele
naquela deve deveria precisa precisam precisava gostaria gostariamos acho acredito
parana governo governador candidato eleitoral eleicao voto
`.split(/\s+/).filter(Boolean));

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function contarPalavras(textos: string[], max = 30): Array<{ palavra: string; freq: number }> {
  const counts = new Map<string, number>();
  for (const texto of textos) {
    const limpo = stripAccents(texto.toLowerCase()).replace(/[^a-z\s]/g, ' ');
    for (const palavra of limpo.split(/\s+/)) {
      if (palavra.length < 3) continue;
      if (STOPWORDS_PT.has(palavra)) continue;
      counts.set(palavra, (counts.get(palavra) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([palavra, freq]) => ({ palavra, freq }));
}

// Categorias de "dor" — mesmas usadas na análise original, pra manter
// consistência entre o relatório estático e o painel vivo.
export const CATEGORIAS_DOR: Record<string, string[]> = {
  'Saúde': ['saude', 'hospital', 'medico', 'upa', 'atendimento medico', 'ubs', 'remedio'],
  'Segurança': ['seguranca', 'violencia', 'roubo', 'furto', 'policia', 'policial', 'drogas', 'trafico', 'assalto'],
  'Infraestrutura/estradas': ['asfalto', 'estrada', 'rodovia', 'buraco', 'pavimentacao', 'ponte', 'iluminacao'],
  'Educação': ['educacao', 'escola', 'professor', 'creche', 'universidade', 'ensino'],
  'Emprego/renda': ['emprego', 'desemprego', 'renda', 'salario', 'trabalho'],
};

export function dorDominante(textos: string[]): { categoria: string; pct: number } | null {
  if (textos.length === 0) return null;
  const textoNorm = textos.map(t => stripAccents(t.toLowerCase()));
  let melhor: { categoria: string; menções: number } | null = null;
  for (const [categoria, termos] of Object.entries(CATEGORIAS_DOR)) {
    const menções = textoNorm.filter(t => termos.some(termo => t.includes(termo))).length;
    if (!melhor || menções > melhor.menções) melhor = { categoria, menções };
  }
  if (!melhor || melhor.menções === 0) return null;
  return { categoria: melhor.categoria, pct: Math.round((melhor.menções / textos.length) * 100) };
}
