# Sugestões via WhatsApp (Click-to-WhatsApp da Meta)

Nova rota: o anúncio da Meta abre direto a conversa no WhatsApp. O atendimento e o treinamento do bot ficam com o fornecedor homologado; a plataforma recebe a sugestão pronta e a trata como as demais.

## Divisão de responsabilidades

- **Fornecedor homologado**: número oficial, Cloud API, roteiro/treinamento da conversa, coleta de nome, município e sugestão.
- **Plataforma (nós)**: endpoint seguro de entrada, validação, classificação por eixo/tema, gravação da sugestão, geração de lead e visualização nos painéis.

## Como vai funcionar

1. O anúncio Click-to-WhatsApp abre a conversa no número do fornecedor.
2. O bot do fornecedor conduz o diálogo e, ao concluir, envia os dados para a nossa API.
3. A plataforma valida, classifica com IA (eixo/tema) e grava em `sugestoes_populares`, gerando o lead automático.
4. A sugestão aparece nos painéis existentes (Sugestões, Cruzamento, Analytics) marcada com origem WhatsApp.

## Etapas técnicas

1. **Banco**
   - Coluna `origem` (texto, default `site`) em `sugestoes_populares` para separar `whatsapp` de `site`.
   - Tabela `whatsapp_ingest_log`: payload recebido, id externo da conversa, status (aceito/rejeitado), motivo do erro. RLS só admin, com GRANTs para `authenticated` e `service_role`.

2. **Edge function `whatsapp-ingest`** (pública, `verify_jwt = false`)
   - Autenticação por token secreto no header (`X-Ingest-Token`), fornecido ao parceiro.
   - Validação com Zod: `nome`, `municipio`, `whatsapp`, `descricao` (obrigatórios), `eixo` e `external_id` (opcionais).
   - Normalização do telefone (E.164) e do município contra a tabela `municipios` (MT), rejeitando com mensagem clara quando não houver correspondência.
   - Idempotência por `external_id` para não duplicar em reenvio do parceiro.
   - Classificação automática de eixo/tema reutilizando a função de classificação já existente quando o parceiro não enviar o eixo.
   - Grava a sugestão com `origem = 'whatsapp'`; o trigger atual cria o lead.
   - Resposta padronizada (200 aceito, 400 inválido, 401 token errado) e registro em `whatsapp_ingest_log`.

3. **Documentação para o fornecedor**
   - Página interna no admin com a URL do endpoint, o formato do JSON, exemplos de sucesso e de erro, e o token (visível só para admin).

4. **Painel admin**
   - Filtro/badge "WhatsApp" na lista de sugestões e contagem no Analytics.
   - Tela simples de monitoramento das últimas entradas recebidas, com os erros de validação, para depurar junto ao fornecedor.

## O que preciso de você

- Confirmar quem é o fornecedor e se ele consegue chamar um webhook HTTP nosso ao final da conversa.
- Definir se ele envia também o eixo temático ou se deixamos a IA classificar tudo.

## Fora do escopo

- Construir o roteiro/bot da conversa (é do fornecedor).
- Disparo ativo de mensagens e templates.
- Envio de conversões para o Meta CAPI a partir do WhatsApp.
