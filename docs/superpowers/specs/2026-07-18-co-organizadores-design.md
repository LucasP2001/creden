# Co-organizadores (multi-organizador por evento) — Design

Data: 2026-07-18

## Problema

Hoje cada evento tem um único dono (`eventos.user_id`). Não há como um organizador
convidar outra pessoa para ajudar a gerir o evento — editar dados, ver inscritos ou
fazer check-in na portaria. Esta feature adiciona **colaboradores** por evento, com
dois papéis, convite por e-mail e revogação pelo dono.

## Escopo (decidido no brainstorming)

- **Dois papéis**: `editor` (mexe em tudo, como o dono, menos apagar/transferir) e
  `checkin` (só a tela de check-in + conferir a lista de inscritos).
- **Convite por e-mail + link**: o dono informa o e-mail e o papel; o sistema envia um
  link `/convite/[token]`. Quem aceita vira colaborador.
- **Convidado sem conta**: o convite fica pendente vinculado ao e-mail. Ao criar conta
  (ou logar) com aquele e-mail, o convite é "reivindicado" e o acesso aparece.
- **Dono revoga** acesso ou cancela convite pendente. Para revogar é preciso listar quem
  tem acesso — a **lista de equipe** entra junto (não dá para revogar o que não se vê).
- **Check-in do colaborador**: validação de papel **na rota** (server-side); o
  service_role continua responsável apenas pela escrita, como já é hoje.

### Fora de escopo (YAGNI)

- Expiração de convite.
- Transferência de posse do evento.
- Papéis além de `editor` e `checkin`.
- Link compartilhável genérico (só convite direcionado por e-mail).

## Dados

Nova migration `009_colaboradores.sql`:

```sql
create table public.colaboradores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  email       text not null,                         -- convidado, sempre lowercase
  user_id     uuid references auth.users(id) on delete cascade, -- null até aceitar
  papel       text not null check (papel in ('editor','checkin')),
  status      text not null default 'pendente' check (status in ('pendente','ativo')),
  token       text not null unique,                  -- do link de convite
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index colaboradores_evento_email_uidx
  on public.colaboradores (evento_id, lower(email));
create index colaboradores_evento_idx  on public.colaboradores (evento_id);
create index colaboradores_user_idx    on public.colaboradores (user_id);
create index colaboradores_token_idx   on public.colaboradores (token);

-- trigger updated_at (mesmo padrão das outras tabelas)
```

## Acesso / RLS

Funções SQL (SECURITY DEFINER) que encapsulam a regra de acesso, para não repetir
subquery em cada policy:

```sql
-- Dono do evento OU colaborador ativo com papel 'editor'.
create function public.pode_editar_evento(ev uuid) returns boolean ...

-- Dono OU qualquer colaborador ativo (editor ou checkin).
create function public.pode_ver_evento(ev uuid) returns boolean ...
```

Policies:

- **eventos**
  - SELECT: `pode_ver_evento(id)`.
  - UPDATE: `pode_editar_evento(id)`.
  - DELETE: só o dono (`auth.uid() = user_id`).
  - INSERT: inalterado (dono cria o próprio).
- **inscricoes**
  - Insert público (inscrição anônima): inalterado.
  - SELECT/UPDATE por organizador: `pode_ver_evento(evento_id)` — cobre dono e
    colaboradores. A distinção editor/checkin para leitura não é necessária (ambos
    podem ver a lista); o que difere é a edição do evento, coberta acima.
- **colaboradores**
  - SELECT: o dono do evento vê todas as linhas do evento; o convidado vê a própria
    linha (`auth.uid() = user_id`).
  - INSERT/UPDATE/DELETE: só o dono do evento (convidar, revogar).

O check-in escreve o status via **service_role** (como hoje). A autorização de quem
pode abrir `/eventos/[id]/checkin` e `/inscritos` é validada na rota (ver abaixo),
não só por RLS — mantém o fluxo atual que já funciona.

## Fluxo de convite

1. **Convidar** — na aba Gerenciamento, seção "Equipe": o dono informa e-mail + papel.
   Server action cria a linha `colaboradores` (`status=pendente`, `token` novo) e
   envia o e-mail (Brevo) com o link `/convite/[token]`.
2. **Aceitar** — `/convite/[token]` (rota pública):
   - Não logado → tela pede login/cadastro. Após autenticar com o e-mail do convite,
     volta ao aceite.
   - Logado com o e-mail do convite → botão "Aceitar": seta `status=ativo` e grava
     `user_id = auth.uid()`.
   - Logado com e-mail diferente → aviso ("este convite é para outro e-mail").
3. **Reivindicação por e-mail** — ao autenticar, um passo server "gruda" convites
   `pendentes` cujo `email` bate com o do usuário, preenchendo `user_id` e mantendo
   `status=pendente`. A ativação acontece **sempre** no aceite explícito da tela
   `/convite/[token]` (nunca automática) — assim a pessoa vê a qual evento/papel está
   entrando antes de virar colaborador.

## Autorização nas rotas (server)

Helper `contexto de acesso do evento` no server: dado `evento_id` + usuário, retorna
`{ ehDono, papel: 'editor'|'checkin'|null }`. Usado por:

- `/eventos/[id]` (resumo) e abas: exige `pode ver` (dono ou colaborador).
- `/eventos/[id]/editar`: exige dono ou `editor`.
- `/eventos/[id]/checkin` e `/inscritos`: exige dono, `editor` ou `checkin`.
- Ações de convidar/revogar: exige **dono**.

## UI

- **Aba Gerenciamento → seção "Equipe"**: lista de colaboradores (nome quando houver
  conta, senão o e-mail; papel; status pendente/ativo), botão **Revogar** por linha,
  e um formulário "Convidar" (e-mail + seletor de papel).
- **Dashboard**: eventos onde o usuário é colaborador (não dono) aparecem com um selo
  "Colaborador" e o papel. Ações limitadas conforme o papel.
- **/convite/[token]**: tela de aceite (nome do evento, papel, botão aceitar) com os
  caminhos de login/e-mail divergente acima.

## E-mail

Novo template de convite em `lib/email.ts` (reusa o transporte Brevo já existente):
assunto "Você foi convidado para organizar {evento}", corpo com o papel e o botão
para `/convite/[token]`.

## Testes

- Unit: `pode_editar_evento` / `pode_ver_evento` (via SQL de teste ou asserts nas
  actions), reivindicação de convite por e-mail, geração/validação de token.
- Regras de papel nas rotas: editor não-dono edita; checkin não edita mas abre
  check-in; revogado perde acesso.
- E-mail de convite montado com link correto (mesma linha dos testes de ingresso, se
  houver).

## Ordem de implementação (resumo, detalhada no plano)

1. Migration `colaboradores` + funções + policies.
2. Types (`Colaborador`, papel) e helper de contexto de acesso no server.
3. Ajuste das guardas de rota (resumo/editar/checkin/inscritos) para usar o helper.
4. Server actions: convidar, aceitar, revogar, reivindicar-por-email.
5. E-mail de convite.
6. UI: seção Equipe, `/convite/[token]`, selo no dashboard.
