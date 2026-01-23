
# Correção do Erro "Erro ao gerar apresentação"

## Problema Identificado

Os logs de console mostram erros de parsing JSON:
- `Expected ',' or ']' after array element in JSON at position 811`
- `Unexpected non-whitespace character after JSON at position 361`

A IA está retornando JSON malformado ou com texto adicional (markdown code blocks, explicações antes/depois).

## Solução

### 1. Melhorar o Prompt na Edge Function

Arquivo: `supabase/functions/ai-hub-chat/index.ts`

- Reforçar as instruções para retornar APENAS JSON puro
- Adicionar exemplos negativos (o que NÃO fazer)
- Usar modelo mais robusto para geração de JSON estruturado

### 2. Melhorar o Parser no Frontend

Arquivo: `src/components/ai-hub/ResearchAnalystChat.tsx`

- Remover markdown code blocks (```json...```) antes de parsear
- Usar regex mais robusto para extrair JSON
- Adicionar tentativa de reparo para erros comuns
- Melhor logging para debug

## Alterações Específicas

### Edge Function (`ai-hub-chat/index.ts`)

Atualizar o bloco de instruções de apresentação (linhas 289-301):

```typescript
if (isPresentationRequest) {
  systemPrompt += `

MODO DE GERAÇÃO DE APRESENTAÇÃO:
Você está no modo de geração de apresentação. Analise toda a conversa anterior e gere uma apresentação executiva.

⚠️ REGRAS CRÍTICAS - SIGA EXATAMENTE:
1. Retorne SOMENTE o objeto JSON, nada mais
2. NÃO use blocos de código (\`\`\`json ou \`\`\`)
3. NÃO escreva texto antes do JSON
4. NÃO escreva texto depois do JSON
5. NÃO adicione comentários dentro do JSON
6. Comece a resposta diretamente com o caractere {
7. Termine a resposta diretamente com o caractere }

ESTRUTURA DO JSON:
{
  "title": "Título da Apresentação",
  "theme": "default",
  "slides": [
    {"id": "1", "type": "cover", "title": "...", "subtitle": "..."},
    {"id": "2", "type": "content", "title": "...", "bullets": ["...", "..."]},
    {"id": "3", "type": "chart", "title": "...", "chart": {"type": "pie", "title": "...", "data": [{"name": "...", "value": 0}]}},
    {"id": "4", "type": "conclusion", "title": "...", "bullets": ["..."]}
  ]
}

Tipos de slides: cover, content, chart, conclusion, recommendations
Tipos de gráfico: pie, bar, line, comparison
Limite: 6-8 slides
`;
}
```

### Frontend (`ResearchAnalystChat.tsx`)

Atualizar o bloco de parsing (linhas 462-473):

```typescript
// Clean and parse the JSON from the response
let cleanedContent = fullContent.trim();

// Remove markdown code blocks if present
cleanedContent = cleanedContent.replace(/^```json?\s*/i, '');
cleanedContent = cleanedContent.replace(/```\s*$/i, '');
cleanedContent = cleanedContent.trim();

// Remove any text before the first {
const jsonStart = cleanedContent.indexOf('{');
const jsonEnd = cleanedContent.lastIndexOf('}');

if (jsonStart === -1 || jsonEnd === -1) {
  console.error('JSON não encontrado na resposta:', fullContent.substring(0, 500));
  throw new Error('Não foi possível extrair JSON da resposta');
}

let jsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);

// Fix common JSON issues
jsonString = jsonString
  .replace(/,\s*}/g, '}')  // Remove trailing commas before }
  .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
  .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
  .replace(/[\u2018\u2019]/g, "'"); // Replace smart apostrophes

let presentationData;
try {
  presentationData = JSON.parse(jsonString);
} catch (parseError) {
  console.error('Erro ao parsear JSON:', parseError);
  console.error('JSON recebido:', jsonString.substring(0, 1000));
  throw new Error('JSON inválido na resposta da IA');
}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-hub-chat/index.ts` | Melhorar prompt para geração de JSON |
| `src/components/ai-hub/ResearchAnalystChat.tsx` | Adicionar limpeza e reparos no parser |

## Benefícios

1. **Prompt mais explícito** - Instruções claras com exemplos do que não fazer
2. **Parser robusto** - Remove código markdown, texto extra, e corrige erros comuns
3. **Melhor debugging** - Logs detalhados quando falha
4. **Fallback gracioso** - Tentativas de reparo antes de falhar
