# Substituir PDF do Plano de Governo e corrigir nome do download

## Contexto
- O asset pointer atual (`src/assets/plano-governo.pdf.asset.json`) aponta para `Plano_de_Governo_MORO2026.pdf`.
- O usuário acabou de enviar uma nova versão: `Plano_de_Governo_MORO2026-2.pdf`.
- Os CTAs em `/planodegoverno` forçam o nome do download via atributo `download="Plano_de_Governo_MORO26.pdf"`, o que faz o navegador salvar o arquivo com o nome antigo.

## O que será feito
1. Fazer upload do arquivo `Plano_de_Governo_MORO2026-2.pdf` para o CDN via `lovable-assets`, atualizando o asset pointer `src/assets/plano-governo.pdf.asset.json`.
2. Atualizar o atributo `download` nos dois CTAs de `src/pages/MetodologiaPlano.tsx` para `Plano_de_Governo_MORO2026-2.pdf`.
3. Verificar se existem outras referências ao nome antigo no projeto.
4. Rodar o build para garantir que tudo funciona.

## Arquivos envolvidos
- `src/assets/plano-governo.pdf.asset.json`
- `src/pages/MetodologiaPlano.tsx` (linhas 91 e 198)

## Critério de sucesso
Ao clicar em "Baixar o Plano de Governo", o navegador deve baixar e salvar o arquivo como `Plano_de_Governo_MORO2026-2.pdf`.
