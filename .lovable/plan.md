

# Corrigir Textos Truncados, Erros Gramaticais e Alucinacoes nos Agentes

## Diagnostico

Apos analisar o codigo da funcao `plano-governo-ai`, identifiquei 3 causas principais:

1. **Sem limite de tokens de saida**: A chamada a IA nao define `max_tokens`, o que faz o modelo parar de gerar texto prematuramente (truncamento)
2. **Modelo desatualizado**: Usa `google/gemini-2.5-flash` enquanto o `ai-hub-chat` ja usa o mais capaz `google/gemini-3-flash-preview`
3. **Sem controle de temperatura**: Nao ha parametro `temperature`, o que permite ao modelo "alucinar" com mais liberdade
4. **Sem instrucoes anti-alucinacao**: Os prompts nao instruem explicitamente o modelo a evitar inventar dados

---

## Solucao

### 1. Atualizar parametros da chamada de IA

No arquivo `supabase/functions/plano-governo-ai/index.ts`:

- Trocar modelo de `google/gemini-2.5-flash` para `google/gemini-3-flash-preview`
- Adicionar `max_tokens: 16384` (garante respostas longas sem truncamento)
- Adicionar `temperature: 0.4` (reduz alucinacoes mantendo criatividade util)

### 2. Adicionar instrucoes anti-alucinacao nos prompts

Inserir no bloco de formatacao (`formattingInstructions`) regras claras:

- "NAO invente dados, estatisticas ou nomes que nao estejam nos dados fornecidos"
- "Se nao houver dados suficientes, diga explicitamente"
- "Cite sempre a fonte quando referenciar dados especificos"
- "Revise a gramatica e coerencia antes de finalizar"

### 3. Adicionar log de debug para detectar truncamentos futuros

Interceptar o stream para verificar se a resposta terminou por `MAX_TOKENS` e logar um aviso.

---

## Detalhes Tecnicos

### Arquivo: `supabase/functions/plano-governo-ai/index.ts`

Alteracao na chamada da API (linha ~558):

```text
ANTES:
  model: "google/gemini-2.5-flash",
  messages: apiMessages,
  stream: true,

DEPOIS:
  model: "google/gemini-3-flash-preview",
  messages: apiMessages,
  stream: true,
  max_tokens: 16384,
  temperature: 0.4,
```

Alteracao nas instrucoes de formatacao (bloco `formattingInstructions`):

Adicionar ao final:

```text
REGRAS DE QUALIDADE (OBRIGATORIAS):
- NAO invente dados, numeros, nomes de projetos ou estatisticas que nao estejam nos dados fornecidos
- Se os dados disponveis forem insuficientes para responder, diga claramente: "Os dados disponiveis nao permitem concluir..."
- Ao citar numeros ou fatos, indique de qual fonte vieram (sugestoes, propostas, documentos)
- Revise seu texto para garantir coerencia gramatical e clareza antes de finalizar
- Complete TODAS as frases e paragrafos -- nunca interrompa no meio de uma ideia
```

### Impacto

- Respostas mais longas e completas (sem truncamento)
- Menos invencao de dados (temperatura mais baixa + instrucoes explicitas)
- Melhor qualidade gramatical (modelo mais capaz + instrucoes de revisao)
- Transparencia quando dados sao insuficientes

