# Inscrito manual, popup de detalhe e relatório por sessão

**Data:** 2026-07-19
**Área:** aba Gerenciamento (`/eventos/[id]/inscritos`) e Programação (`/eventos/[id]/sessoes`)

## Objetivo

Três mudanças relacionadas na gestão de inscritos:

1. **Adicionar inscrito manualmente** — o organizador cadastra alguém no balcão, com dados + campos extras, escolhe as sessões dele e o sistema envia o bilhete.
2. **Popup de detalhe do inscrito** — clicar num inscrito abre um modal com tudo dele (dados, campos extras, status, check-in, sessões marcadas) e as ações.
3. **Programação vira só contagem** — a lista de nomes por sessão sai da aba Programação; ela passa a mostrar apenas quantos marcaram cada sessão (`X de Y vagas`). Os nomes agora vivem no detalhe do inscrito (visão por pessoa).

Racional da divisão: **por sessão = número** (planejar sala/material, na Programação); **por pessoa = detalhe do inscrito** (na Gerenciamento). Sem duplicar nomes em dois lugares.

## Perfis / permissões

- **Adicionar inscrito** e **cancelar/reenviar**: `acesso.podeEditar` (dono ou editor).
- **Confirmar/desfazer presença**: `podeCheckin` (dono, editor ou colaborador `checkin`) — já é assim hoje.
- **Ver detalhe/relatório**: `podeVer`.

## 1. Adicionar inscrito manual — modal 2 etapas

### UI

- Botão **"+ Adicionar inscrito"** na barra de ações da aba Gerenciamento (ao lado de "Exportar CSV"), visível só se `podeEditar`.
- Abre `AdicionarInscritoModal` (client):
  - **Etapa 1 — Dados:** input nome, input e-mail, e um campo por item de `evento.campos_extras` que não seja `fixo` (mesma renderização/máscaras do form público `InscricaoForm`). Botão **Continuar** (valida obrigatórios/formatos no cliente).
  - **Etapa 2 — Sessões:** lista as sessões de `evento.dias` (via `todasSessoes`) com checkbox. Pausas (`sem_inscricao`) aparecem informativas, sem checkbox. Mostra lotação por sessão quando `vagas_max != null`. Botões **Voltar** / **Adicionar inscrito**.
  - Se o evento não tem sessões marcáveis, a etapa 2 é pulada (vai direto do "Continuar" pro submit).
- Ao concluir: fecha modal, mostra banner de sucesso, a lista revalida (novo inscrito aparece). Se alguma sessão estava lotada, o banner traz o `aviso` com os títulos rejeitados.

### Backend

Nova server action em `app/eventos/[id]/(gerir)/inscritos/actions.ts`:

```ts
adicionarInscrito(eventoId: string, formData: FormData, sessaoIds: string[]): Promise<AcaoResult & { aviso?: string }>
```

- Guarda `acesso.podeEditar`.
- Reusa a validação do fluxo público (ver refactor abaixo): nome/e-mail presentes, e-mail válido, campos extras obrigatórios, CPF/telefone válidos, **duplicado por e-mail ou CPF** (ignorando cancelados), **`vagas_max`** do evento. Mesmas regras da inscrição pública.
- Gera `token` (`gerarToken`), insere em `inscricoes` com `status: 'inscrito'` e `dados_extras`.
- Grava sessões via `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, dias)` — respeita vaga por sessão; títulos rejeitados viram `aviso`.
- Envia o bilhete com `enviarIngresso` (não bloqueia o sucesso em caso de falha de e-mail; loga).
- `revalidatePath('/eventos/[id]/inscritos')`.

### Refactor — validação compartilhada

Hoje toda a validação (campos extras, CPF, duplicado) vive só em `app/e/[slug]/inscricao/actions.ts::inscrever`. Extrair a parte pura/reutilizável para `lib/inscricao.ts`:

