
## Diagnóstico (confirmado no banco)

Consultei `page_analytics_events` dos últimos 7 dias e **só existe 1 tipo de evento gravado: `pageview` (1.534 registros)**. Nenhum `click`, `share`, `component_view`, `session_end` ou `form_submit` foi registrado.

**Causa raiz:** quando a Home foi reescrita (HomeHero + OpinionFormCard + etc.), os atributos `data-component=...` e as chamadas de `trackComponentClick / trackShare / trackFormSubmit` não foram levados para os novos componentes. O `AnalyticsTracker` procura elementos que não existem mais, e o hook `useAnalytics` só é chamado para pageview. Além disso, `scroll_depth` e `time_on_page` só sobem no `session_end` (beforeunload), que praticamente não dispara em mobile.

Por isso ficam zerados hoje: **Clicks totais, Shares totais, Média de tempo na página, Profundidade média de scroll, Heatmap de componentes, Ranking de componentes mais clicados**.

## Objetivo

Fazer o dashboard refletir a realidade: medir o que dá para medir com a Home atual, e tirar do dashboard os cards/gráficos que dependem de dados que a Home nova não produz.

## Escopo das mudanças

### 1. Instrumentar a Home nova (frontend)

Adicionar em `src/components/landing/home/HomeHero.tsx`, `OpinionFormCard.tsx`, `AudioRecorderBlock.tsx`, `HomeFooter.tsx`, `LiveCounterCard.tsx`, `HeroPortrait.tsx`, `SuggestionConfirmationMap.tsx`:

- `data-component="..."` nos wrappers principais (Hero, OpinionForm, AudioRecorder, Footer, LiveCounter, ConfirmationMap) para o `IntersectionObserver` do `AnalyticsTracker` voltar a gerar `component_view`.
- Atualizar a lista `componentNames` do `AnalyticsTracker.tsx` para os nomes reais da nova Home (remover os componentes antigos que não existem mais).
- Chamadas `trackComponentClick` nos CTAs principais: "Enviar opinião", "Enviar opinião agora" (rodapé), "Registrar geolocalização", "Ver meu pin no mapa", botão de gravar áudio, botão de parar gravação.
- `trackFormSubmit("OpinionForm", success)` no submit da sugestão (sucesso e erro).
- `trackShare(platform, "HomeShare")` em qualquer botão de compartilhamento presente (se houver na Home nova; caso contrário, este ponto some).

### 2. Enviar scroll depth e tempo na página de forma confiável

No `src/hooks/useAnalytics.tsx`:

- Adicionar um beacon periódico de "heartbeat" (a cada 30s enquanto a aba está visível) que registra evento `engagement` com `scroll_depth` e `time_on_page` atuais.
- Manter o `session_end` no `beforeunload` + adicionar `visibilitychange → hidden` (funciona em iOS Safari, onde `beforeunload` não dispara).
- Ajustar os cálculos de "Tempo médio na página" e "Scroll médio" no `AdminAnalytics.tsx` para considerar apenas eventos que carregam esses campos (`session_end` + `engagement`), não a média de todos os eventos (hoje divide por N pageviews com valor 0, puxando a média para baixo).

### 3. Limpar o dashboard do que não dá pra medir de forma honesta

Em `src/pages/AdminAnalytics.tsx`:

- Remover (ou esconder quando `=0` no período) os cards/gráficos que dependem de dados hoje ausentes e que não serão instrumentados nesta rodada: **Heatmap de componentes (Treemap)** e o gráfico de barras de "Componentes mais clicados", que só faz sentido depois que a Home ganhar `data-component` (item 1).
- Adicionar um estado vazio ("Sem dados no período") em cada card/gráfico em vez de mostrar "0" cru, para deixar claro que é ausência de tráfego e não bug.
- Adicionar uma nota curta no card de "Cliques" / "Compartilhamentos" explicando que esses eventos passam a contar após a instrumentação nova entrar no ar.

### 4. Validação

- Rodar `psql` para confirmar que, após a mudança, novos `component_view`, `click`, `form_submit` e `engagement` aparecem em `page_analytics_events`.
- Abrir `/admin/analytics` e confirmar que cards antes zerados agora mostram números coerentes ou o estado vazio correto.

## Fora de escopo

- Nenhuma alteração em RLS, esquema de banco, Meta Pixel/CAPI ou lógica do formulário de sugestão.
- Nenhuma mudança visual na Home além de atributos `data-component` e handlers de tracking (transparente para o usuário final).

## Perguntas antes de implementar

1. Prefere que eu **remova de vez** os cards de "Heatmap de componentes" e "Componentes mais clicados", ou que eu os **mantenha escondidos** até haver dados?
2. Posso instrumentar `trackShare` nos CTAs de compartilhamento existentes na Home (WhatsApp / redes) — confirma que quer esse tracking ativo?
