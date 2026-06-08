# Skills do Creden

Esta pasta contém **skills do projeto** — conhecimento e convenções específicas do Creden que qualquer Claude (ou outro agente) deve carregar ao trabalhar neste repositório.

## Como funcionam

Cada subpasta é uma skill com um arquivo `SKILL.md` que tem frontmatter:

```markdown
---
name: nome-da-skill
description: Quando usar esta skill (uma linha)
---

# Conteúdo da skill
```

O Claude Code descobre essas skills automaticamente e as ativa quando a `description` casa com a tarefa atual.

## Skills disponíveis

| Skill | Para quê |
|-------|----------|
| [creden-overview](creden-overview/SKILL.md) | Visão geral do produto, stack, perfis de usuário. Carregar sempre. |
| [creden-design](creden-design/SKILL.md) | Identidade visual: paleta, tipografia, componentes, tom de voz. |
| [creden-supabase](creden-supabase/SKILL.md) | Padrões Supabase: client/server, modelo de dados, RLS. |
| [creden-conventions](creden-conventions/SKILL.md) | Convenções de código: Next.js App Router, estrutura de pastas, TS. |

## Adicionando uma skill nova

1. Crie uma pasta `creden-<nome>/`
2. Adicione `SKILL.md` com o frontmatter acima
3. Registre na tabela deste README
4. Mantenha a `description` precisa — é o que decide quando a skill ativa