```ts
// Valida os dados de uma inscrição contra o evento. Não faz I/O de escrita.
validarDadosInscricao(evento: Evento, formData: FormData): {
  ok: boolean; erro?: string; nome: string; email: string; dadosExtras: Record<string,string>; cpfDigitos: string; cpfLabel: string|null
}
// Checa duplicado (e-mail/CPF) e vagas contra as inscrições existentes.
checarDuplicadoEVagas(admin, evento, email, cpfLabel, cpfDigitos): Promise<{ ok: boolean; erro?: string }>
```

`inscrever` (público) e `adicionarInscrito` (manual) passam a chamar esses helpers. Comportamento do fluxo público não muda.

## 2. Popup de detalhe do inscrito

### UI

- Clicar na linha (desktop) ou no card (mobile) — fora do botão `⋯` — abre `DetalheInscritoModal`.
- O menu `⋯` continua na linha/card como atalho rápido (decisão do usuário: `⋯` atalho + popup).
- Conteúdo do modal:
  - Nome, e-mail, status (Badge), data de inscrição, hora do check-in (se presente).
  - Campos extras (`dados_extras`) em lista rótulo → valor.
  - **Sessões marcadas** — lista de títulos + horário; vazio mostra "Nenhuma sessão marcada".
  - **Ações** (mesmas do `⋯`, conforme permissão/status): Confirmar presença / Desfazer check-in / Reenviar bilhete / Cancelar inscrição.

### Backend

- As sessões marcadas são carregadas sob demanda ao abrir o modal (marcações podem crescer), via nova action:

```ts
sessoesDoInscrito(eventoId: string, inscricaoId: string): Promise<{ ok: boolean; sessoes?: { id: string; titulo: string; hora_inicio: string }[]; erro?: string }>
```

- Guarda `acesso.podeVer`. Lê `inscricoes_sessoes` da inscrição, cruza com `todasSessoes(evento.dias)` pra resolver título/horário.
- As ações reusam as actions já existentes (`marcarPresenca`, `desfazerPresenca`, `cancelarInscricao`, `reenviarBilhete`).

## 3. Programação — só contagem

Em `app/eventos/[id]/(gerir)/sessoes/page.tsx`:

- **Remove** a lista de nomes (`<ul>` de pessoas) do `SessaoRelatorio`.
- Mantém por sessão: tipo, título, horário e contagem — `X de Y` quando há `vagas_max`, senão `X marcações`.
- Continua carregando as marcações só pra contar (pode reduzir o select a `sessao_id`, sem o join de nome/email).
- Ajusta o texto de topo: de "Quem marcou cada sessão" para algo como "Quantas pessoas marcaram cada sessão. Os nomes estão no detalhe de cada inscrito, na aba Gerenciamento."

## Arquivos

**Novos**
- `lib/inscricao.ts` — validação compartilhada.
- `app/eventos/[id]/(gerir)/inscritos/AdicionarInscritoModal.tsx` — modal 2 etapas.
- `app/eventos/[id]/(gerir)/inscritos/DetalheInscritoModal.tsx` — popup de detalhe.

**Alterados**
- `app/eventos/[id]/(gerir)/inscritos/actions.ts` — `adicionarInscrito`, `sessoesDoInscrito`.
- `app/eventos/[id]/(gerir)/inscritos/page.tsx` — passa `campos_extras` e `dias` do evento pro client; botão "+ Adicionar inscrito".
- `app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx` — abre detalhe ao clicar; monta o modal de adicionar.
- `app/e/[slug]/inscricao/actions.ts` — passa a usar os helpers de `lib/inscricao.ts`.
- `app/eventos/[id]/(gerir)/sessoes/page.tsx` — só contagem.

## Fora de escopo (YAGNI)

- Editar as sessões de um inscrito já existente (só criação escolhe sessões por ora; o detalhe mostra, não edita).
- Importar inscritos em massa (CSV de entrada).

## Testes

- `lib/inscricao.ts` puro: validação de campos extras, CPF, e-mail — casos ok e erro.
- Verificar manualmente: adicionar inscrito com/sem sessões, com sessão lotada (aviso), com e-mail duplicado (bloqueio), sem campos extras obrigatórios (bloqueio); popup abre e lista sessões; Programação mostra só contagem.
