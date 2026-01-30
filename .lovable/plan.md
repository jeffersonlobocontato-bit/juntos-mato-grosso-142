
# Plano: Reorganização Hierárquica Completa dos Eixos Temáticos

## ✅ Progresso (Fase 1 Concluída)

- [x] Migration SQL - Schema + Seed (5 eixos, 34 temas, ~60 subtemas)
- [x] Componente EixoTemaSelector - Seleção cascata reutilizável
- [x] AdminEixos - Interface hierárquica com accordions
- [ ] Formulários - EntrevistaForm, SuggestionForm, LiderancasForm
- [ ] Páginas Admin - AdminPropostas, AdminSugestoes, AdminMeuPainel
- [ ] Mapas e Dashboards - PublicParanaHeatmap, ParanaMap, Dashboard

## Resumo Executivo

Migração da estrutura plana de 8 eixos para uma hierarquia de 3 níveis (5 Eixos → Temas → Sub-temas), impactando toda a plataforma: cadastros, mapas, dashboards e filtros.

---

## Nova Estrutura de Dados

| Eixo | Subtítulo | Temas |
|------|-----------|-------|
| 01 - Desenvolvimento Social | Qualidade de Vida | 5 (Educação, Cultura, Esporte, Saúde, Assistência Social) |
| 02 - Desenvolvimento Econômico Sustentável | Geração de Emprego e Renda | 11 (Agricultura, Indústria, Comércio, Turismo, etc.) |
| 03 - Desenvolvimento das Cidades e Infraestrutura | Viver e Transitar | 8 (Habitação, Mobilidade, Saneamento, Logística, etc.) |
| 04 - Gestão Pública Eficiente | Controlar | 4 (Modernização, Responsabilidade Fiscal, etc.) |
| 05 - Segurança, Justiça, Combate à Corrupção | - | 6 (Segurança Pública, Combate à Corrupção, etc.) |

---

## Fase 1: Modelagem do Banco de Dados

### 1.1 Modificar tabela `eixos_tematicos`

```sql
ALTER TABLE eixos_tematicos 
  ADD COLUMN subtitulo TEXT,
  ADD COLUMN ordem INTEGER DEFAULT 0;
```

### 1.2 Criar tabela `temas`

```sql
CREATE TABLE temas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eixo_id UUID NOT NULL REFERENCES eixos_tematicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,  -- "1.1", "2.3", etc.
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: leitura pública, escrita admin
CREATE POLICY "Anyone can view temas" ON temas FOR SELECT USING (true);
CREATE POLICY "Admins can manage temas" ON temas FOR ALL USING (is_admin(auth.uid()));
```

### 1.3 Criar tabela `subtemas`

```sql
CREATE TABLE subtemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id UUID NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS similar
```

### 1.4 Modificar tabelas de propostas

```sql
ALTER TABLE propostas_tecnicas ADD COLUMN tema_id UUID REFERENCES temas(id);
ALTER TABLE propostas_politicas ADD COLUMN tema_id UUID REFERENCES temas(id);
ALTER TABLE sugestoes_populares ADD COLUMN tema_id UUID REFERENCES temas(id);
```

### 1.5 Seed completo dos dados

Inserir os 5 novos eixos (substituindo os 8 antigos), 34 temas e ~80 subtemas conforme a lista fornecida.

---

## Fase 2: Componente Reutilizável de Seleção

### Novo arquivo: `src/components/admin/EixoTemaSelector.tsx`

Componente de seleção em cascata:

```text
[Select Eixo] → [Select Tema] → [Select Subtema (opcional)]

Props:
- eixoId, temaId, subtemaId (controlled)
- onEixoChange, onTemaChange, onSubtemaChange
- showSubtemas?: boolean (default: true)
- required?: boolean
```

Este componente será reutilizado em todos os formulários.

---

## Fase 3: Atualização dos Formulários de Cadastro

### 3.1 Formulário de Entrevista (`src/components/entrevista/EntrevistaForm.tsx`)

