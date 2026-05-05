# Fase 5 — Storage: SELECT por owner/admin

## Objetivo
Bloquear listagem/leitura anônima via API nos buckets `ai-documents` e `proposta-anexos`, sem quebrar links públicos já compartilhados (CDN).

## Estado atual (confirmado no banco)
- `ai-documents`: policy `"Anyone can view documents"` permite `SELECT` para qualquer um.
- `proposta-anexos`: policy `"Public can view proposta anexos"` permite `SELECT` para qualquer um.
- Uploads, updates e deletes já estão restritos (admin / owner).

## Mudanças
- Remover policy `"Anyone can view documents"` (ai-documents).
- Remover policy `"Public can view proposta anexos"` (proposta-anexos).
- Criar `SELECT` apenas para admins em `ai-documents`.
- Criar `SELECT` apenas para owner ou admin em `proposta-anexos`.
- Buckets permanecem `public = true` → `getPublicUrl()` continua servindo arquivos pelo CDN sem login.

## Impacto operacional
- Visualização de PDFs/anexos via link público: **inalterado** (CDN).
- Upload de documentos por admin (`ai-documents`): **inalterado**.
- Upload de anexos em entrevistas/propostas: **inalterado**.
- Remoção de anexo pelo dono: **inalterado**.
- Listagem anônima dos arquivos via API: **bloqueada** (objetivo da fase).
- RAG/busca semântica: **inalterado** (lê de `ai_document_chunks`, não do storage).

## SQL da migração

```sql
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view proposta anexos" ON storage.objects;

CREATE POLICY "Admins can view ai-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-documents' AND is_admin(auth.uid()));

CREATE POLICY "Owners and admins can view proposta-anexos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()))
);
```

## Verificação após aplicar
- Abrir um anexo de proposta via link público → deve carregar.
- Painel admin de documentos de IA → deve listar normalmente (admin logado).
- Rodar `supabase--linter` → warnings de "Public Bucket Allows Listing" devem sumir.
