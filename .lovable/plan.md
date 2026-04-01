

## Organizar Biblioteca de Documentos + RAG para Agentes de IA

### Contexto

Atualmente o sistema despeja **todo o conteúdo** dos documentos vinculados no prompt do agente (abordagem "stuff"). Isso funciona para poucos documentos curtos, mas não escala — documentos longos estouram o limite de contexto e o agente perde precisão. A metodologia RAG resolve isso: ao invés de enviar tudo, o sistema busca apenas os trechos mais relevantes para cada pergunta do usuário.

### O que será feito

Duas frentes combinadas:

---

#### Frente 1 — Organização: Escopo Global vs. Agente Específico

**Pergunta no upload:** "Este documento é para um agente específico ou para a biblioteca global?"

| Item | Detalhe |
|---|---|
| Nova coluna `scope` em `ai_documents` | `'global'` (default) ou `'agent_specific'` |
| Upload modal | Seletor de escopo + dropdown de agente quando específico |
| Biblioteca geral | Filtros por escopo + badges visuais |
| Biblioteca do modo/agente | "Vincular existente" mostra apenas docs globais; upload inline pre-seta `agent_specific` |

---

#### Frente 2 — RAG: Busca Semântica por Relevância

Em vez de enviar todos os documentos no prompt, o sistema vai:

1. **Chunking** — Ao salvar um documento, dividir o conteúdo em pedaços de ~500 tokens
2. **Embeddings** — Gerar vetor semântico de cada chunk via modelo de embedding
3. **Busca por similaridade** — Quando o usuário faz uma pergunta, gerar embedding da pergunta e buscar os top-K chunks mais relevantes
4. **Contexto otimizado** — Enviar apenas os chunks relevantes ao LLM

##### Implementação técnica

| Componente | Mudança |
|---|---|
| **Migração SQL** | Habilitar extensão `vector`; criar tabela `ai_document_chunks` com colunas `id`, `document_id` (FK), `chunk_index`, `content`, `embedding` (vector(768)), `metadata` (jsonb) |
| **Edge function `process-document-chunks`** | Recebe `document_id`, lê conteúdo, divide em chunks, gera embeddings via Lovable AI, salva na tabela |
| **Função SQL `match_document_chunks`** | Recebe embedding da query + lista de document_ids, retorna top-K chunks por similaridade coseno |
| **Edge function `ai-hub-chat`** | Antes de chamar o LLM: gerar embedding da última mensagem do usuário → chamar `match_document_chunks` com os doc_ids do agente (+ globais) → montar contexto só com chunks relevantes |
| **Upload flows** | Após inserir documento, chamar `process-document-chunks` automaticamente |

##### Fluxo simplificado

```text
Usuário pergunta → embedding da pergunta → busca top-10 chunks similares → monta contexto → envia ao LLM
```

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| Migração SQL | Extensão vector, tabela `ai_document_chunks`, função `match_document_chunks`, coluna `scope` em `ai_documents` |
| `supabase/functions/process-document-chunks/index.ts` | Nova edge function para chunking + embeddings |
| `supabase/functions/ai-hub-chat/index.ts` | Substituir "dump all docs" por busca semântica |
| `src/components/admin/DocumentUploadModal.tsx` | Seletor global/agente + trigger de processamento |
| `src/components/admin/DocumentLibrary.tsx` | Filtros por escopo + badges |
| `src/components/admin/ModeDocumentLibrary.tsx` | Filtrar globais no vincular + pre-set scope |

### Resultado esperado

- Documentos organizados por escopo (global vs. agente)
- Respostas dos agentes mais precisas (contexto relevante, não tudo)
- Escala para centenas de documentos sem estourar limite de tokens

