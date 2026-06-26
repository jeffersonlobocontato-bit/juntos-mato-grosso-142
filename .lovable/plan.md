# Classificação semântica de sugestões populares por Eixo

## Objetivo
Detectar automaticamente, via IA, qual dos 5 Eixos Temáticos é o **principal** abordado em cada sugestão popular, a partir do texto livre enviado pelo cidadão. Quando não houver eixo claro, marcar como **"Não classificado"**.

## Comportamento definido
- **Escopo:** novas sugestões (no envio) **+** reprocessamento das antigas via botão no admin.
- **Resultado:** **um único eixo principal** por sugestão (gravado na coluna `eixo` já existente em `sugestoes_populares`).
- **Fallback:** texto vago/genérico → `eixo = "Não classificado"`.
- **Exibição:** apenas em `/admin/sugestoes` (tabela, filtros e card de distribuição já existentes passam a refletir a classificação da IA).

## Mudanças

### 1. Nova Edge Function `classify-suggestion-eixo`
- Recebe `{ sugestao_id, descricao }`.
- Pública para autenticados (sem exigir admin) para também ser chamada no envio público.
- Chama `ai.gateway.lovable.dev` (`google/gemini-2.5-flash`) com **tool call** estruturada cujos valores possíveis para `eixo` são exatamente:
  - Desenvolvimento Social
  - Desenvolvimento Econômico Sustentável
  - Desenvolvimento das Cidades e Infraestrutura
  - Gestão Pública Eficiente
  - Segurança, Justiça, Combate à Corrupção
  - Não classificado
- Retorna `{ eixo, confianca, justificativa }` e grava `eixo` em `sugestoes_populares` (via service role). A `justificativa` é salva em `analise_semantica.eixo_classificacao` para auditoria.

### 2. Fluxo público (`OpinionFormCard.tsx`)
- Após o `insert` bem-sucedido em `sugestoes_populares`, invocar `classify-suggestion-eixo` em segundo plano (fire-and-forget, sem bloquear o "obrigado").
- A chamada atual a `analyze-suggestion` permanece como está (continua exigindo admin e roda só quando o admin reprocessa por tema).

### 3. Admin (`/admin/sugestoes`)
- Adicionar botão **"Reclassificar Eixos (IA)"** no cabeçalho, ao lado de "Exportar CSV".
- Ao clicar: itera pelas sugestões filtradas (ou todas, se nenhum filtro), chama `classify-suggestion-eixo` em lotes pequenos (3 em paralelo) com toast de progresso e refetch ao final.
- Badge do eixo na tabela ganha tratamento visual para `"Não classificado"` (cinza neutro).
- O `eixoColors` recebe a chave `"Não classificado"`.

## Detalhes técnicos

- **Sem migração de schema.** A coluna `sugestoes_populares.eixo` (text) já existe e é usada na lista — basta passar a gravá-la via IA.
- **Prompt da IA:** instrução curta com a lista fechada dos 5 eixos + a opção "Não classificado", pedindo o eixo predominante. Tool schema com `enum` força a resposta a um dos valores válidos.
- **Custos / rate limit:** reprocessamento em lotes de 3 com pequeno `await` entre lotes; tratar 429/402 com toast claro.
- **Segurança:** a função valida JWT do chamador (precisa estar autenticado — válido para o form público com chave anon) e usa service role apenas para o `update`.
- **Sem mudanças** em `analyze-suggestion`, dashboards, mapa ou exportação CSV (que já lê `s.eixo`).
