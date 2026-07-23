
## Diagnóstico

O painel `/admin/analytics` não travou por bug novo — está batendo no **limite padrão de 1000 linhas** que o PostgREST aplica quando não há `range()`/`limit()` explícito.

Dados atuais confirmados no banco:
- Total de eventos em `page_analytics_events`: **4.413**
- Últimos 7 dias: **1.245** eventos
- Últimas 24h: 949 eventos

A query em `src/pages/AdminAnalytics.tsx` (linhas 96-108) faz:

```ts
supabase.from('page_analytics_events').select('*').gte('created_at', startDate).order(..., { ascending: false })
```

Sem paginação, o cliente recebe no máximo 1.000 linhas — as **mais recentes**. Efeitos visíveis:
- Contadores de "visualizações" travam em ~1.000.
- Séries temporais (engajamento por dia/hora) perdem os pontos mais antigos do período, então a curva "despenca" na borda esquerda.
- Períodos maiores (30d/90d/all) ficam progressivamente mais distorcidos.

Nenhum evento foi perdido; eles estão todos no banco.

## Correção

Trocar a query única por uma **busca paginada** que percorre todo o intervalo em lotes de 1.000, até esgotar os resultados.

### Passos

1. **`src/pages/AdminAnalytics.tsx`** — refatorar o `queryFn` do `useQuery(['analytics-events', period])`:
   - Loop com `.range(from, from + PAGE_SIZE - 1)` (PAGE_SIZE = 1000).
   - Parar quando o lote retornar menos que `PAGE_SIZE`.
   - Concatenar todos os lotes antes de retornar.
   - Selecionar apenas as colunas usadas nos gráficos (em vez de `*`) para reduzir payload — inspecionar o arquivo inteiro para listar campos consumidos (event_type, component_name, component_action, page_path, referrer, utm_*, device_type, browser, os, country, region, city, scroll_depth, time_on_page, session_id, visitor_id, metadata, created_at).
   - Manter o `order('created_at', { ascending: false })` para determinismo entre páginas.

2. **Guard-rail de tamanho** — adicionar um teto defensivo (ex.: `MAX_ROWS = 50_000`) para períodos "all" muito grandes não estourarem memória do browser; se atingir, mostrar um aviso discreto no topo do painel ("Exibindo os N eventos mais recentes do período").

3. **Sem mudanças de schema** e sem tocar em RLS — a paginação resolve inteiramente o sintoma.

## Verificação

Depois de aplicar:
- Selecionar "7 dias" e conferir que o contador total de eventos passa de 1.000 e bate com `SELECT count(*) FROM page_analytics_events WHERE created_at >= now() - interval '7 days'`.
- Conferir que o gráfico de engajamento volta a ter a curva completa nos dias mais antigos do período.
- Testar "30 dias" e "90 dias" para garantir que o loop de paginação termina e a UI não congela.

## Fora do escopo (proposta para depois, se quiser)

Para períodos grandes (30d+) o ideal a médio prazo é substituir o fetch bruto por **RPCs de agregação** no Postgres (série temporal, contagens por componente/canal já agregadas), retornando dezenas de linhas em vez de milhares. Isso reduz custo de rede e CPU do browser. Posso planejar isso num passo seguinte se quiser.
