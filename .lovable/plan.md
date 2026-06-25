# Plano: substituir a home pela landing single-page do anexo

Substituir 100% do layout da home `/` pela peça do anexo, aplicando o design system (creme + verde governo + dourado + formas orgânicas) e implementando, agora, o bloco "Enviar opinião por áudio" com gravação + transcrição via IA. Sem foto do Moro: deixo um espaço reservado e troco assim que você enviar a oficial.

## Resultado visual (desktop e mobile)

```text
DESKTOP (≥ 1024px)                              MOBILE (< 1024px)
┌──────────────────────────────────────────┐    ┌────────────────────┐
│  formas verdes/amarelas orgânicas (svg)  │    │ formas (mais leves)│
│ ┌──────────────────┐  ┌────────────────┐ │    │ ┌────────────────┐ │
│ │ Logo 399         │  │   [FOTO MORO]  │ │    │ │ Logo 399       │ │
│ │ Headline gigante │  │   (placeholder)│ │    │ │ Headline       │ │
│ │ "Plano Colab."   │  │   chip dourado │ │    │ │ chip dourado   │ │
│ │                  │  │   "Sua voz…"   │ │    │ │ [foto opcional]│ │
│ │ ┌──────────────┐ │  └────────────────┘ │   │ ├────────────────┤ │
│ │ │ FORM CARD    │ │  ┌────────────────┐ │   │ │ FORM CARD      │ │
│ │ │ Nome  Tel    │ │  │ Participe      │ │   │ │  campos +      │ │
│ │ │ Cidade       │ │  │   agora!       │ │   │ │  áudio +       │ │
│ │ │ Sugestão     │ │  │  • bullet 1    │ │   │ │  CTA Enviar    │ │
│ │ │ [áudio bloc] │ │  │  • bullet 2    │ │   │ ├────────────────┤ │
│ │ │ CTA Enviar   │ │  │  • bullet 3    │ │   │ │ Participe      │ │
│ │ └──────────────┘ │  └────────────────┘ │   │ │   agora! card  │ │
│ └──────────────────┘                     │   │ └────────────────┘ │
│  rodapé escudo: Transparência…           │   │ rodapé escudo      │
└──────────────────────────────────────────┘   └────────────────────┘
```

Desktop: grid 2 colunas (form 7/12 + sidebar 5/12) com a foto sangrando do topo da coluna direita. Mobile: coluna única; sidebar "Participe agora!" vai abaixo do form; a foto vira faixa de topo ou some.

## Arquivos

**Tokens / fundo**
- `src/index.css` — novos tokens (mantendo as variáveis HSL existentes):
  - `--background` cream `48 35% 96%`
  - `--primary` verde governo `145 70% 28%` / `--primary-glow` `145 60% 38%`
  - `--accent` dourado `45 95% 55%`
  - novos gradientes: `--gradient-organic-green`, `--gradient-organic-gold`, `--gradient-cta`
  - sombras `--shadow-card-float`, `--shadow-accent-pill`
  - utilitários: `.bg-organic-canvas`, `.card-floating`, `.input-pill`, `.chip-gold`
- `src/components/landing/OrganicBackground.tsx` — novo SVG full-bleed com 4 ribbons (2 verdes, 2 amarelas) animadas suavemente (framer-motion, respeita `prefers-reduced-motion`).

**Página**
- `src/pages/Index.tsx` — substituir todo o conteúdo por `<Header/>` (modo transparente) + `<HomeHero/>` + `<Footer/>` minimalista do anexo. Remover `AboutSection`, `MapSection`, `StatsSection`, `SocialEngagementSection`, `SuggestionForm`, `ChatBot`, `FloatingShareButton` da home (arquivos preservados, apenas não montados — continuam disponíveis caso queira em outra rota).

