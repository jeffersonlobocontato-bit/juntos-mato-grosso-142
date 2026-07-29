## Diagnóstico atual (medido no banco)

Rodei as consultas antes de propor qualquer código. Não há queda anômala nem bug de gravação de sugestões:

- **Sugestões nas últimas 8h** (03h–11h UTC ≈ 00h–08h BRT): **11 cadastros** (2, 2, 0, 0, 2, 2, 4, 1) — não 1.
- **`form_submit` com `success` bate 1:1** com as linhas inseridas em `sugestoes_populares` no mesmo intervalo. Zero erros de submit nas últimas 24h.
- **Tráfego pago (últimas 12h, path `/`)**: `ig / paid` = 146 pageviews → 29 conversões (~19,8%). Total geral: 305 pv → 65 subs (~21%).
- O intervalo em questão é madrugada+início da manhã, historicamente o vale da curva (picos ficam entre 19h–23h BRT com 9–14 subs/h).

**Conclusão:** o site está gravando corretamente. O “1 cadastro em 8h” muito provavelmente vem de outra fonte (Meta Ads Manager, um card específico do painel, ou leitura de intervalo diferente).

## Único sinal técnico anômalo

Console em produção reporta:
```
Warning: Function components cannot be given refs.
Check the render method of `SocialShareButtons`.
```
Origem: `motion.a` do framer-motion tentando passar `ref` para o componente `Icon` de lucide-react dentro de `src/components/landing/SocialShareButtons.tsx`. Não bloqueia envio do formulário, mas polui o console e pode mascarar erros reais em auditorias futuras.

## O que vou fazer (após aprovação)

### 1. Corrigir o warning do `SocialShareButtons`
- Ajustar `src/components/landing/SocialShareButtons.tsx` para que o `motion.a` receba um elemento nativo (não o componente `Icon`) — usar `<Icon />` como filho e deixar o `ref` no `<a>`. Sem mudança visual.

### 2. Painel de reconciliação de conversões
Adicionar em `src/pages/AdminAnalytics.tsx` um card "**Reconciliação de conversões (últimas 24h)**" mostrando lado a lado, por hora:
- Pageviews do path `/`
- `form_submit` sucesso
- Linhas realmente inseridas em `sugestoes_populares`
- Leads `formulario` criados

Objetivo: qualquer divergência entre esses quatro números fica visível imediatamente e a suspeita de "só 1 cadastro" é resolvida em segundos, sem depender de consulta ad-hoc.

### 3. Card comparativo Meta ↔ site
Ainda em `AdminAnalytics.tsx`, um bloco pequeno com:
- Conversões contabilizadas no site nas últimas 24h por `utm_source` (`ig`, `fb`, direto, etc.).
- Nota explícita: "se este número diverge do Meta Ads Manager, o problema é atribuição/CAPI, não o site" + link para verificar `META_CAPI_TEST_EVENT_CODE`.

### 4. Ajuste no `useAnalytics` para não perder `utm_source` em sessões longas
Hoje `getUTMParams()` lê da URL a cada evento. Se o visitante navegar/refresh, o UTM some. Passar a persistir os UTMs originais em `sessionStorage` (`rota399_utm`) e usá-los como fallback nos eventos subsequentes — melhora a atribuição de conversões vindas de tráfego pago sem alterar rota de dados.

## Detalhes técnicos

- Sem migrations. Sem mudanças em RLS ou schema.
- Alterações restritas a: `src/components/landing/SocialShareButtons.tsx`, `src/pages/AdminAnalytics.tsx`, `src/hooks/useAnalytics.tsx`.
- Nenhum comportamento da LP muda visualmente para o visitante.
- Queries do card de reconciliação usam `page_analytics_events` (já indexado por `created_at`) e `sugestoes_populares` com `count exact` — leves.

## Fora de escopo

- Não vou "aumentar" contagens artificialmente nem alterar o gatilho de `Lead` na Meta CAPI enquanto não confirmarmos que a discrepância vem de lá.
- Não vou mexer em `HomeHero.tsx` / formulário — os dados provam que ele está funcionando.