**Mudanças:**
- Substituir seleção única de eixo por `EixoTemaSelector`
- Atualizar estado do formulário para incluir `tema_id`
- Atualizar submissão para salvar `tema_id` junto com `eixo_id`
- Adaptar indicadores para carregar por tema (não mais por eixo)

### 3.2 Formulário de Sugestões (`src/components/landing/SuggestionForm.tsx`)

**Mudanças:**
- Remover lista hardcoded `eixosList` (linha 66-75 de AdminSugestoes)
- Substituir por fetch dinâmico da tabela `eixos_tematicos`
- Adicionar segundo select para escolha de tema
- Salvar `eixo` (nome) e `tema_id` na sugestão

### 3.3 Formulário de Lideranças (`src/components/liderancas/LiderancasForm.tsx`)

**Mudanças:**
- Implementar seleção cascata Eixo → Tema
- Atualizar payload de submissão

---

## Fase 4: Atualização das Páginas Admin

### 4.1 AdminEixos (`src/pages/AdminEixos.tsx`)

**Transformação completa:**
- Visualização hierárquica com acordeões (Eixo → Temas)
- CRUD de Eixos com subtítulo
- CRUD de Temas dentro de cada eixo
- CRUD de Subtemas dentro de cada tema
- Estatísticas por tema (quantidade de propostas/sugestões)
- Drag-and-drop para reordenação

### 4.2 AdminPropostas (`src/pages/AdminPropostas.tsx`)

**Mudanças:**
- Adicionar filtro por Tema após seleção de Eixo
- Atualizar form de criação/edição com `EixoTemaSelector`
- Exibir tema na tabela de listagem
- Atualizar marcadores do mapa para incluir tema

### 4.3 AdminSugestoes (`src/pages/AdminSugestoes.tsx`)

**Mudanças:**
- Remover `eixosList` hardcoded (linhas 66-75)
- Buscar eixos dinamicamente do banco
- Adicionar filtro por Tema
- Atualizar cores dos badges para nova estrutura
- Atualizar gráfico de pizza por eixo

### 4.4 AdminMeuPainel (`src/pages/AdminMeuPainel.tsx`)

**Mudanças:**
- `eixoSummary` (linha 340-358): Agrupar por eixo com breakdown por tema
- `statusPorEixo` (linha 317-337): Adaptar para nova estrutura
- `propostasPorEixo` (linha 294-303): Manter agrupamento por eixo pai
- `EixoSummaryTable`: Expandir para mostrar temas
- `EixoStatusChart`: Opção de drill-down por tema

---

## Fase 5: Atualização dos Mapas

### 5.1 Heatmap Público (`src/components/dashboard/PublicParanaHeatmap.tsx`)

**Mudanças:**
- Atualizar `eixoColors` (linhas 33-42) para os 5 novos eixos
- Modificar query para incluir tema no tooltip
- Atualizar legenda com novos eixos

### 5.2 ParanaMap Admin (`src/components/admin/ParanaMap.tsx`)

**Mudanças:**
- Atualizar sistema de cores bicolor para 5 eixos
- Incluir tema no popup de marcador

---

## Fase 6: Atualização dos Dashboards

### 6.1 Dashboard Público (`src/pages/Dashboard.tsx`)

**Mudanças:**
- Atualizar `proposalsByEixo` (linhas 37-46) para 5 eixos
- Atualizar filtro de eixos no header (linhas 107-117)
- Adaptar gráfico de barras por eixo

### 6.2 Componentes de Gráficos

| Componente | Mudança |
|------------|---------|
| `EixoSummaryTable.tsx` | Adicionar coluna de tema e expandir linhas |
| `EixoStatusChart.tsx` | Opção de visualização por tema |
| `EixoComparisonPanel.tsx` | Comparação pode ser por eixo ou tema |
| `GovernmentBalanceChart.tsx` | Agrupar por eixo com breakdown por tema |

---

## Fase 7: Hooks e Utilitários

### 7.1 `useUserAccess.tsx`

