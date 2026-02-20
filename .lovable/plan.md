

# Finalizar limpeza das propostas tecnicas

## Resumo
Continuar a limpeza ja iniciada, removendo os registros restantes das tabelas de dados operacionais. A estrutura da plataforma, formularios, dashboards e todas as funcionalidades permanecem inalteradas.

## Ja executado
- proposal_evaluations: limpa
- proposal_alerts: limpa

## Proximos passos (3 comandos DELETE)

| Ordem | Tabela | Acao |
|-------|--------|------|
| 1 | leads | Apagar apenas leads com origem "proposta" (vinculados a propostas tecnicas/politicas) |
| 2 | propostas_tecnicas | Apagar todos os registros |
| 3 | propostas_politicas | Apagar todos os registros |

## O que NAO sera alterado
- sugestoes_populares (20 registros mantidos)
- Nenhuma tabela de schema, funcao ou trigger
- Nenhum componente, pagina ou formulario
- Toda a plataforma continua funcionando normalmente, pronta para receber dados reais

## Detalhes tecnicos

```text
DELETE FROM leads WHERE origem = 'proposta';
DELETE FROM propostas_tecnicas;
DELETE FROM propostas_politicas;
```

Apenas dados serao removidos. Nenhuma alteracao de codigo ou estrutura.
