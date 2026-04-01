

## Adicionar CTAs "Entrevista Política" e "Entrevista Popular" no topo do dashboard

### O que será feito

Ao lado do botão existente "IR PARA A ENTREVISTA TÉCNICA", serão adicionados dois novos botões CTA:

1. **IR PARA A ENTREVISTA POLÍTICA** → link para `/liderancas` (LP de propostas políticas)
2. **IR PARA A ENTREVISTA POPULAR** → link para `/` (LP de sugestões populares)

### Arquivo a editar

**`src/pages/Admin.tsx`**

- Importar ícones adicionais (`Vote`, `Users2` ou similares) se necessário
- Substituir o botão único (linhas 221-228) por um grupo de 3 botões dentro de um `flex gap-2 flex-wrap`
- Os 3 botões compartilham a mesma condição de visibilidade (`lider_tematico || isAdminMaster || isAdmin`)
- Usar variantes visuais distintas para diferenciar:
  - **Entrevista Técnica**: `variant="default"` (atual)
  - **Entrevista Política**: `variant="accent"` 
  - **Entrevista Popular**: `variant="secondary"`

### Layout resultante

```text
Bem-vindo ao Painel                    [ENTREVISTA TÉCNICA] [ENTREVISTA POLÍTICA] [ENTREVISTA POPULAR]
Gerencie propostas, sugestões...
```

Em telas menores, os botões empilharão verticalmente graças ao `flex-wrap`.