**Mudanças:**
- Adicionar suporte para permissões por tema (não apenas eixo)
- Novo método `canAccessTema(temaId)`
- Atualizar `getEixoIds()` para retornar eixos pai

### 7.2 Nova função utilitária

```typescript
// src/utils/eixoHelpers.ts
export const getEixoColor = (eixoNome: string): string => { ... }
export const getTemasByEixo = (eixoId: string, temas: Tema[]): Tema[] => { ... }
```

---

## Fase 8: Migração de Dados Existentes

### 8.1 Mapeamento de eixos antigos → novos

| Eixo Antigo | Novo Eixo | Tema Sugerido |
|-------------|-----------|---------------|
| Educação | 01 - Desenvolvimento Social | 1.1 Educação |
| Saúde | 01 - Desenvolvimento Social | 1.4 Saúde |
| Segurança Pública | 05 - Segurança, Justiça | 5.1 Segurança Pública |
| Infraestrutura | 03 - Cidades e Infraestrutura | 3.3 Infraestrutura Urbana |
| Agricultura e Meio Ambiente | 02 - Desenvolvimento Econômico | 2.1 Agricultura / 2.11 Meio Ambiente |
| Economia e Turismo | 02 - Desenvolvimento Econômico | 2.3 Comércio / 2.4 Turismo |
| Desenvolvimento Social | 01 - Desenvolvimento Social | 1.5 Assistência Social |
| Tecnologia e Inovação | 02 - Desenvolvimento Econômico | 2.7 Inovação e Tecnologia |

### 8.2 Script de migração

```sql
-- Criar mapping temporário e atualizar propostas existentes
-- Manter registro de propostas não mapeadas para revisão manual
```

---

## Arquivos Impactados

### Banco de Dados (Migration)
- Nova migration com ~500 linhas (schema + seed completo)

### Componentes (Frontend)
| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/components/admin/EixoTemaSelector.tsx` | **Novo** |
| `src/components/entrevista/EntrevistaForm.tsx` | Modificar |
| `src/components/landing/SuggestionForm.tsx` | Modificar |
| `src/components/liderancas/LiderancasForm.tsx` | Modificar |
| `src/components/admin/EixoSummaryTable.tsx` | Modificar |
| `src/components/admin/EixoStatusChart.tsx` | Modificar |
| `src/components/admin/EixoComparisonPanel.tsx` | Modificar |
| `src/components/dashboard/PublicParanaHeatmap.tsx` | Modificar |
| `src/components/admin/ParanaMap.tsx` | Modificar |

### Páginas
| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/pages/AdminEixos.tsx` | **Reescrever** |
| `src/pages/AdminPropostas.tsx` | Modificar |
| `src/pages/AdminSugestoes.tsx` | Modificar |
| `src/pages/AdminMeuPainel.tsx` | Modificar |
| `src/pages/Dashboard.tsx` | Modificar |

### Hooks e Utils
| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/hooks/useUserAccess.tsx` | Modificar |
| `src/utils/eixoHelpers.ts` | **Novo** |

---

## Resumo de Impacto

- **3 novas tabelas**: `temas`, `subtemas`, + alterações em `eixos_tematicos`
- **3 tabelas modificadas**: `propostas_tecnicas`, `propostas_politicas`, `sugestoes_populares`
- **~15 arquivos frontend modificados**
- **2 novos arquivos criados**
- **Migração de dados existentes** com mapeamento automático

---

## Ordem de Implementação

1. **Migration SQL** - Schema + seed dos dados
2. **Componente EixoTemaSelector** - Base para todos os forms
3. **AdminEixos** - Interface de gestão hierárquica
4. **Formulários** - EntrevistaForm, SuggestionForm, LiderancasForm
5. **Páginas Admin** - AdminPropostas, AdminSugestoes, AdminMeuPainel
6. **Mapas e Dashboards** - PublicParanaHeatmap, ParanaMap, Dashboard
7. **Migração de dados** - Mapeamento dos registros existentes
8. **Testes e ajustes** - Validação end-to-end
