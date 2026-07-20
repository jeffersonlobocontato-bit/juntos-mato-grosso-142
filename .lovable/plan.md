
## Objetivo

Duas melhorias na Home (`/`):

1. Card "big number" com contador vivo de sugestões entre o card verde "Participe Agora!" e o CTA de rodapé "Enviar Opinião Agora".
2. Nova tela de agradecimento após envio da opinião, com CTA que leva a pessoa até o próprio pin geolocalizado no mapa do Paraná, com popup exibindo os dados que ela cadastrou.

---

## 1. Contador vivo de sugestões

**Novo componente:** `src/components/landing/home/LiveCounterCard.tsx`

- Base fake: `3852`.
- Ao montar: consulta `select count from sugestoes_populares where origem = 'formulario'` (via `supabase`) e mostra `3852 + count`.
- Assina Realtime em `sugestoes_populares` (INSERT) para incrementar +1 ao vivo.
- Animação de "count up" (reutilizar padrão de `LiderancasStats.tsx`).
- Visual alinhado ao design system da home: card grande, tipografia display, número em destaque com cor `accent` (dourado), fundo escuro/gradiente, ícone (MessageCircle/Users), microcopy: "opiniões já recebidas de paranaenses".

**Posicionamento:** inserir em `HomeHero.tsx` (ou no wrapper da home) entre o bloco do `ParticiparAgoraCard` e o CTA "Enviar Opinião Agora" do rodapé — largura total do container.

---

## 2. Tela de agradecimento + pin no mapa

**Alterações em `OpinionFormCard.tsx`:**

- Ao inserir com sucesso em `sugestoes_populares`, guardar `insertedId` e os dados enviados (nome, telefone, cidade, sugestão).
- Recuperar `lat/lng` do município escolhido: alterar a query inicial para `select id, nome, latitude, longitude` (colunas já existem em `municipios`).
- Substituir o bloco `sent` atual por uma tela de agradecimento redesenhada:
  - Título forte: "Obrigado, {primeiro nome}!"
  - Copo valorizando a contribuição (impacto no plano, transparência, próximos passos).
  - Botão primário "Ver minha opinião no mapa" que:
    - Faz scroll suave até uma nova seção `#minha-opiniao-no-mapa` renderizada logo abaixo.
    - Essa seção contém `SuggestionConfirmationMap` já existente, ampliado (h-[420px]), centralizado no município, com popup aberto exibindo: nome, cidade, trecho da sugestão (truncado ~200 chars). Popup clicável mantém aberto ao clicar no pin.
  - Botão secundário "Enviar outra opinião" (reset do form).

**Ajuste no `SuggestionConfirmationMap.tsx`:**

- Aceitar props opcionais `nome`, `sugestao` para compor o popup.
- Tornar `interactive: true` para permitir zoom/clique no pin.
- Popup deve reabrir ao clicar no marcador (listener `click`).
- Altura configurável via prop.

**Fallback:** se o município não tiver `latitude/longitude`, mostrar apenas a mensagem de agradecimento sem o mapa (sem quebrar).

---

## Detalhes técnicos

- Realtime: habilitar canal `postgres_changes` filtrado por `event: INSERT` em `public.sugestoes_populares`. Sem alteração de schema/RLS — a tabela já permite insert público.
- Nenhuma migração necessária (colunas `latitude`/`longitude` já existem em `municipios`).
- Nenhuma alteração de backend/edge function.
- Sem novas dependências.

---

## Arquivos afetados

```text
src/components/landing/home/LiveCounterCard.tsx        (novo)
src/components/landing/home/HomeHero.tsx               (inserir LiveCounterCard)
src/components/landing/home/OpinionFormCard.tsx        (nova tela sent + mapa)
src/components/landing/SuggestionConfirmationMap.tsx   (props extras, interativo)
```
