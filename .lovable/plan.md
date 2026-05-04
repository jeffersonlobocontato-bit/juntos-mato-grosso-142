## Problema

No PDF/DOCX exportado a partir do `ProposalDetailModal`, dois campos do questionário aparecem como UUIDs em vez de nomes:

- **Identificação → Subtemas selecionados:** `1. 276ef2a6-efdb-40da-8276-59ef1ac86b74`
- **Cocriação → G3.b Eixos relacionados:** `1. e5000000-0000-0000-0000-000000000005`

Outros campos (Eixo Temático, Município) já vêm resolvidos via `getEixoNome` / `getMunicipioNome` no payload, mas os arrays internos do `questionario` (`identificacao.subtemas` e `cocriacao.cross_eixo_ids`) são serializados como string sem lookup.

## Correção

### 1. `src/utils/entrevistaExport.ts`

- Estender `EntrevistaExportData` com dois mapas opcionais de lookup:
  - `subtemasMap?: Record<string, string>` (id → nome do subtema, idealmente "Tema › Subtema")
  - `eixosMap?: Record<string, string>` (id → nome do eixo)
- Adicionar uma etapa de "resolução" antes de `formatValue` em `buildSecoes`:
  - Para `identificacao.subtemas`: mapear cada id para `subtemasMap[id]` (fallback: manter id se não achar).
  - Para `cocriacao.cross_eixo_ids`: mapear cada id para `eixosMap[id]`.
- Manter compatibilidade: se os mapas não forem passados, comportamento atual permanece.

### 2. `src/components/admin/ProposalDetailModal.tsx`

- Já existe estado `eixos` e provavelmente acesso a `temas`/`subtemas`. Garantir busca de `subtemas` (com `tema_id` para compor "Tema › Subtema" se desejado, ou apenas o nome do subtema).
- Em `buildExportPayload()`:
  - Construir `eixosMap` a partir do array `eixos` já carregado.
  - Buscar (ou usar cache existente) os `subtemas` e construir `subtemasMap`. Como subtemas globais são poucos (~80), uma única query `select id, nome` é suficiente; pode ser feita no `useEffect` inicial do modal junto com `eixos` e `municipios`.
- Passar `eixosMap` e `subtemasMap` no payload para `exportEntrevistaPDF` / `exportEntrevistaDOCX`.

### 3. Validação

Após a alteração, reabrir uma proposta existente, exportar PDF e DOCX, e confirmar:
- "Subtemas selecionados" → exibe nomes (ex.: "Portos", "Logística rodoviária").
- "G3.b Eixos relacionados" → exibe nomes (ex.: "Desenvolvimento Econômico Sustentável").
- Demais seções permanecem inalteradas.

## Arquivos afetados

- `src/utils/entrevistaExport.ts` — adicionar mapas de lookup e resolver UUIDs antes da formatação.
- `src/components/admin/ProposalDetailModal.tsx` — carregar subtemas, montar mapas e incluí-los no payload de exportação.

Sem alterações de banco de dados nem de Edge Functions.