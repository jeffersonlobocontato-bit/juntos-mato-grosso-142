# Corrigir nome do arquivo baixado do Plano de Governo

## Problema
O asset pointer `src/assets/plano-governo.pdf.asset.json` já aponta para `Plano_de_Governo_MORO2026.pdf`, mas os links de download em `/planodegoverno` possuem o atributo `download="Plano_de_Governo_MORO26.pdf"`. Esse atributo sobrescreve o nome original e faz o navegador salvar o arquivo com o nome antigo.

## O que será feito
1. Atualizar o atributo `download` nos dois CTAs de `src/pages/MetodologiaPlano.tsx` para `Plano_de_Governo_MORO2026.pdf`.
2. Verificar se existem outras referências ao nome antigo no projeto.
3. Rodar o build para garantir que a alteração não quebra nada.

## Arquivos envolvidos
- `src/pages/MetodologiaPlano.tsx` (linhas 91 e 198)

## Critério de sucesso
Ao clicar em "Baixar o Plano de Governo", o navegador deve salvar o arquivo como `Plano_de_Governo_MORO2026.pdf`.
