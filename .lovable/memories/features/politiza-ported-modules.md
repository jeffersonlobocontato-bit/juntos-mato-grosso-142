---
name: Módulos portados do Politiza IA
description: Mapa Estratégico, Cruzamento Wellington, Base de Pesquisas, Inteligência de Campanha e Tracking Eleitoral no admin MT
type: feature
---
Cinco módulos portados de politiza.ia.br para a plataforma Juntos Mato Grosso 142 (ago/2026):

- `/admin/mapa-estrategico` — choropleth Leaflet dos 142 municípios de MT (GeoJSON via API IBGE, UF 51), colorido por `municipality_associations` / `association_members`. Camada de "leads" do original NÃO portada.
- `/admin/cruzamento-wellington` — engine quali-quanti com acesso individual controlado (`cruzamento_wellington_access`, edge function `manage-cruzamento-wellington-access`). `src/data/cruzamentoWellington.ts` fica VAZIO de propósito: os dados do Moro/PR não podem ser reaproveitados (seria fabricar pesquisa eleitoral). Preencher só com pesquisa qualitativa real de MT.
- `/admin/base-pesquisas` — `electoral_surveys` / `survey_questions` / `survey_results`. Seed real: PercentBrasil MT, coleta 07–10/08/2026, 1200 entrevistas, ME 2,83, TSE BR-01495/2026 e MT-03154/2026. Convive com o módulo nativo `/admin/pesquisas` (são dois módulos distintos).
- `/admin/inteligencia` — 100% data-driven a partir da Base de Pesquisas, sem hardcode; chat via edge function `chat-inteligencia-mt`. Abas Ameaças/Oportunidades/Raio-X/Ações do original NÃO portadas (eram pesquisa qualitativa do PR).
- `/admin/tracking` + `/tracking/coleta/:shareCode` — 9 tabelas `tracking_*`. Dashboard essencial e formulário de campo prontos; mapa/gráficos avançados/IA do tracking e cadastro dedicado de entrevistadores ainda não construídos (schema já existe).

RLS de todas as tabelas usa `has_role(auth.uid(), '<role>'::app_role)` — a função do projeto recebe o enum `app_role`, nunca `text`.
