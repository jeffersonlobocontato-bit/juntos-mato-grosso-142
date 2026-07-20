## Objetivo
Mover o contador ao vivo para **dentro da primeira dobra**, logo abaixo da foto do Sergio Moro (coluna direita do hero), para que o número apareça já no primeiro impacto visual e estimule mais participação.

## Layout atual
```text
[ Logo + Headline        ] [ Foto Sergio Moro ]
[ Formulário de opinião  ] [ Participe Agora  ]
──────────── fim da primeira dobra ────────────
[         Contador ao vivo (isolado)          ]
[                   Rodapé                    ]
```

## Layout proposto
```text
[ Logo + Headline        ] [ Foto Sergio Moro ]
                           [ Contador ao vivo ]  ← primeira dobra
[ Formulário de opinião  ] [ Participe Agora  ]
[                   Rodapé                    ]
```

No mobile (coluna única), a ordem natural fica: Logo → Headline → Foto → **Contador** → Formulário → Participe Agora → Rodapé — o contador continua na primeira dobra, logo após a foto.

## Ajustes técnicos
- `src/components/landing/home/HomeHero.tsx`: renderizar `<LiveCounterCard embedded />` na coluna direita, logo após `<HeroPortrait />`, com `mt-6`.
- `src/pages/Index.tsx`: remover a renderização do `LiveCounterCard` entre `HomeHero` e `HomeFooter`.
- `src/components/landing/home/LiveCounterCard.tsx`: aceitar prop opcional `embedded`. Quando `true`, remover o wrapper `<section container mx-auto ...>` (o hero já provê o container) e reduzir padding interno para caber bem ao lado da foto (por ex. `p-6 md:p-7`, número `text-4xl md:text-5xl`). Sem `embedded`, mantém o visual atual como fallback.
- Preservar animação, contagem real via RPC `get_sugestoes_formulario_count` e o base fake de 3.852.

## Validação
- Verificar visualmente em desktop (foto + contador empilhados à direita, headline + logo à esquerda, sem overflow) e mobile (contador logo após a foto, antes do formulário).
- Confirmar que o contador continua atualizando (RPC + polling de 30s).
