
# Exemplos contextualizados por eixo tematico no formulario de entrevista

## Resumo
Todas as dicas/exemplos ("Ex:") exibidas abaixo das perguntas no formulario de entrevista passarao a ser dinamicas, refletindo o eixo tematico selecionado pelo lider. Hoje os exemplos sao genericos; apos a mudanca, um lider de Seguranca vera exemplos sobre seguranca, um de Infraestrutura vera exemplos de infraestrutura, e assim por diante.

## O que muda

Sera criado um mapa de exemplos por eixo no arquivo de configuracao `src/config/entrevistaQuestions.ts` e o componente `EntrevistaForm.tsx` passara a consumir esses exemplos dinamicamente com base no `eixoId` selecionado.

### Perguntas afetadas (6 etapas, ~12 campos com dicas)

| Etapa | Pergunta | Exemplo atual (generico) |
|-------|----------|--------------------------|
| Aquecimento (A1) | Area de atuacao | "Atencao primaria em saude no litoral" |
| Aquecimento (A2) | 3 desafios | "Foque nos desafios operacionais..." |
| O que Funciona (B1) | Acoes a manter | "O que o proximo governo NAO deve mexer" |
| O que Funciona (B2) | Impacto de parar | "Quantifique ou descreva o impacto" |
| O que Nao Funciona (C1) | Causas-raiz | "Va alem dos sintomas" |
| O que Nao Funciona (C2) | Caso real | "Um caso concreto que exemplifique" |
| O que Nao Funciona (C3) | Prioridade correcao | "A acao de maior impacto" |
| Parar/Substituir (D1) | Rotinas ineficientes | "Identifique o que consome recurso" |
| Parar/Substituir (D2) | Substituicao | "Proponha alternativas concretas" |
| Governanca (E1) | Planejamento vs anuncio | "Existe diferenca entre o comunicado e executado" |
| Governanca (E2) | Integracao Estado-Municipio | "A cooperacao funciona?" |
| Cocriacao (G1) | Entregas 90 dias | "Acoes rapidas, visiveis e de baixa complexidade" |

### Exemplos por eixo (amostra)

**Desenvolvimento Social:**
- A1: "Atencao primaria em saude no litoral" ou "Protecao social em municipios de alta vulnerabilidade"
- D1: "Programas assistenciais duplicados entre CRAS e UBS sem prontuario integrado"

**Seguranca, Justica, Combate a Corrupcao:**
- A1: "Inteligencia policial na regiao metropolitana" ou "Gestao penitenciaria no interior"
- D1: "Boletins de ocorrencia em papel que atrasam o fluxo de inqueritos"

**Desenvolvimento Economico Sustentavel:**
- A1: "Logistica de graos na regiao Oeste" ou "Credito para micro e pequenas empresas"

**Desenvolvimento das Cidades e Infraestrutura:**
- A1: "Saneamento basico em municipios de pequeno porte" ou "Mobilidade urbana em Curitiba e regiao metropolitana"

**Gestao Publica Eficiente:**
- A1: "Transformacao digital nos processos de licenciamento" ou "Capacitacao de servidores na area tributaria"

## Detalhes tecnicos

### 1. Novo mapa de exemplos em `src/config/entrevistaQuestions.ts`

Sera adicionado um `Record<string, ExemplosEixo>` com os 5 eixos mapeados por UUID, contendo textos de exemplo para cada campo. Um fallback generico sera mantido para eixos nao mapeados.

```text
exemplosFormularioPorEixo: Record<string, ExemplosFormulario>
  - a1_area_atuacao: string
  - a2_desafios_hint: string
  - b1_acoes_hint: string
  - b2_impacto_hint: string
  - c1_causas_hint: string
  - c2_caso_hint: string
  - c3_prioridade_hint: string
  - d1_rotinas_hint: string
  - d2_substituicao_hint: string
  - e1_planejamento_hint: string
  - e2_integracao_hint: string
  - g1_entregas_hint: string
```

### 2. Atualizacao de `EntrevistaForm.tsx`

- Importar a nova funcao `getExemplosFormulario(eixoId)`
- Calcular os exemplos com `useMemo` baseado no `eixoId`
- Substituir todos os textos estaticos das tags `<p className="text-xs text-gray-400 mb-2">` pelos valores dinamicos
- Quando nenhum eixo estiver selecionado, exibir os exemplos genericos (fallback)
