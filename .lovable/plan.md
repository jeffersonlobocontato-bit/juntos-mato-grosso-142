
# Correção de Slides em Branco nas Apresentações

## Diagnóstico do Problema

Após análise detalhada do código e dos dados armazenados, identifiquei **3 causas raiz** para slides aparecerem em branco:

### Causa 1: Componentes sem Fallback Visual
Os componentes especializados retornam `null` ou renderizam áreas vazias quando os dados esperados não existem:

| Componente | Campo Esperado | Comportamento Atual |
|------------|----------------|---------------------|
| `MethodologySlide` | `slide.methodology[]` | Renderiza grid vazio |
| `HighlightSlide` | `slide.highlight{}` | Retorna `null` |
| `CrossTableSlide` | `slide.crossTable{}` | Retorna `null` |
| `HorizontalBarsSlide` | `slide.horizontalBars[]` | Renderiza área vazia |
| `NumberedInsightsSlide` | `slide.insights[]` | Renderiza grid vazio |
| `QuoteSlide` | `slide.quote{}` | Texto potencialmente vazio |

### Causa 2: IA Pode Gerar JSON Incompleto
A IA às vezes gera slides com `type` especializado mas omite os campos de dados correspondentes, resultando em slides vazios.

### Causa 3: ContentSlide como Fallback Genérico
O `SlideRenderer` usa `ContentSlide` como fallback para tipos não reconhecidos, mas se o slide não tiver `bullets` nem `content`, fica em branco.

---

## Solução Técnica

### 1. Adicionar Fallback Visual em Todos os Componentes

Cada componente especializado deve:
- Verificar se os dados existem e são válidos
- Se não existirem, tentar usar `slide.bullets` ou `slide.content` como fallback
- Se nenhum dado existir, exibir mensagem de "conteúdo não disponível" em vez de ficar em branco

### 2. Arquivos a Modificar

#### Arquivo 1: `src/components/ai-hub/slides/MethodologySlide.tsx`

Adicionar fallback para `slide.bullets` ou `slide.content` quando `methodology` estiver vazio:

```tsx
// Linha ~19
const items = slide.methodology || [];

// Se items estiver vazio, usar bullets como fallback
if (items.length === 0) {
  if (slide.bullets && slide.bullets.length > 0) {
    // Renderizar como ContentSlide com bullets
    return <ContentSlide slide={slide} />;
  }
  if (slide.content) {
    return <ContentSlide slide={slide} />;
  }
  // Fallback visual de "sem dados"
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-500/10 via-background to-blue-500/10">
      <h2 className="text-3xl font-bold text-foreground mb-4">{slide.title}</h2>
      <p className="text-muted-foreground">Dados de metodologia não disponíveis</p>
    </div>
  );
}
```

#### Arquivo 2: `src/components/ai-hub/slides/HighlightSlide.tsx`

Adicionar fallback quando `highlight` não existir:

```tsx
// Após linha 98 (onde retorna null)
} : (
  // Fallback: usar content ou bullets
  <motion.div className="text-center">
    {slide.content && (
      <p className="text-xl text-muted-foreground">{slide.content}</p>
    )}
    {slide.bullets && slide.bullets.map((bullet, idx) => (
      <p key={idx} className="text-lg text-foreground">{bullet}</p>
    ))}
  </motion.div>
)
```

#### Arquivo 3: `src/components/ai-hub/slides/CrossTableSlide.tsx`

Substituir `return null` por fallback para ContentSlide:

```tsx
// Linha ~21
if (!table) {
  // Tentar fallback para bullets/content
  if (slide.bullets?.length || slide.content) {
    return <ContentSlide slide={slide} />;
  }
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-500/10 via-background to-muted/30">
      <h2 className="text-3xl font-bold text-foreground mb-4">{slide.title}</h2>
      {slide.subtitle && <p className="text-muted-foreground">{slide.subtitle}</p>}
      <p className="text-muted-foreground mt-4">Tabela de dados não disponível</p>
    </div>
  );
}
```

#### Arquivo 4: `src/components/ai-hub/slides/HorizontalBarsSlide.tsx`

Adicionar fallback quando `horizontalBars` estiver vazio:

