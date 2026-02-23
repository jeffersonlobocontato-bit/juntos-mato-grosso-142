
## Ajustes no Questionário da Entrevista Técnica

### Mudança 1 — A2: Layout vertical com label sobre cada campo de desafio

**Onde:** `src/components/entrevista/EntrevistaForm.tsx`, etapa 1 (Aquecimento), linhas 651–663.

**Situação atual:** Cada desafio é exibido em uma linha horizontal com o label `"Desafio X:"` à esquerda e o campo de input ao lado.

**Situação desejada:** Cada desafio deve ter o label acima do campo, com o placeholder descrevendo a ação esperada:

```
Desafio 1:
[ Descreva o desafio 1... ]

Desafio 2:
[ Descreva o desafio 2... ]

Desafio 3:
[ Descreva o desafio 3... ]
```

**Alteração técnica:** Substituir o `flex gap-2 items-center` por um layout de coluna (`space-y-1`) com `<Label>` acima do `<Input>`.

---

### Mudança 2 — G2: Remover a descrição "Delegacia Inteligente" para Segurança Pública

**Onde:** `src/config/entrevistaQuestions.ts`, no objeto `programaTestePorEixo` para o eixo `"e5000000-0000-0000-0000-000000000005"`.

**Situação atual:**
```typescript
"e5000000-0000-0000-0000-000000000005": {
  nome: "Delegacia Inteligente",
  descricao: "Triagem digital de ocorrências com priorização por gravidade e encaminhamento automatizado",
},
```

**Situação desejada:** Remover a entrada de segurança do mapeamento `programaTestePorEixo`. Com isso, o eixo de segurança cairá no fallback `programaTesteGenerico`, que exibe:

- **Nome:** "Programa-Piloto"
- **Descrição:** "Um programa-piloto que possa ser testado em 90 dias no seu setor"

Esse texto é genérico e neutro — sem sugerir nenhuma ideia específica como "Delegacia Inteligente".

O comportamento no formulário ficará:

> **G2. Programa-Teste: "Programa-Piloto"**
> Um programa-piloto que possa ser testado em 90 dias no seu setor. — Se esse programa fosse implementado como piloto, o que você ajustaria, expandiria ou criticaria?

---

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/components/entrevista/EntrevistaForm.tsx` | Layout de A2: vertical com label acima de cada input |
| `src/config/entrevistaQuestions.ts` | Remover entrada do eixo e5 em `programaTestePorEixo` |
