## Objetivo

Hoje, ao adicionar um documento à biblioteca da IA, só é possível selecionar **um eixo temático** (opcional). Quando a IA cruza dados para avaliar uma entrevista/proposta, ela puxa documentos sem nenhum filtro de tema — o que aumenta o risco de **alucinação** ao misturar fontes que nada têm a ver com o tema analisado.

A proposta é tornar a vinculação **obrigatória por tema** (multi-seleção) e fazer com que a IA respeite esse vínculo.

## O que será feito

### 1. Banco de dados — vincular documentos a múltiplos temas

- Criar nova tabela `ai_document_temas` (relação N:N):
  - `document_id` → `ai_documents.id`
  - `tema_id` → `temas.id`
  - índice único `(document_id, tema_id)`
  - RLS: admins gerenciam; leitura para admins e líderes temáticos.

- Manter o campo `eixo_id` atual em `ai_documents` (continua útil como contexto macro), mas a fonte da verdade para cruzamento passa a ser a lista de temas vinculados.

### 2. Modal de upload (`DocumentUploadModal.tsx`)

- Adicionar **seletor hierárquico Eixo → Temas** (multi-select com checkboxes), já existente em outras partes da plataforma.
- Quando um eixo é escolhido, exibe os temas daquele eixo para marcar.
- Permitir marcar temas de **mais de um eixo** (ex.: documento que toca Saúde + Educação).
- **Pelo menos 1 tema é obrigatório** para salvar (com toast claro explicando o motivo: "necessário para o cruzamento de IA não confundir fontes").
- Ao salvar: insert em `ai_documents` + insert em `ai_document_temas` (lote).

### 3. Biblioteca de documentos (`DocumentLibrary.tsx`)

- Mostrar os temas vinculados de cada documento como **badges** abaixo do título.
- Filtro adicional no topo: "Filtrar por tema".
- Botão "Editar temas" em cada card → mini-modal com a mesma seleção hierárquica.
- Documentos antigos sem tema aparecem com badge **"Sem tema vinculado — atualizar"** em destaque, para que o admin regularize.

### 4. Edge Function `evaluate-proposal` — filtro real

Hoje, o trecho que busca documentos:
```ts
docsQuery.in('doc_category', ['documento_tecnico', 'plano_governo', 'promessa']).limit(10);
```
não filtra por tema. Será alterado para:

1. Ler `tema_id` (e `subtema_id`/`eixo_id` como fallback) da proposta sendo avaliada.
2. Buscar em `ai_document_temas` os `document_id` vinculados ao tema da proposta.
3. Restringir a query de `ai_documents` a esses IDs.
4. Se nenhum documento estiver vinculado ao tema → contexto vazio + log claro ("Nenhum documento vinculado ao tema X — IA usará apenas conhecimento próprio"), em vez de cair em fontes aleatórias.
5. Mesma lógica aplicada ao `match_document_chunks` (passar `filter_doc_ids` já existente na função SQL).

### 5. Edge Function `plano-governo-ai` (cruzamento/balanço)

- Mesmo princípio: quando o modo de análise tem um tema/eixo no contexto, restringir documentos pelos temas vinculados.
- Quando a análise é genérica (sem tema), comportamento atual é preservado.

### 6. Migração de dados existentes

- Para documentos que **já têm `eixo_id`**: criar vínculos automáticos com **todos os temas daquele eixo** (assumindo cobertura ampla; admin pode refinar depois).
- Para documentos **sem `eixo_id`**: ficam sem vínculo e aparecem marcados como "Atualizar temas" na biblioteca.

## Detalhes técnicos

### SQL principal
```sql
create table public.ai_document_temas (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ai_documents(id) on delete cascade,
  tema_id uuid not null references public.temas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(document_id, tema_id)
);

alter table public.ai_document_temas enable row level security;

create policy "Admins manage ai_document_temas"
  on public.ai_document_temas for all
  using (is_admin(auth.uid()));

create policy "Authorized users view ai_document_temas"
  on public.ai_document_temas for select
  using (is_admin(auth.uid()) or has_role(auth.uid(), 'lider_tematico'::app_role));

create index idx_adt_document on public.ai_document_temas(document_id);
create index idx_adt_tema on public.ai_document_temas(tema_id);
```

### Filtro na edge function (esboço)
```ts
const { data: vinculos } = await supabase
  .from('ai_document_temas')
  .select('document_id')
  .eq('tema_id', proposal.tema_id);

const allowedIds = vinculos?.map(v => v.document_id) ?? [];

if (allowedIds.length === 0) {
  documents = []; // sem alucinação cruzada
} else {
  const { data: docsData } = await supabase
    .from('ai_documents')
    .select('id, title, content, doc_category, description')
    .eq('is_active', true)
    .in('id', allowedIds);
  documents = docsData ?? [];
}
```

## Arquivos afetados
- **Migration nova**: `ai_document_temas` + RLS + backfill.
- `src/components/admin/DocumentUploadModal.tsx` — multi-select de temas obrigatório.
- `src/components/admin/DocumentLibrary.tsx` — badges, filtro por tema, edição inline.
- `supabase/functions/evaluate-proposal/index.ts` — filtro por tema.
- `supabase/functions/plano-governo-ai/index.ts` — filtro por tema quando aplicável.
- (Eventualmente) `supabase/functions/ai-hub-chat/index.ts` se quisermos estender o mesmo princípio aos agentes do HUB.

## Resultado esperado
- Cada documento da biblioteca passa a ter "etiquetas temáticas" claras.
- A IA, ao avaliar uma entrevista do tema X, **só enxerga** documentos marcados como tema X (ou temas relacionados).
- Drástica redução de cruzamentos espúrios e respostas inventadas.
