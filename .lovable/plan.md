
## Diagnóstico

O `/admin/meu-painel` (dashboard principal do admin) executa **9 queries pesadas em paralelo** ao Supabase sem paginação nem limite de colunas. Com o crescimento recente da base (1.312 sugestões, propostas + joins, milhares de eventos de analytics, todos os leads, todos os `user_roles`, todos os `profiles`, todos os 399 municípios, todos os `ai_documents`), o volume trafegado em rede móvel/3G causa:

- carregamento lento (segundos a dezenas de segundos até renderizar);
- travamento intermitente quando alguma resposta demora e a query fica pendente sem `staleTime`;
- re-execução dupla das queries porque elas dependem de `userEixos` / `userMunicipios` que só chegam **depois** do primeiro render de `useUserAccess`, sem `enabled` para gatear;
- `page_analytics_events` puxando `*` do período inteiro (pode ser dezenas de milhares de linhas).

Além disso, `ProtectedRoute` e `useAuth` marcam `isLoading = false` dentro de cada evento de `onAuthStateChange`, o que em algumas conexões causa uma piscada de "Carregando…" contínua enquanto papéis ainda são buscados via `setTimeout(0)`.

## O que fazer

### 1. Reduzir o payload das queries em `src/pages/AdminMeuPainel.tsx`

Trocar `select("*")` por listas de colunas mínimas realmente usadas nos `useMemo` de métricas:

- `propostas_tecnicas`: `id, status, etapa, eixo_id, municipio_id, autor_id, titulo, entrevistado, created_at, updated_at` + joins já existentes.
- `sugestoes_populares`: `id, eixo, municipio, created_at`.
- `leads`: `id, origem, municipio, proposta_id, created_at`.
- `page_analytics_events`: `event_type, session_id, device_type, created_at` (removendo metadata/user_agent/etc.).
- `ai_documents`: já está enxuto, manter.
- `user_roles` / `profiles`: apenas para admin, já `enabled`, manter minimalismo (`id, full_name`).

### 2. Gatear queries até `useUserAccess` estar pronto

Adicionar `enabled: !accessLoading` (novo estado exposto pelo hook) nas queries que dependem de `userEixos`/`userMunicipios`/`userId` (propostas, sugestões, leads), evitando dupla execução (uma vez sem escopo, outra com escopo) e requisições descartáveis.

### 3. Cache mais tolerante em React Query

No `QueryClient` global (ou nas queries do painel) definir:

- `staleTime: 60_000`
- `refetchOnWindowFocus: false`
- `refetchOnMount: false` para dados de referência (eixos, municípios).

Isso elimina o comportamento de "buscando, buscando" a cada troca de aba.

### 4. Suavizar loading do admin

Em `src/hooks/useAuth.tsx`, só marcar `isLoading = false` **depois** que o fetch inicial de papéis retornar (ou pelo menos após `getSession` inicial), para o `ProtectedRoute` não redesenhar entre "sem papéis" e "com papéis".

Em `src/pages/AdminMeuPainel.tsx`, renderizar o esqueleto do dashboard imediatamente e mostrar spinners locais por card em vez de bloquear a página inteira até todas as queries responderem.

### 5. Analytics: recorte enxuto

Reduzir a query de `page_analytics_events` a apenas as colunas usadas (`event_type, session_id, device_type`) e continuar respeitando o filtro `gte("created_at", startDate)`. Se ainda vier acima de ~5k linhas em "12m/all", trocar por uma RPC/`analytics_query` agregada em SQL para retornar somente contadores (pageviews, sessions, breakdown por device).

## Detalhes técnicos

- Arquivos: `src/pages/AdminMeuPainel.tsx`, `src/hooks/useUserAccess.tsx` (expor `isLoading` como `accessLoading`), `src/hooks/useAuth.tsx`, `src/main.tsx` (config do `QueryClient`).
- Nenhuma mudança de schema; nenhuma migration.
- Nenhuma alteração em RLS/policies.
- Sem impacto nas rotas públicas.

## Validação

- Abrir `/admin/meu-painel` em rede lenta simulada; a página deve renderizar shell em <1s e os cards preencherem à medida que cada query responde.
- Verificar no DevTools/Network que cada tabela é consultada **uma vez** por sessão (não duas).
- Confirmar que o total de bytes recebidos cai substancialmente (esperado: >70% de redução no payload de `propostas_tecnicas` + `page_analytics_events`).
