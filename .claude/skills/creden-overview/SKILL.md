---
name: creden-overview
description: Visão geral do produto Creden — o que é, stack técnica, perfis de usuário e modelo de negócio. Carregue ao trabalhar em qualquer parte do Creden para ter o contexto do produto.
---

# Creden — Visão geral

**Tagline:** Inscrição e entrada sem complicação

Plataforma web que permite a organizadores de eventos criar páginas de inscrição,
gerenciar participantes e fazer check-in via QR code no dia do evento. O participante
se inscreve, recebe um ingresso digital com QR code por e-mail e apresenta na entrada.

## Perfis de usuário

- **Organizador** — cria eventos, gerencia inscritos, usa a câmera do celular para ler
  QR codes na entrada.
- **Participante** — acessa a página pública do evento, se inscreve, recebe o QR code
  por e-mail e apresenta na entrada.

## Nicho

Cursos, workshops, eventos acadêmicos e culturais de pequeno e médio porte no Brasil.
Interface e microcopy **em português do Brasil**.

## Modelo de negócio

- Organizadores: assinatura mensal de **R$99/mês**.
- Participantes: **gratuito**.

## Stack técnica

- **Next.js 14** (App Router)
- **Supabase** (banco, auth, storage, realtime) → ver skill `creden-supabase`
- **Tailwind CSS**
- **Resend** (e-mail transacional)
- **html5-qrcode** (leitura de QR no browser)

## Rotas principais

| Rota | Perfil | Tela |
|------|--------|------|
| `/dashboard` | Organizador | Lista de eventos |
| `/eventos/novo` | Organizador | Criar evento |
| `/eventos/[id]/inscritos` | Organizador | Lista de inscritos (+ export CSV) |
| `/eventos/[id]/checkin` | Organizador | Check-in via câmera |
| `/e/[slug]` | Participante | Página pública do evento |
| `/i/[token]` | Participante | Ingresso digital com QR |

Skills relacionadas: `creden-design`, `creden-supabase`, `creden-conventions`.
