
# Adicionar CTA "Gerar Nova Versão" de Layout

## Objetivo

Quando já existe uma apresentação gerada, exibir **dois botões** lado a lado:
1. **Ver Apresentação** - Abre a apresentação existente
2. **Gerar Nova Versão** - Regenera a apresentação com um novo layout/versão

## Situação Atual

No arquivo `src/components/ai-hub/ResearchAnalystChat.tsx` (linhas 751-779):

```tsx
{activeConversation?.presentation ? (
  <Button variant="outline" onClick={() => setShowPresentation(true)}>
    <Eye /> Ver Apresentação
  </Button>
) : (
  <Button variant="outline" onClick={handleGeneratePresentation}>
    <Presentation /> Gerar Apresentação
  </Button>
)}
```

Problema: Quando existe apresentação, só aparece "Ver Apresentação". Não há opção de regenerar.

## Solução

### Arquivo: `src/components/ai-hub/ResearchAnalystChat.tsx`

Modificar o bloco condicional para mostrar **ambos os botões** quando já existe apresentação:

```tsx
{activeConversation?.presentation ? (
  <div className="flex gap-2">
    {/* Botão Ver Apresentação */}
    <Button
      variant="outline"
      onClick={() => setShowPresentation(true)}
      className="gap-2"
    >
      <Eye className="w-4 h-4" />
      Ver Apresentação
    </Button>
    
    {/* Novo: Botão Gerar Nova Versão */}
    <Button
      variant="outline"
      onClick={handleGeneratePresentation}
      disabled={generatingPresentation || isLoading}
      className="gap-2"
    >
      {generatingPresentation ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4" />
          Gerar Nova Versão
        </>
      )}
    </Button>
  </div>
) : (
  // Botão inicial para gerar primeira apresentação
  <Button variant="outline" onClick={handleGeneratePresentation} ...>
    <Presentation /> Gerar Apresentação
  </Button>
)}
```

### Importação do ícone

Adicionar `RefreshCw` aos imports do lucide-react:

```tsx
import { Send, Loader2, Sparkles, X, BarChart3, User, Maximize2, Minimize2, Presentation, Eye, RefreshCw } from 'lucide-react';
```

## Comportamento

| Estado | Botões Exibidos |
|--------|-----------------|
| Sem apresentação | "Gerar Apresentação" |
| Com apresentação | "Ver Apresentação" + "Gerar Nova Versão" |
| Gerando nova versão | "Ver Apresentação" + "Gerando..." (loading) |

## Fluxo do Usuário

1. Usuário conversa com o analista
2. Clica em **Gerar Apresentação**
3. Apresentação é criada e armazenada
4. Agora aparecem os dois botões:
   - **Ver Apresentação**: Abre a versão atual
   - **Gerar Nova Versão**: Substitui a apresentação por uma nova (mesmo conteúdo, nova geração = layout potencialmente diferente)
5. Ao clicar em "Gerar Nova Versão", a função `handleGeneratePresentation` é chamada novamente, sobrescrevendo a apresentação existente

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ai-hub/ResearchAnalystChat.tsx` | Adicionar import `RefreshCw`, modificar bloco de botões para exibir dois CTAs quando existe apresentação |

## Benefícios

- **Flexibilidade**: Usuário pode gerar múltiplas versões até encontrar o layout ideal
- **UX clara**: Dois botões distintos para ações diferentes
- **Reutilização**: Usa a mesma função `handleGeneratePresentation` já existente
