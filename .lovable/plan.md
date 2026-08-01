# Card de Gênero no Painel de Cruzamento

Classificar o gênero de quem enviou sugestão a partir do **primeiro nome**, permitir corrigir manualmente os indefinidos e mostrar o recorte homens/mulheres em cada card de mesorregião.

## O que será entregue

### 1. Classificação por primeiro nome
Um dicionário de nomes brasileiros (masculinos e femininos, incluindo grafias comuns e nomes compostos) mais regras de terminação (`-a`/`-e` femininos, `-o`/`-r` masculinos etc.) resolvem a maioria dos casos automaticamente. O que não for conclusivo — nomes unissex (Alex, Darci, Ariel), nomes abreviados ou registros sem nome — fica como **Indefinido**.

Cada registro guarda:
- o gênero (masculino / feminino / indefinido)
- a origem (`automatico` ou `manual`)
- a confiança da inferência

Correções manuais **nunca são sobrescritas** por uma reclassificação automática posterior.

### 2. Card "Perfil por gênero"
Novo card no `/admin/cruzamento-sugestoes`, no mesmo estilo dos demais:
- Big numbers: total de **Homens**, **Mulheres** e **Indefinidos**, com percentual sobre o total classificado
- Barra de proporção visual homens × mulheres
- Botão **Reclassificar nomes** para processar registros pendentes
- Indicador de cobertura (quantos dos 1.660 registros já têm gênero definido)

### 3. Edição manual dos indefinidos
Dentro do card, uma lista dos registros indefinidos mostrando nome, cidade e trecho da sugestão, com dois botões por linha — **Homem** / **Mulher**. Um clique grava a correção e atualiza os números na hora. A lista é paginada e some conforme os casos vão sendo resolvidos.

### 4. Gênero em cada mesorregião
No bloco "Top 3 temas por região", cada card de mesorregião ganha uma linha de big numbers com a contagem de **homens** e **mulheres** que opinaram naquela região, mais o percentual feminino — permitindo comparar o engajamento por gênero entre Norte Central, Metropolitana de Curitiba, Oeste, e assim por diante.

## Observação

A inferência por primeiro nome é estatística: acerta a grande maioria dos nomes brasileiros, mas é uma estimativa, não um dado declarado. A tela deixa isso explícito e a edição manual existe justamente para tratar as exceções.

## Detalhes técnicos

- **Tabela** `sugestao_genero`: `sugestao_id` (FK única para `sugestoes_populares`, cascade), `genero` (`masculino` | `feminino` | `indefinido`), `origem` (`automatico` | `manual`), `confianca` (int), `primeiro_nome`, timestamps. GRANTs para `authenticated` e `service_role`; RLS liberando leitura e escrita apenas a `is_admin()` / `has_role('lider_tematico')`.
- **Tabela de apoio** `nomes_genero`: `nome` (normalizado, sem acento, minúsculo), `genero`, `peso` — semeada com os nomes brasileiros mais frequentes, seguindo o mesmo padrão de `taxonomia_keywords`.
- **Função** `classificar_genero_nome(p_nome text)`: normaliza com `unaccent`, extrai o primeiro token, consulta `nomes_genero` e, em falha, aplica as regras de terminação; devolve gênero + confiança.
- **Função** `reclassificar_genero_sugestoes(p_somente_pendentes boolean, p_limite int)`: mesmo padrão de `reclassificar_sugestoes_taxonomia`, ignorando registros com `origem = 'manual'`.
- **Trigger** em `sugestoes_populares` (AFTER INSERT) chamando a classificação, para que novas sugestões já cheguem classificadas.
- **RPCs de leitura** com guarda `pode_ver_painel_cruzamento()`:
  - `painel_genero_resumo()` → totais e percentuais
  - `painel_genero_por_regiao()` → mesorregião, masculino, feminino, indefinido
  - `painel_genero_indefinidos(p_limite, p_offset)` → lista para a edição manual
- **Frontend** em `src/pages/AdminCruzamentoSugestoes.tsx`: novo componente `GeneroPanel` seguindo os padrões atuais (`rpc<any>()` + React Query, tokens de cor existentes), com `invalidateQueries` após cada correção manual, e injeção dos big numbers nos cards do bloco "Top 3 temas por região".
