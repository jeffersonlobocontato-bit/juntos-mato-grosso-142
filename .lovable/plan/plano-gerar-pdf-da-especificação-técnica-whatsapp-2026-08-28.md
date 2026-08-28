# Plano: Gerar PDF da Especificação Técnica WhatsApp

## Objetivo
Converter o arquivo `/mnt/documents/integracao-whatsapp-fornecedor.md` em um PDF formal, pronto para envio ao fornecedor homologado.

## Entregáveis
1. Arquivo PDF em `/mnt/documents/integracao-whatsapp-fornecedor.pdf`.
2. Layout com identidade visual da campanha (verde/amarelo/branco, fontes Montserrat/Inter).
3. Espaço reservado para preenchimento manual do endpoint e do token.
4. QA visual das páginas geradas.

## Etapas
1. Ler o Markdown de origem.
2. Criar script Python usando ReportLab para renderizar o conteúdo em PDF.
3. Aplicar estilo institucional (cores, cabeçalho/rodapé, fonte Unicode para português).
4. Salvar em `/mnt/documents`.
5. Converter PDF para imagens e inspecionar visualmente.
6. Apresentar o arquivo ao usuário.

## Fora do escopo
- Alterar o conteúdo técnico do documento.
- Incluir o token real no PDF (permanece placeholder).
