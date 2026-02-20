

# Limpeza da base de dados para uso oficial

## Resumo
Remover todos os dados de teste das tabelas de leads, propostas tecnicas, propostas politicas e tabelas dependentes, mantendo apenas as sugestoes populares (20 registros).

## O que sera apagado

| Tabela | Registros | Motivo |
|--------|-----------|--------|
| proposal_evaluations | 2 | Dependencia de propostas_tecnicas |
| proposal_alerts | 0 | Dependencia de propostas_tecnicas |
| leads | 514 | Reset completo |
| propostas_tecnicas | 95 | Reset completo |
| propostas_politicas | 21 | Reset completo |

## O que sera mantido

| Tabela | Registros |
|--------|-----------|
| sugestoes_populares | 20 |

## Ordem de execucao

A limpeza precisa respeitar dependencias entre tabelas:

1. Apagar `proposal_evaluations` (referencia propostas_tecnicas)
2. Apagar `proposal_alerts` (referencia propostas_tecnicas)
3. Apagar `leads` (pode referenciar propostas)
4. Apagar `propostas_tecnicas`
5. Apagar `propostas_politicas`

## Detalhes tecnicos

Serao executados 5 comandos DELETE via ferramenta de dados (nao migracao de schema):

```text
DELETE FROM proposal_evaluations;
DELETE FROM proposal_alerts;
DELETE FROM leads;
DELETE FROM propostas_tecnicas;
DELETE FROM propostas_politicas;
```

Nenhuma alteracao de schema e necessaria. Apenas limpeza de dados.
