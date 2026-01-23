

# Expansão Dinâmica do Gerador de Apresentações

## Objetivo

Remover o limite fixo de 10-14 slides e instruir a IA a criar apresentações que preservem **100% do conteúdo** do relatório consolidado, expandindo o número de páginas conforme necessário.

## Problema Atual

O prompt atual (linha 366) limita artificialmente:
```
DIRETRIZES:
- Crie 10-14 slides para apresentações completas
```

Isso faz com que relatórios extensos sejam resumidos e percam informações importantes.

## Solução

Atualizar as instruções no prompt para:

1. **Remover limite fixo** de slides
2. **Preservar integralmente** todo o conteúdo da conversa
3. **Expandir dinamicamente** conforme o volume de dados
4. **Organizar por seções lógicas** (cada pergunta/cenário = slides dedicados)

## Alterações Técnicas

### Arquivo: `supabase/functions/ai-hub-chat/index.ts`

Substituir o bloco de DIRETRIZES (linhas 365-374) por:

```typescript
DIRETRIZES DE EXPANSÃO DINÂMICA:

1. PRESERVAÇÃO INTEGRAL DO CONTEÚDO:
   - Transforme 100% do relatório/análise da conversa em slides
   - NÃO resuma nem omita dados - cada insight vira um slide
   - Cada pergunta de pesquisa = mínimo 1 slide dedicado
   - Cada cenário eleitoral = 1 slide de chart + 1 slide de análise
   - Cada cruzamento demográfico importante = 1 slide crosstable

2. REGRAS DE EXPANSÃO:
   - Relatório curto (até 500 palavras): 6-10 slides
   - Relatório médio (500-1500 palavras): 10-20 slides
   - Relatório extenso (1500-3000 palavras): 20-35 slides
   - Relatório completo (3000+ palavras): 35-50 slides
   - NÃO HÁ LIMITE MÁXIMO - expanda conforme necessário

3. ESTRUTURA OBRIGATÓRIA:
   - Slide 1: cover (título da análise)
   - Slide 2: methodology (ficha técnica da pesquisa)
   - Slides 3-N: conteúdo completo organizado por tema
   - Últimos 2-3 slides: numbered_insights + quote/alert

4. ORGANIZAÇÃO POR SEÇÕES:
   - Agrupe slides por tema (intenção de voto, rejeição, perfil, etc.)
   - Use slide "content" para introduzir cada nova seção
   - Use "highlight" para dados mais impactantes de cada seção
   - Use "crosstable" para TODOS os cruzamentos demográficos mencionados

5. MAPEAMENTO DE CONTEÚDO:
   - Percentuais de intenção de voto → chart (bar) + highlight
   - Comparação espontânea vs estimulada → comparison
   - Rankings e rejeição → horizontal_bars
   - Cruzamentos por gênero/idade/região → crosstable (um para cada)
   - Análises qualitativas → content com bullets
   - Alertas estratégicos → alert
   - Conclusões numeradas → numbered_insights
   - Citações importantes → quote

6. QUALIDADE > ECONOMIA:
   - Prefira mais slides bem organizados do que menos slides sobrecarregados
   - Cada slide deve ter UM foco principal
   - Títulos devem ser analíticos e impactantes
```

## Exemplo de Transformação

**Antes (limitado a 10-14 slides):**
- Muitos dados comprimidos em poucos slides
- Cruzamentos demográficos omitidos
- Análises resumidas

**Depois (expansão dinâmica):**
```text
Relatório com 3 cenários de 1º turno + 2 de 2º turno + 
5 cruzamentos demográficos + análise qualitativa

RESULTADO: ~25-30 slides
├── 1x cover
├── 1x methodology  
├── 3x chart (cenários 1º turno)
├── 3x content (análises de cada cenário)
├── 2x chart (cenários 2º turno)
├── 2x content (análises 2º turno)
├── 5x crosstable (gênero, idade, escolaridade, região, renda)
├── 2x horizontal_bars (rejeição, potencial)
├── 2x highlight (dados mais impactantes)
├── 1x alert (volatilidade/atenção)
├── 1x numbered_insights (3-5 conclusões)
└── 1x quote (frase de fechamento)
```

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-hub-chat/index.ts` | Substituir DIRETRIZES por regras de expansão dinâmica |

## Benefícios

1. **Preservação total** - Nenhum dado do relatório é perdido
2. **Escala automática** - Apresentação cresce conforme o conteúdo
3. **Organização lógica** - Slides agrupados por tema
4. **Qualidade profissional** - Um foco por slide, títulos analíticos
5. **Flexibilidade** - Funciona para relatórios curtos e extensos