**Componentes novos** em `src/components/landing/home/`
- `HomeHero.tsx` — orquestra grid 2 colunas, fundo orgânico, logo, headline, foto.
- `HeroHeadline.tsx` — "O destino certo, é o futuro decidido por todos os paranaenses" com "destino certo" em dourado e "futuro decidido" em verde sublinhado; chip pill "Plano de Governo Colaborativo"; chip dourado "Sua voz ajuda a decidir o futuro do Paraná".
- `HeroPortrait.tsx` — slot do retrato. Renderiza placeholder elegante (silhueta + label "Foto em breve") até `src/assets/hero-moro.jpg` existir; aceita prop `imageSrc`.
- `OpinionFormCard.tsx` — card flutuante branco, raio 2xl, sombra forte. Campos com ícone à esquerda (input-pill): Nome (User), Telefone/WhatsApp (Phone), Cidade (combobox de `municipios` com MapPin), Sugestão (Textarea com MessageCircle). Mantém integração com `sugestoes_populares` + `analyze-suggestion` (mesma lógica do `SuggestionForm` atual). Validação zod (nome ≤100, telefone ≤20, cidade obrigatória, sugestão 10–2000). Embute `AudioRecorderBlock` e o CTA `Enviar opinião`.
- `AudioRecorderBlock.tsx` — bloco "Enviar opinião por áudio":
  - botão dourado "Gravar áudio" (toggle start/stop com timer mm:ss, anel pulsante quando gravando) usando Web Audio API → WAV 16 kHz mono (per knowledge `ai-speech-to-text`).
  - botão outline "Transcrever áudio" (habilita após gravar) → upload para edge function.
  - área "Transcrição" com texto streaming (SSE deltas) ou placeholder.
  - ao concluir, o texto é anexado/concatenado ao campo "Sugestão" (com label "(via áudio)") e o blob fica em memória para upload junto da sugestão.
- `ParticiparAgoraCard.tsx` — painel verde escuro, headline dourada "Participe agora!", 3 bullets com ícones em círculo dourado (Users, ShieldCheck, Heart), divisor dourado, frase "O futuro do Paraná é construído hoje, com você."
- `HomeFooter.tsx` — faixa final: ícone escudo + "Transparência, diálogo e participação. Esse é o caminho do Paraná que queremos."

**Backend (áudio)**
- `supabase/functions/transcribe-audio/index.ts` — nova edge function:
  - `verify_jwt = false` (formulário público), valida CORS, aceita `multipart/form-data` com `file` (≤ 10 MB, MIME `audio/wav`/`audio/mpeg`/`audio/webm`/`audio/mp4`).
  - encaminha para `https://ai.gateway.lovable.dev/v1/audio/transcriptions` com `model=openai/gpt-4o-mini-transcribe`, `stream=true`, usando `LOVABLE_API_KEY` (já configurada).
  - faz pass-through do corpo SSE para o cliente; trata 402/429/403 com mensagens claras.
- Upload do áudio bruto (opcional): usa bucket público existente `proposta-anexos` em subpasta `sugestoes-audio/<sugestao_id>.wav`. Salva URL em `sugestoes_populares.metadata` (já é jsonb). Sem mudança de schema; políticas atuais permitem `anon` insert.

## Detalhes técnicos

- Tipografia: mantém Montserrat (display) + Inter (body) — já carregados; pesos 800/900 no headline; tracking apertado.
- Responsividade: breakpoints Tailwind `md:` (768) e `lg:` (1024). Grid 2-col só a partir de `lg`. Padding container `px-4 md:px-8 lg:px-12`. Headline `text-4xl md:text-5xl lg:text-6xl`. Mobile esconde os ribbons mais densos (`hidden md:block` em 2 dos 4 SVGs) para preservar legibilidade.
- Acessibilidade: todos os inputs com `<label>` visível ou `aria-label`; botão de gravar com `aria-pressed`; live region `aria-live="polite"` na transcrição; foco visível nos pills.
- Animações: framer-motion `whileInView` fade-up nos cards; ribbons com `animate={{ y: [0, -8, 0] }}` 12s ease-in-out; respeitar `prefers-reduced-motion`.
- Sem texto cor-hard-coded: tudo via tokens (`bg-primary`, `text-accent`, etc.).
- Estado de sucesso: reaproveita o componente de confirmação existente (`SuggestionConfirmationMap`) dentro do mesmo card (substitui form ao enviar), mantendo continuidade visual.

## Fora de escopo

- Foto oficial do Moro (placeholder até você enviar).
- Restauração das seções removidas em outras rotas (ficam no código, mas não montadas em `/`).
- Tradução das seções administrativas (`/admin/*`) — sem alteração.
- Tema dark da nova home (foco em light, como o anexo).

## Validação

- `tsgo` + build automático.
- Teste manual: enviar sugestão de texto puro; gravar 5 s de áudio, transcrever, ver streaming, enviar; checar mobile via viewport 375 e desktop 1440.
- `supabase--curl_edge_functions` em `/transcribe-audio` com um WAV pequeno de fixture para validar SSE.
