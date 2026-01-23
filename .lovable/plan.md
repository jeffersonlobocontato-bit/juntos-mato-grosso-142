
# Correção Definitiva do Erro de Geração de Apresentação

## Problema Identificado

O parsing de streaming em `handleGeneratePresentation` está **perdendo dados entre chunks**, causando JSON corrompido. A evidência nos logs mostra:

```
]": "line"
```

Isso indica que o array `bullets` foi cortado no meio e mesclado com o próximo campo. O problema NÃO é o prompt ou formatação - é a **implementação do parser de streaming**.

### Comparação das Implementações

| Função | Abordagem | Problema |
|--------|-----------|----------|
| `handleSend` (linha 237-280) | Buffer persistente (`textBuffer`) que acumula chunks incompletos e reconstrói linhas | Funciona corretamente |
| `handleGeneratePresentation` (linha 442-459) | Processa cada chunk independentemente sem buffer | Perde dados entre chunks |

## Solução

Reescrever o parser de streaming em `handleGeneratePresentation` para usar a **mesma abordagem robusta** de `handleSend`:

1. Usar um `textBuffer` persistente entre iterações
2. Processar apenas linhas completas (terminadas em `\n`)
3. Manter linhas incompletas no buffer para o próximo chunk
4. Fazer flush final do buffer após stream terminar

## Alterações Técnicas

### Arquivo: `src/components/ai-hub/ResearchAnalystChat.tsx`

Substituir o bloco de streaming (linhas 438-460) por:

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullContent = '';
let textBuffer = '';
let streamDone = false;

while (!streamDone) {
  const { done, value } = await reader.read();
  if (done) break;

  // Accumulate chunks in buffer
  textBuffer += decoder.decode(value, { stream: true });

  // Process complete lines only
  let newlineIndex: number;
  while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
    let line = textBuffer.slice(0, newlineIndex);
    textBuffer = textBuffer.slice(newlineIndex + 1);

    // Clean line
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.startsWith(':') || line.trim() === '') continue;
    if (!line.startsWith('data: ')) continue;

    const jsonStr = line.slice(6).trim();
    if (jsonStr === '[DONE]') {
      streamDone = true;
      break;
    }

    try {
      const parsed = JSON.parse(jsonStr);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) fullContent += delta;
    } catch {
      // If parse fails, put line back in buffer (incomplete)
      textBuffer = line + '\n' + textBuffer;
      break;
    }
  }
}

// Final flush - process any remaining data in buffer
if (textBuffer.trim()) {
  const remainingLines = textBuffer.split('\n');
  for (let raw of remainingLines) {
    if (!raw) continue;
    if (raw.endsWith('\r')) raw = raw.slice(0, -1);
    if (raw.startsWith(':') || raw.trim() === '') continue;
    if (!raw.startsWith('data: ')) continue;
    const jsonStr = raw.slice(6).trim();
    if (jsonStr === '[DONE]') continue;
    try {
      const parsed = JSON.parse(jsonStr);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) fullContent += delta;
    } catch {
      // Ignore incomplete final chunks
    }
  }
}
```

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ai-hub/ResearchAnalystChat.tsx` | Reescrever parser de streaming usando buffer persistente |

## Benefícios

1. **Buffer persistente** - Chunks incompletos são mantidos e completados no próximo ciclo
2. **Processamento linha por linha** - Apenas linhas completas são parseadas
3. **Recuperação de erros** - Se parsing falhar, a linha volta ao buffer
4. **Flush final** - Dados residuais são processados ao fim do stream
5. **Consistência** - Mesma lógica usada em `handleSend` que funciona corretamente

## Diagrama do Fluxo

```text
STREAMING CHUNKS
     │
     ▼
┌─────────────────────────────────────────┐
│  textBuffer += decoder.decode(chunk)    │
│  "data: {...}\ndata: {..."              │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │  Processa linhas completas │
     │  (terminadas em \n)        │
     └─────────────┬─────────────┘
                   │
     ┌─────────────┴─────────────┐
     │  "data: {...}" → parse     │
     │  fullContent += delta      │
     └─────────────┬─────────────┘
                   │
     ┌─────────────┴─────────────┐
     │  "data: {..." (incompleto) │
     │  → mantém no buffer        │
     └─────────────┬─────────────┘
                   │
                   ▼
           PRÓXIMO CHUNK
```
