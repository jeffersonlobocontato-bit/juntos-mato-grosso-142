## Diagnóstico

O erro `new row violates row-level security policy for table "sugestoes_populares"` não é falha na política de INSERT. É a política de SELECT bloqueando o retorno da linha recém-criada.

Reproduzido via API:
- INSERT puro → HTTP 201 ✅
- INSERT com `Prefer: return=representation` + `select=id` (o que o cliente faz hoje) → erro 42501 ❌

O código em `OpinionFormCard.tsx` faz `.insert(...).select("id").single()`, forçando o PostgREST a devolver a linha inserida. Para isso ele reavalia a política de SELECT (`is_admin OR admin_master OR lider_tematico OR curador_municipal`), que é falsa para visitantes anônimos → devolve o erro RLS genérico mesmo tendo persistido a linha. O `id` retornado é usado para chamar a edge `classify-suggestion-eixo`.

## Correções

### 1. Envio da sugestão (`src/components/landing/home/OpinionFormCard.tsx`)

- Gerar `sugestaoId` no cliente com `crypto.randomUUID()`.
- Enviar `id: sugestaoId` no payload do `.insert(...)` e remover o `.select("id").single()`.
- Chamar `classify-suggestion-eixo` com esse mesmo `sugestaoId`.

Sem novas migrações, sem alterações em políticas ou edge functions.

### 2. Campo de cidade com geolocalização (`src/components/landing/home/OpinionFormCard.tsx`)

- Manter o input com `datalist` (autocomplete por digitação).
- Adicionar um botão-ícone dentro do campo (canto direito) que dispara `navigator.geolocation.getCurrentPosition`.
- Ao obter as coordenadas, calcular o município mais próximo dentre os já carregados de `municipios` (distância euclidiana simples sobre lat/lon já é suficiente para a granularidade estadual) e preencher o campo `cidade` automaticamente.
- Texto de apoio logo abaixo do campo: **"Clique para registrar sua geolocalização ou digite o nome da sua cidade."**, com o trecho "Clique para registrar sua geolocalização" também clicável (mesma ação do botão).
- Estados de loading (spinner) e toasts para permissão negada / geolocalização indisponível / cidade detectada.

## Verificação

- Enviar uma opinião como visitante anônimo → toast de sucesso, tela de agradecimento e marcador no mapa.
- Conferir no banco que a nova linha existe com o UUID gerado.
- Clicar no ícone/link de geolocalização → cidade correta é preenchida (ou toast explicativo em caso de negação).
