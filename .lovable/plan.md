## Objetivo

No criador de Plano de Governo, quando o usuário ativa "Documentos da Base", a seção "Tipos de Documento" hoje mostra apenas as 8 categorias fixas (Plano de Governo, Notícia, etc.). Vamos transformá-la em uma **seleção pelos nomes dos documentos reais** cadastrados na biblioteca, permitindo escolher exatamente quais arquivos a IA usará no cruzamento.

## Comportamento novo

Ao marcar "Documentos da Base" em "Origem dos Dados":

1. Aparece a seção **"Documentos disponíveis"** listando todos os documentos ativos (`ai_documents` com `is_active = true`), exibindo:
   - Nome do documento (`title`)
   - Badge com a categoria (Plano de Governo, Notícia, etc.) — para manter o contexto visual
   - Badge opcional com status temporal quando existir
2. Cada documento tem um checkbox individual.
3. Botões "Selecionar todos" / "Limpar" no topo da lista.
4. Campo de busca (input) para filtrar a lista por nome — útil quando houver muitos documentos.
5. Lista com `max-height` + scroll para não estourar a tela.
6. Mantemos o filtro **"Status Temporal"** abaixo, pois ainda é útil como filtro complementar.
7. O filtro antigo por categoria deixa de aparecer como grade de checkboxes — vira um **filtro auxiliar de pré-seleção** opcional (dropdown "Filtrar lista por categoria") que só ajuda a marcar/desmarcar em massa, mas o que conta é a seleção dos documentos.

Contador de "fontes ativas" no topo do card continua refletindo se a fonte "Documentos" está ligada.

## Mudanças técnicas

### 1. `src/components/admin/DataSourceFilters.tsx`
- Adicionar prop `documents: { id: string; title: string; doc_category: string; temporal_status: string | null }[]`.
- Trocar o tipo `DataFilters`:
  - Remover/renomear `docCategory: string[]` (categorias) → adicionar `documentIds: string[]` (IDs selecionados).
  - Manter um `docCategoryFilter: string` apenas como filtro auxiliar da UI (não enviado à IA, só para filtrar a lista visível).
- Renderizar lista de documentos com checkbox + busca + selecionar todos / limpar.
- Manter o seletor de "Status Temporal".

### 2. `src/pages/AdminPlanoGoverno.tsx`
- Buscar os documentos ativos (já existe query semelhante na página) e passar para `<DataSourceFilters documents={...} />`.
- Substituir uso de `filters.docCategory` por `filters.documentIds`:
  - Na query `documentsQuery`, trocar `.in('doc_category', filters.docCategory)` por `.in('id', filters.documentIds)` quando houver IDs selecionados. Se nada selecionado e a fonte estiver ativa, manter comportamento atual (todos os documentos ativos).
  - No payload enviado à edge function (`plano-governo-ai`), trocar `docCategory` por `documentIds` (array de UUIDs).
- Inicializar `documentIds: []` no estado inicial dos filtros.

### 3. `supabase/functions/plano-governo-ai/index.ts`
- Aceitar o novo campo `documentIds?: string[]` no payload.
- Ao montar a query de `ai_documents`, se `documentIds` vier preenchido, aplicar `.in('id', documentIds)` em vez de filtrar por `doc_category`.
- Manter retrocompatibilidade: se `docCategory` ainda vier, continuar funcionando (fallback).

### 4. Compatibilidade
- Onde mais `DataSourceFilters` é usado? Apenas em `AdminPlanoGoverno.tsx` (confirmado via busca). Sem impacto em outras telas.
- O componente `EvaluationSourceSelector` (usado em outro fluxo de avaliação de proposta) já faz seleção por documento individual e serve de referência visual.

## UX final

```text
[x] Documentos da Base
    Documentos disponíveis                      [3/27 selecionados]
    [ Buscar documento... ]   [Categoria: Todas ▾]   [Todos] [Limpar]
    ┌────────────────────────────────────────────────────────┐
    │ [x] Plano de Governo Estadual 2023   (Plano de Governo)│
    │ [ ] Diagnóstico Saúde PR 2024        (Documento Técnico)│
    │ [x] Lei Complementar 152/2023        (Legislação)      │
    │ ...                                                     │
    └────────────────────────────────────────────────────────┘
    Status Temporal: [ Todos ▾ ]
```

## Resultado esperado

A IA passa a cruzar **somente os documentos explicitamente marcados**, eliminando ruído e dando ao gestor controle total sobre quais arquivos da biblioteca participam da geração do plano.