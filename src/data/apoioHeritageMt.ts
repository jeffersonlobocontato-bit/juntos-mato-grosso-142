// Dados da pesquisa PercentBrasil MT — Agosto/2026
// Blocos que não cabem no modelo candidato × percentual:
// (1) Apoio de políticos para transferência de votos
// (2) Conhecimento da Operação Heritage (PF na casa do ex-governador Mauro Mendes)

export const APOIO_HERITAGE_FONTE = {
  instituto: 'PercentBrasil',
  divulgacao: 'Agosto/2026',
  territorio: 'Mato Grosso',
};

export interface ApoioLinha {
  politico: string;
  aumentaria: number;
  naoAltera: number;
  diminui: number;
  nsnr: number;
}

export const APOIO_PERGUNTA =
  '“Vou citar o nome de políticos e gostaria que me dissesse, se com o apoio desse político a um candidato a governador(a), o senhor(a)...”';

export const APOIO_TRANSFERENCIA: ApoioLinha[] = [
  { politico: 'Prefeito de Cuiabá Abílio Brunini (PL)', aumentaria: 16.2, naoAltera: 54.8, diminui: 11.8, nsnr: 17.2 },
  { politico: 'Ex-governador Blairo Maggi', aumentaria: 15.2, naoAltera: 57.4, diminui: 7.4, nsnr: 20.0 },
  { politico: 'Senador Jayme Campos (UB)', aumentaria: 14.9, naoAltera: 56.7, diminui: 12.4, nsnr: 16.0 },
  { politico: 'Produtor Rural Eraí Maggi', aumentaria: 8.3, naoAltera: 62.4, diminui: 7.0, nsnr: 22.3 },
  { politico: 'Deputado estadual Max Russi (Podemos)', aumentaria: 8.1, naoAltera: 64.0, diminui: 7.1, nsnr: 20.8 },
  { politico: 'Prefeita de Várzea Grande Flávia Moretti (PL)', aumentaria: 7.5, naoAltera: 61.5, diminui: 9.6, nsnr: 21.4 },
  { politico: 'Prefeito de Rondonópolis Cláudio Ferreira (PL)', aumentaria: 7.3, naoAltera: 62.1, diminui: 7.6, nsnr: 23.0 },
  { politico: 'Prefeito de Sinop Roberto Dorner (PL)', aumentaria: 6.9, naoAltera: 61.8, diminui: 7.3, nsnr: 24.0 },
];

export const HERITAGE_PERGUNTA =
  '“O senhor(a) ficou sabendo da Operação da Polícia Federal que ocorreu nessa semana, na casa do ex-governador Mauro Mendes?” (para todos)';

export const HERITAGE_TOTAL = { sim: 45.5, nao: 54.5 };

export interface HeritageRegiao {
  regiao: string;
  sim: number;
  nao: number;
}

export const HERITAGE_POR_REGIAO: HeritageRegiao[] = [
  { regiao: 'Centro Sul', sim: 46.0, nao: 54.0 },
  { regiao: 'Médio Norte', sim: 48.8, nao: 51.2 },
  { regiao: 'Nordeste', sim: 26.7, nao: 73.3 },
  { regiao: 'Noroeste', sim: 48.5, nao: 51.5 },
  { regiao: 'Norte', sim: 46.9, nao: 53.1 },
  { regiao: 'Oeste', sim: 37.8, nao: 62.2 },
  { regiao: 'Sudeste', sim: 51.3, nao: 48.7 },
];

export const HERITAGE_ACHADO =
  'Apenas a região Sudeste tem um índice mais alto de eleitores que tomaram conhecimento da Operação Heritage, deflagrada contra o ex-governador Mauro Mendes e seus aliados.';
