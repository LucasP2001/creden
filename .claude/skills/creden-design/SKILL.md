---
name: creden-design
description: Identidade visual e diretrizes de UI do Creden — paleta de cores, tipografia, logo, tom de voz e componentes base. Use ao criar telas, componentes, mockups ou qualquer interface do Creden.
---

# Creden — Identidade visual

O produto precisa passar **seriedade e praticidade** sem ser corporativo demais.
Direção: **confiável e humana** — sóbria para o organizador, calorosa para o participante.

> Fonte de verdade dos valores: [`branding/design-tokens.json`](../../../branding/design-tokens.json).
> Preview renderizado: [`branding/index.html`](../../../branding/index.html). Logos em `branding/logo/`.

## Restrições (o que evitar)

- **NÃO** usar roxo com gradiente branco (clichê de SaaS).
- **NÃO** usar Inter, Roboto ou Arial como tipografia.
- Buscar caráter próprio que funcione bem em **português**.

## Paleta (hex reais)

| Token | Hex | Uso |
|-------|-----|-----|
| Primária (verde-petróleo) | `#0E5C56` | Header, botões primários, links, símbolo do logo |
| Primária hover | `#0B4A45` | Hover/active do primário |
| Primária clara | `#3BA89E` | Primário sobre fundo escuro, detalhes |
| Secundária (verde-grafite) | `#16302E` | Títulos, superfícies escuras, wordmark em fundo claro |
| Destaque (âmbar) | `#F5B14C` | CTA secundário, check do logo, acolhimento |
| Destaque hover | `#E89F32` | Hover do âmbar |
| Fundo (areia) | `#F4F1EA` | Fundo da app (neutro quente, não cinza frio) |
| Superfície | `#FFFFFF` | Cards e inputs |
| Tinta | `#1C1B18` | Texto principal |
| Apagado | `#6B675E` | Texto secundário, labels |
| Linha | `#E4DFD4` | Bordas e divisores |

## Tipografia

- **Display:** **Fraunces** (serif com caráter) — títulos, logo, números grandes. Fallback `Georgia, serif`.
- **Corpo:** **Mona Sans** (sans humanista) — interface, tabelas, formulários. Fallback `'Segoe UI', system-ui, sans-serif`.
- Ambas com acentuação pt-BR completa. Substituem as proibidas (Inter/Roboto/Arial).

## Logo

**Oficial — nome dentro do ticket.** O ticket é o container da marca: a palavra "Creden"
fica dentro, com perfuração tracejada e o check em âmbar no canhoto (ingresso + entrada confirmada).

SVG em `branding/logo/`:

- `creden-ticket-light.svg` — **principal**, fundo claro (ticket verde preenchido, nome em areia).
- `creden-ticket-dark.svg` — fundo escuro (ticket contornado em `#3BA89E`, nome em areia).
- `creden-appicon.svg` — favicon / app icon (C + check no ticket, fundo arredondado verde).

Variante alternativa (nome ao lado do símbolo): `creden-logo-light.svg`, `creden-logo-dark.svg`,
`creden-symbol.svg`. Usar só se houver motivo; o padrão é o "nome dentro do ticket".

## Tom de voz

Fala diferente com organizador (objetivo, gestão) e participante (acolhedor, claro). Microcopy em pt-BR.
Exemplos no preview HTML.

## Componentes base

- Botão primário (verde) / botão de destaque (âmbar) / botão secundário (contorno)
- Input
- Badge de status: **inscrito** (`#0E5C56`) / **presente** (`#1F9D6B`) / **cancelado** (`#8A8377`)

## Estados de feedback do check-in (tela `/eventos/[id]/checkin`)

| Estado | Cor | Mensagem |
|--------|-----|----------|
| Sucesso | Verde | "Entrada confirmada — [Nome]" |
| Inválido | Vermelho | "QR inválido" |
| Repetido | Amarelo | "Já entrou às [hora]" |

> ⚠️ Quando os valores concretos (hex da paleta, nomes das fontes, logo final) forem
> definidos, **atualize esta skill** com os tokens reais para que as telas fiquem consistentes.

Skills relacionadas: `creden-overview`, `creden-conventions`.
