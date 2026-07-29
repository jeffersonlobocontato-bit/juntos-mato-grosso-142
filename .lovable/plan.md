# Cidades sem sugestões populares — botão no Analytics

## O que faz
Novo botão em `/admin/analytics`, ao lado dos rankings de cidades, chamado **"Cidades sem participação"**. Ao clicar, abre um modal com:

- Contagem: "X de 399 municípios ainda sem nenhuma sugestão registrada".
- Lista completa dos municípios ausentes, ordenada alfabeticamente, com região (quando disponível).
- Campo de busca para filtrar pelo nome.
- Botão **"Exportar CSV"** para baixar a lista (nome, região, código IBGE).

## Como funciona (técnico)
- Consulta 1: `SELECT id, nome, regiao, codigo_ibge FROM municipios ORDER BY nome` (paginado em lotes de 1.000, mesmo padrão já usado no Dashboard, para garantir os 399).
- Consulta 2: `SELECT DISTINCT municipio FROM sugestoes_populares` (também paginado, teto 100k).
- Diff no client: municípios cuja `nome` (normalizado — trim + lowercase + sem acento) não aparece na lista de sugestões.
- Exportação CSV feita no client (Blob), sem dependência nova.

## Arquivos
- `src/pages/AdminAnalytics.tsx` — adicionar botão na seção de Top Cidades e estado do modal.
- `src/components/admin/CidadesSemParticipacaoModal.tsx` (novo) — modal com busca, lista e export CSV, usando shadcn `Dialog`, `Input`, `Button`, `ScrollArea`.

Sem mudanças de schema, RLS ou edge functions.

## Validação
- Total exibido + total com sugestões = 399.
- Busca filtra em tempo real.
- CSV baixa com todos os municípios ausentes.
