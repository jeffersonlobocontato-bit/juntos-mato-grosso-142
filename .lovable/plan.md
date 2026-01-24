
# Correção do Timeout no Processamento de Pesquisa

## Problema Identificado

O erro `connection closed before message completed` indica que a Edge Function `process-pesquisa` está atingindo o timeout enquanto aguarda resposta da IA para um dos chunks.

**Logs relevantes:**
- `Split content into 5 chunks. Sizes: 25000, 18275, 2000, 2000, 2000`
- `Processing chunk 1/5, length: 25000`
- `ERROR Http: connection closed before message completed`

## Causa Raiz

1. O `CHUNK_SIZE` de 25.000 caracteres resulta em chunks grandes demais
2. A chamada de IA para chunks grandes pode exceder 60-120 segundos
3. O gateway fecha a conexão antes da resposta ser completada

## Solução Técnica

### 1. Reduzir o Tamanho dos Chunks

**Arquivo:** `supabase/functions/process-pesquisa/index.ts`

Alterar as constantes de chunking para valores menores:

```typescript
// Linha 10-12: Alterar de
const CHUNK_SIZE = 25000;
const CHUNK_OVERLAP = 2000;
const MAX_CHUNKS = 5;

// Para
const CHUNK_SIZE = 12000;  // Metade do anterior
const CHUNK_OVERLAP = 1500;
const MAX_CHUNKS = 10;     // Mais chunks, menor cada um
```

**Benefícios:**
- Chunks menores = respostas mais rápidas da IA
- Mais margem de tempo para cada chamada
- Maior tolerância a documentos longos

### 2. Adicionar Timeout Explícito com Retry

Adicionar um timeout controller na chamada de IA com retry automático:

```typescript
// Na função processChunk, linha ~197
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

try {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({ ... }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  // ... resto do processamento
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    console.error(`Chunk ${chunkIndex + 1} timeout - será processado na próxima tentativa`);
    // Retornar null para permitir retry no próximo request
    return null;
  }
  throw error;
}
```

### 3. Melhorar Feedback de Erro no Frontend

**Arquivo:** `src/components/admin/PesquisaUploadModal.tsx`

Adicionar detecção de erro de timeout e sugestão de retry:

```typescript
// No catch do handleAutoProcess (linha ~598)
} catch (error: any) {
  console.error('Auto-process error:', error);
  
  const errorMessage = error.message || '';
  
  if (errorMessage.includes('closed') || errorMessage.includes('timeout')) {
    toast.error(
      'Processamento interrompido por timeout. Clique em "Processar com IA" para continuar de onde parou.',
      { duration: 8000 }
    );
  } else {
    toast.error(error.message || 'Erro no processamento automático');
  }
  // ...
}
```

### 4. Botão de Continuar Processamento

Adicionar um botão na UI para retomar processamento de pesquisas com `ai_processing_state` incompleto:

```tsx
// Na lista de pesquisas ou no modal
{pesquisa?.ai_processing_state?.processed_chunks < pesquisa?.ai_processing_state?.total_chunks && (
  <Button 
    variant="outline" 
    onClick={() => resumeProcessing(pesquisa.id)}
    className="gap-2"
  >
    <RefreshCw className="w-4 h-4" />
    Continuar ({pesquisa.ai_processing_state.processed_chunks}/{pesquisa.ai_processing_state.total_chunks})
  </Button>
)}
```

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/process-pesquisa/index.ts` | Reduzir CHUNK_SIZE para 12000, aumentar MAX_CHUNKS para 10, adicionar timeout controller |
| `src/components/admin/PesquisaUploadModal.tsx` | Melhorar mensagem de erro de timeout |
| `src/pages/AdminPesquisas.tsx` | Adicionar botão de continuar processamento na listagem |

## Fluxo Corrigido

```text
1. Upload PDF (41.275 chars)
2. Split em ~4 chunks de 12.000 chars cada
3. Processar chunk 1 → salvar estado → responder cliente
4. Frontend chama próximo chunk
5. Processar chunk 2 → salvar estado → responder cliente
6. ... continua até o último chunk
7. Salvar resultados finais nas tabelas relacionais
```

## Benefícios

1. **Sem timeout** - Chunks menores respondem mais rápido
2. **Resiliente** - Se falhar, pode continuar de onde parou
3. **Feedback claro** - Usuário sabe o que aconteceu
4. **Ação de recuperação** - Botão para continuar processamento interrompido

## Ação Imediata

Após implementar as correções, você poderá:
1. Reprocessar a pesquisa de janeiro 2026
2. O sistema vai criar chunks menores (~4 chunks de 12k em vez de 5 chunks com um de 25k)
3. Cada chunk será processado dentro do limite de tempo

