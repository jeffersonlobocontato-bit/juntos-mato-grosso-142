# Plano: Gerar especificação técnica para fornecedor WhatsApp

## Objetivo
Criar um documento formal de integração para o fornecedor homologado do WhatsApp, explicando como enviar leads/sugestões para a plataforma via webhook.

## Entregáveis
1. Arquivo Markdown `/mnt/documents/integracao-whatsapp-fornecedor.md` contendo:
   - URL do endpoint de ingestão (copiada do painel `/admin/whatsapp`).
   - Headers obrigatórios (`Content-Type`, `X-Ingest-Token`).
   - Schema completo do payload JSON com campos obrigatórios e opcionais.
   - Regras de idempotência via `external_id`.
   - Códigos de resposta e tratamento de erros.
   - Exemplo de requisição `curl`.
   - Instrução clara para o fornecedor colar o token copiado do painel.

## Notas
- O token real não será incluído no documento; será usado um placeholder `[COLE O X-INGEST-TOKEN AQUI]` para o usuário preencher.
- O documento será escrito em português, direto ao fornecedor técnico.
