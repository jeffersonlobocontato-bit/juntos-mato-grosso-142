
## Renomear "Rota 399" para "Juntos Parana 399" em todo o projeto

### Resumo
Substituir todas as ocorrencias do nome "Rota 399" por "Juntos Parana 399" em todos os arquivos do projeto. Tambem atualizar URLs de redes sociais e handles que referenciam "rota399".

### Arquivos a modificar (20 arquivos, ~158 ocorrencias)

#### 1. index.html
- Title, meta description, author, keywords, og:title, twitter:site
- Trocar "@Rota399" para "@JuntosParana399"

#### 2. src/components/landing/HeroSection.tsx
- Mensagem de compartilhamento: "Participe da Rota 399!" -> "Participe do Juntos Parana 399!"
- URL placeholder: "rota399.org.br" -> manter ou atualizar conforme necessario
- Titulo hero: "Rota 399:" -> "Juntos Parana 399:"

#### 3. src/components/landing/Header.tsx
- Nome no header: "Rota 399" -> "Juntos Parana 399"

#### 4. src/components/landing/Footer.tsx
- Nome no footer: "Rota 399" -> "Juntos Parana 399"
- Copyright: "Rota 399 - Iniciativa Popular"
- Email: "contato@rota399.org.br" (manter dominio tecnico ou atualizar)
- URLs de redes sociais (instagram, facebook, twitter, linkedin, youtube, tiktok): atualizar handles de "rota399" para "juntosparana399"

#### 5. src/components/landing/AboutSection.tsx
- Texto descritivo: "A Rota 399 e uma iniciativa..."

#### 6. src/components/landing/ChatBot.tsx
- Mensagem de boas-vindas e titulo do assistente

#### 7. src/components/landing/FloatingShareButton.tsx
- Mensagem de compartilhamento e URL

#### 8. src/components/landing/SocialShareButtons.tsx
- Mensagem padrao e titulo de compartilhamento

#### 9. src/components/landing/SocialEngagementSection.tsx
- Titulo da secao e mensagem de compartilhamento

#### 10. src/components/landing/SuggestionForm.tsx
- Mensagem pos-envio de sugestao

#### 11. src/components/entrevista/EntrevistaHero.tsx
- Titulo hero e texto "Idealizador da Iniciativa"

#### 12. src/components/entrevista/EntrevistaAbout.tsx
- Texto descritivo

#### 13. src/components/liderancas/LiderancasHero.tsx
- Titulo hero e texto "Idealizador da Iniciativa"

#### 14. src/components/liderancas/LiderancasAbout.tsx
- Texto descritivo

#### 15. src/pages/Admin.tsx
- Descricao do painel admin

#### 16. src/pages/AdminMensageria.tsx
- Conteudo de alertas/emails e assunto

#### 17. src/pages/Entrevista.tsx
- Texto de acesso restrito

#### 18. src/pages/Liderancas.tsx
- document.title para SEO

#### 19. supabase/functions/chat-rota399/index.ts
- System prompt inteiro do chatbot (todas as mencoes a "Rota 399")
- Nota: o nome da funcao em si (chat-rota399) sera mantido para evitar quebra de integracao

#### 20. supabase/functions/proposal-stale-alert/index.ts
- Remetente de email e rodape

#### 21. src/hooks/useAnalytics.tsx
- Chaves de localStorage ("rota399_visitor_id", "rota399_geo") - manter como estao pois sao chaves tecnicas internas

#### 22. supabase/functions/seed-test-users/index.ts
- Emails de teste (@rota399.test) - manter como estao pois sao dados de teste internos

### Regra de substituicao
- "Rota 399 Parana" -> "Juntos Parana 399"
- "Rota 399" (isolado) -> "Juntos Parana 399"
- "rota399" em URLs de redes sociais -> "juntosparana399"
- "@Rota399" -> "@JuntosParana399"
- Chaves tecnicas internas (localStorage, emails de teste) permanecem inalteradas
- Nome da edge function (chat-rota399) permanece inalterado
