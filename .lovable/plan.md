## Diagnóstico

O Analytics mostra o total real de sugestões porque usa `count: 'exact'` (ex.: 1.037 no log de rede). Já o Dashboard e a página de Sugestões carregam as linhas em si com `.select(...)` sem paginação — e o PostgREST corta em 1.000 linhas por padrão. Por isso o painel "trava" em 1.000 cadastros mesmo quando o total real já passa disso.

Arquivos afetados:
- `src/pages/Dashboard.tsx` (linha 70): `supabase.from("sugestoes_populares").select("id, eixo, municipio, created_at")` — sem paginação.
- `src/pages/AdminSugestoes.tsx` (linhas 128-131): `.select('*').order(...)` — mesma limitação; a lista de sugestões e os filtros também ficam capados em 1.000.

## Correção

Aplicar paginação em lote (mesmo padrão já usado no `AdminAnalytics.tsx` para `sugestoes-periodo-ranking`), iterando com `.range(from, to)` até esgotar as linhas.

1. **`src/pages/Dashboard.tsx`** — substituir o `queryFn` de `dashboard-sugestoes` por um loop paginado (`PAGE_SIZE = 1000`, teto de segurança 100.000) que concatena todas as páginas de `id, eixo, municipio, created_at` ordenadas por `created_at`.
2. **`src/pages/AdminSugestoes.tsx`** — reescrever `fetchSugestoes` com o mesmo loop paginado, mantendo `order('created_at', ascending: false)` e `select('*')`.

## Validação

- No Dashboard, o card/contagem de sugestões passa a bater com o número mostrado no Analytics (>1.000).
- Em `/admin/sugestoes`, a listagem passa a exibir todas as sugestões e os filtros por município/eixo consideram o dataset completo.
- Analytics continua igual (já estava correto).

Sem mudanças de schema, RLS, edge functions ou UI — apenas remoção do teto de 1.000 linhas em duas consultas.
