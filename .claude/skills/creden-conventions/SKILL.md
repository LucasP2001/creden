---
name: creden-conventions
description: Convenções de código do Creden — estrutura de pastas Next.js App Router, organização de componentes/lib/types, TypeScript e padrões de erro/loading. Use ao criar ou refatorar arquivos do projeto.
---

# Creden — Convenções de código

## Estrutura de pastas

```
creden/
├── app/                     # Rotas (App Router)
│   ├── layout.tsx
│   ├── page.tsx             # Landing
│   ├── dashboard/
│   ├── eventos/novo/
│   ├── eventos/[id]/inscritos/
│   ├── eventos/[id]/checkin/
│   ├── e/[slug]/           # Página pública + /inscricao
│   └── i/[token]/          # Ingresso digital
├── components/
│   ├── ui/                 # Base: Button, Input, Badge
│   ├── EventCard.tsx
│   ├── InscritoRow.tsx
│   └── QrReader.tsx
├── lib/
│   ├── supabase.ts         # ver skill creden-supabase
│   ├── email.ts            # Brevo
│   └── qr.ts               # geração de token + QR
└── types/
    └── index.ts            # Evento, Inscricao, User
```

## Padrões

- **TypeScript** tipado de ponta a ponta. Tipos de domínio centralizados em `types/index.ts`.
- **App Router**: prefira Server Components; só use `'use client'` quando precisar de
  interatividade (câmera, formulários com estado, realtime).
- **Componentes base** ficam em `components/ui/` e são reusados pelas telas — não recriar
  botão/input/badge ad-hoc.
- **Estados**: toda tela que busca dados trata **loading** e **erro** explicitamente.
- **Nomes e microcopy em português** (pt-BR). Código (variáveis/funções) em inglês ou
  português, mas siga o que já existir no arquivo.
- **QR/token**: lógica de geração e validação isolada em `lib/qr.ts`.
- **E-mail**: envio via Brevo (API REST com `fetch`, sem SDK) isolado em `lib/email.ts`.

Skills relacionadas: `creden-overview`, `creden-design`, `creden-supabase`.