```tsx
// Após linha 9
const bars = slide.horizontalBars || [];

if (bars.length === 0) {
  if (slide.bullets?.length || slide.content) {
    return <ContentSlide slide={slide} />;
  }
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-rose-500/10 via-background to-primary/10">
      <h2 className="text-3xl font-bold text-foreground mb-4">{slide.title}</h2>
      {slide.subtitle && <p className="text-muted-foreground">{slide.subtitle}</p>}
      <p className="text-muted-foreground mt-4">Dados de barras não disponíveis</p>
    </div>
  );
}
```

#### Arquivo 5: `src/components/ai-hub/slides/NumberedInsightsSlide.tsx`

Adicionar fallback quando `insights` estiver vazio:

```tsx
// Após linha 11
const insights = slide.insights || [];

if (insights.length === 0) {
  if (slide.bullets?.length || slide.content) {
    return <ContentSlide slide={slide} />;
  }
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-amber-500/10 via-background to-primary/10">
      <h2 className="text-3xl font-bold text-foreground mb-4">{slide.title}</h2>
      <p className="text-muted-foreground">Insights não disponíveis</p>
    </div>
  );
}
```

#### Arquivo 6: `src/components/ai-hub/slides/QuoteSlide.tsx`

Adicionar fallback quando `quote` não existir:

```tsx
// Linha ~49
{quote?.text || slide.content || "Citação não disponível"}
```

#### Arquivo 7: `src/components/ai-hub/slides/ChartSlide.tsx`

Adicionar fallback quando `chart` não existir:

```tsx
// Após linha 68 (onde retorna null no default)
if (!slide.chart) {
  if (slide.bullets?.length || slide.content) {
    return <ContentSlide slide={slide} />;
  }
  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
      <p className="text-muted-foreground">Gráfico não disponível</p>
    </div>
  );
}
```

#### Arquivo 8: `src/components/ai-hub/slides/ContentSlide.tsx`

Garantir que sempre exibe algo mesmo sem bullets/content:

```tsx
// Adicionar após verificação de bullets e content (aprox. linha 65-75)
// Se não houver bullets nem content, exibir mensagem
{!slide.bullets?.length && !slide.content && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex-1 flex items-center justify-center"
  >
    <p className="text-muted-foreground text-center">
      Conteúdo detalhado não disponível para este slide.
    </p>
  </motion.div>
)}
```

### 3. Reforçar Prompt da IA

#### Arquivo 9: `supabase/functions/ai-hub-chat/index.ts`

Adicionar instruções mais explícitas para garantir que cada tipo de slide tenha seus campos obrigatórios preenchidos:

```text
CAMPOS OBRIGATÓRIOS POR TIPO DE SLIDE:
- cover: title (obrigatório), subtitle (opcional)
- methodology: methodology[] array com {label, value, description} (obrigatório)
- highlight: highlight{} com primary/comparison (obrigatório)
- crosstable: crossTable{headers, rows} (obrigatório)
- horizontal_bars: horizontalBars[] array com {label, value} (obrigatório)
- chart: chart{} com type e data (obrigatório)
- numbered_insights: insights[] array com {number, title, description} (obrigatório)
- alert: alert{} com type, title, description (obrigatório)
- quote: quote{text} (obrigatório)
- content: bullets[] OU content string (pelo menos um obrigatório)

⚠️ NUNCA gere um slide sem seu campo de dados principal preenchido!
Se não houver dados suficientes para um tipo especializado, use "content" com bullets.
```

---

## Resumo das Alterações

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `MethodologySlide.tsx` | Fallback para ContentSlide ou mensagem |
| `HighlightSlide.tsx` | Fallback para bullets/content |
| `CrossTableSlide.tsx` | Fallback para ContentSlide ou mensagem |
| `HorizontalBarsSlide.tsx` | Fallback para ContentSlide ou mensagem |
| `NumberedInsightsSlide.tsx` | Fallback para ContentSlide ou mensagem |
| `QuoteSlide.tsx` | Fallback de texto padrão |
| `ChartSlide.tsx` | Fallback para ContentSlide ou mensagem |
| `ContentSlide.tsx` | Mensagem quando sem conteúdo |
| `ai-hub-chat/index.ts` | Instruções de campos obrigatórios |

---

## Benefícios

1. **Zero slides em branco** - Sempre haverá conteúdo visual
2. **Degradação graciosa** - Se dados específicos faltarem, usa fallback inteligente
3. **Feedback ao usuário** - Mensagens claras quando dados não estão disponíveis
4. **IA mais precisa** - Instruções reforçadas para gerar JSON completo
5. **Preservação integral** - Conteúdo sempre visível, mesmo em casos de edge
