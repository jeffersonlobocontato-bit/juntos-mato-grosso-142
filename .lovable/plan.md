

## Implementacao de Selecao Hierarquica: Eixo, Tema e Subtema no Questionario

### Objetivo
Adicionar campos de selecao em cascata no formulario de entrevista para que o entrevistador possa categorizar precisamente cada proposta tecnica por Eixo Tematico, Tema e Subtema, melhorando o tagueamento e filtros de busca.

### Contexto Atual
- O formulario ja permite selecionar o **Eixo Tematico**
- Nao existe selecao de **Tema** (ex: Educacao, Saude, Agricultura)
- Nao existe selecao de **Subtema** (ex: Educacao Infantil, Ensino Fundamental)
- A tabela `propostas_tecnicas` possui `tema_id` mas nao possui `subtema_id`

### Estrutura dos Dados
Os 5 eixos tematicos possuem temas associados:
- **Eixo 1 - Desenvolvimento Social**: Educacao, Cultura, Esporte, Saude, Assistencia Social
- **Eixo 2 - Desenvolvimento Economico**: Agricultura, Industria, Comercio, Turismo, etc.
- **Eixo 3 - Cidades e Infraestrutura**: Habitacao, Mobilidade, Saneamento, etc.
- **Eixo 4 - Gestao Publica**: Modernizacao, Responsabilidade Fiscal, Transparencia
- **Eixo 5 - Seguranca**: Seguranca Publica, Justica, Combate a Corrupcao

Cada Tema possui Subtemas (ex: Educacao -> Educacao Infantil, Ensino Fundamental, Ensino Tecnico)

---

### Plano de Implementacao

#### Etapa 1: Alteracao no Banco de Dados
Adicionar coluna `subtema_id` na tabela `propostas_tecnicas`:

```text
ALTER TABLE propostas_tecnicas 
ADD COLUMN subtema_id uuid REFERENCES subtemas(id);
```

#### Etapa 2: Modificacoes no Formulario (EntrevistaForm.tsx)

**2.1. Adicionar novas interfaces e estados:**
- Interface `Tema` com `id`, `nome`, `codigo`, `eixo_id`
- Interface `Subtema` com `id`, `nome`, `tema_id`
- Estados: `temaId`, `subtemaId`, `temas`, `subtemas`

**2.2. Adicionar funcoes de fetch:**
- `fetchTemas()`: Buscar todos os temas ordenados
- `fetchSubtemas()`: Buscar todos os subtemas ordenados

**2.3. Adicionar efeitos de cascata:**
- Quando o eixo mudar: limpar tema e subtema selecionados
- Quando o tema mudar: limpar subtema selecionado

**2.4. Atualizar a interface da Etapa de Identificacao:**
Apos o seletor de Eixo Tematico, adicionar:

```text
[Campo: Eixo Tematico *]  <- ja existe
         |
         v
[Campo: Tema *]          <- NOVO (filtrado pelo eixo)
         |
         v
[Campo: Subtema]         <- NOVO (filtrado pelo tema, opcional)
```

**2.5. Atualizar validacao:**
- Tornar a selecao de Tema obrigatoria
- Subtema sera opcional

**2.6. Atualizar o submit:**
Incluir `tema_id` e `subtema_id` no insert do Supabase

---

### Fluxo de Uso
1. Entrevistador seleciona o Eixo (ex: Desenvolvimento Social)
2. O campo Tema carrega apenas temas daquele eixo (Educacao, Saude, etc.)
3. Entrevistador seleciona o Tema (ex: Educacao)
4. O campo Subtema carrega subtemas daquele tema (Educacao Infantil, Ensino Medio, etc.)
5. Entrevistador pode ou nao selecionar um Subtema

---

### Beneficios
- Tagueamento preciso de cada proposta tecnica
- Filtros de busca mais assertivos por tema e subtema
- Melhor organizacao e agrupamento de propostas
- Relatorios e dashboards mais detalhados por categoria

---

### Detalhes Tecnicos

**Arquivos a modificar:**
1. `src/components/entrevista/EntrevistaForm.tsx` - Adicionar campos e logica
2. Migracao SQL para adicionar `subtema_id`

**Dependencias utilizadas:**
- Componentes Select existentes do Radix UI
- Supabase client para queries
- Estados React com cascata (useEffect)

