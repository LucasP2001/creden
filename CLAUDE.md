# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repository is **pre-code**. There is no `package.json`, no `app/`, no build tooling yet — only:

- [creden.md](creden.md) — the full product spec / generation prompt (the brief for building Creden).
- [.claude/skills/](.claude/skills/) — project skills that encode the product knowledge and conventions.

The first substantial task is typically to scaffold the Next.js project described in [creden.md](creden.md). When that happens, create `package.json` and add real build/lint/test commands to this file (none exist yet — do not invent them).

## Project skills are the source of truth

Before working on any part of Creden, load the relevant skill(s) under [.claude/skills/](.claude/skills/) — they hold the canonical product, design, data, and convention decisions:

- **creden-overview** — what the product is, stack, user profiles, business model, route map. Load for any task.
- **creden-design** — visual identity: palette, typography, logo, tone of voice, base components, check-in feedback states.
- **creden-supabase** — Supabase clients (browser vs server), data model, RLS policies, indexes.
- **creden-conventions** — folder structure, Server vs Client Components, component reuse, error/loading handling.

When concrete values get decided (palette hex, font names, real column names, the final logo), **update the corresponding skill** so it stays the source of truth — don't let CLAUDE.md and the skills drift apart. The design and supabase skills both flag where the documented design is "intended" and may evolve.

## What Creden is

A web platform (Next.js) where event organizers create registration pages, manage attendees, and check people in via QR code on the day of the event. Participants register on a public page, receive a digital ticket with a QR code by email, and present it at the door.

Two user profiles drive almost every architectural decision:

- **Organizador** (organizer) — authenticated. Creates events, manages registrations, scans QR codes with a phone camera. Pays R$99/month.
- **Participante** (participant) — mostly anonymous. Views the public event page, registers, gets a ticket. Free.

Target niche: small/medium courses, workshops, and academic/cultural events in **Brazil**. All UI and microcopy is **pt-BR**. Code identifiers may be English or Portuguese — match what already exists in the file.

## Stack

- **Next.js 14** (App Router)
- **Supabase** — database, auth, storage, realtime
- **Tailwind CSS**
- **Brevo** (REST API via `fetch`, no SDK) — transactional email (the ticket)
- **html5-qrcode** — in-browser QR scanning

## Architecture (intended)

Routes split cleanly by profile — this boundary matters for auth and RLS:

| Route | Profile | Purpose |
|------|---------|---------|
| `/dashboard` | Organizer (auth) | List of events |
| `/eventos/novo` | Organizer (auth) | Create event |
| `/eventos/[id]/inscritos` | Organizer (auth) | Attendee list + CSV export |
| `/eventos/[id]/checkin` | Organizer (auth) | Camera-based check-in |
| `/e/[slug]` | Participant (public) | Public event page + registration |
| `/i/[token]` | Participant (public) | Digital ticket with QR |

Organizer routes require an authenticated session; participant routes (`/e/[slug]`, `/i/[token]`) are reachable anonymously. Keep that distinction visible in data access (server client + RLS) — see the supabase skill.

Code is organized into four layers (detail in **creden-conventions**):

- `app/` — routes. Default to **Server Components**; reach for `'use client'` only where interactivity is required (camera, stateful forms, realtime).
- `components/ui/` — base Button / Input / Badge, reused by screens. Do not recreate these ad-hoc per screen.
- `lib/` — integrations isolated by concern: `supabase.ts` (server + admin clients) / `supabase-browser.ts` (browser client — split out because `supabase.ts` imports `next/headers`, which can't go in a client bundle), `email.ts` (Brevo via REST/fetch), `qr.ts` (token generation + validation). Keep QR/token and email logic out of components.
- `types/index.ts` — central domain types (`Evento`, `Inscricao`, `User`).

## Data & security model (Supabase)

Two tables: **eventos** (owned by an organizer via `user_id`) and **inscricoes** (belongs to an `evento_id`, carries `status` ∈ `inscrito | presente | cancelado`, the ticket `token`, and check-in time). Both have `created_at` / `updated_at` with an `updated_at` trigger; indexes on `eventos.slug`, `eventos.user_id`, `inscricoes.evento_id`, `inscricoes.token`.

RLS is **mandatory** and encodes the two-profile boundary:

1. An organizer sees only their own events (`auth.uid() = eventos.user_id`).
2. Anyone can insert a registration from a public page (anonymous insert into `inscricoes`).
3. Only the event's owner can update registration status (check-in).

Never expose the `service_role` key to the browser. Env vars live in `.env.local` (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `NEXT_PUBLIC_APP_URL`. The `.env.local.example` is versioned — keep only placeholders there, never real keys.

## Design constraints

The product should feel **serious and practical, not over-corporate**. Two hard "don'ts" from the brief:

- No **purple-with-white-gradient** (SaaS cliché).
- No **Inter, Roboto, or Arial** — pick type with its own character and good Portuguese accent support.

Tone of voice differs by audience: objective/management-focused for organizers, warm/clear for participants. Check-in feedback has three fixed states — green "Entrada confirmada — [Nome]", red "QR inválido", yellow "Já entrou às [hora]". See **creden-design**.
