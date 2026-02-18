

## Acrescentar 6a Pergunta Aberta ao Bloco F (Visao Setorial)

### Mudanca

Adicionar a todos os 5 eixos uma 6a pergunta aberta no Bloco F, permitindo que o especialista fale livremente sobre o que pretende ou planeja para o setor.

### Pergunta 6 (igual para todos os eixos)

**"Alem do que discutimos, o que voce pessoalmente pretende ou gostaria de ver acontecer na sua area nos proximos 4 anos? Fale livremente."**

Essa pergunta sera a Q6 do Bloco F em todos os eixos, apos as 5 perguntas tecnicas especificas.

### Impacto na estrutura

| Item | Antes | Depois |
|---|---|---|
| Perguntas Bloco F | 5 por eixo | 6 por eixo (5 especificas + 1 aberta) |
| Total questionario | ~24 perguntas | ~25 perguntas |
| Tempo estimado | ~35 min | ~37 min (margem aceitavel) |

### Impacto no JSONB

O campo `bloco_f` passa de `q1..q5` para `q1..q6`:

```text
"bloco_f": {
  "q1": "", "q2": "", "q3": "", "q4": "", "q5": "",
  "q6": ""  // <-- NOVA: pergunta aberta "o que pretende"
}
```

### Implementacao

No arquivo `src/config/entrevistaQuestions.ts` (a ser criado), cada eixo tera 6 perguntas no array `perguntas` do Bloco F. As 5 primeiras sao tecnicas e especificas do eixo (ja definidas no plano anterior). A 6a e identica para todos:

```text
// Adicionada como ultima pergunta em todos os eixos
"Alem do que discutimos, o que voce pessoalmente pretende ou gostaria de ver acontecer na sua area nos proximos 4 anos? Fale livremente."
```

No `EntrevistaForm.tsx`, o step do Bloco F renderizara 6 campos de textarea em vez de 5.

Nenhuma migration de banco necessaria -- o campo `questionario` e JSONB livre.

