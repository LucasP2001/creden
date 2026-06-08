# Prompt — Geração completa do produto Creden

Cole esse prompt numa nova conversa com o Claude.

---

Você vai me ajudar a criar o produto **Creden** — uma plataforma web de inscrição e check-in para eventos, cursos e workshops. Quero que você gere tudo em sequência: identidade visual, telas principais e estrutura inicial de código.

---

## Contexto do produto

**Nome:** Creden  
**Tagline:** Inscrição e entrada sem complicação  
**O que é:** Plataforma web (Next.js) que permite a organizadores de eventos criar páginas de inscrição, gerenciar participantes e fazer check-in via QR code no dia do evento. O participante recebe um ingresso digital com QR code por e-mail após se inscrever.

**Dois perfis de usuário:**
- **Organizador** — cria eventos, gerencia inscritos, usa a câmera do celular para ler QR codes na entrada
- **Participante** — acessa a página pública do evento, se inscreve, recebe o QR code por e-mail e apresenta na entrada

**Nicho inicial:** Cursos, workshops, eventos acadêmicos e culturais de pequeno e médio porte no Brasil

**Modelo de negócio:** Assinatura mensal para organizadores (R$99/mês). Gratuito para participantes.

**Stack técnica:**
- Next.js 14 (App Router)
- Supabase (banco, auth, storage, realtime)
- Tailwind CSS
- Resend (e-mail transacional)
- Biblioteca `html5-qrcode` para leitura de QR no browser

---

## Etapa 1 — Identidade visual

Crie a identidade visual completa do Creden:

- **Paleta de cores** — defina cor primária, secundária, de destaque e neutras. O produto precisa passar seriedade e praticidade sem ser corporativo demais. Evite roxo com gradiente branco, que é clichê de SaaS.
- **Tipografia** — escolha uma fonte de display (para títulos e logo) e uma fonte de corpo (para interface). Evite Inter, Roboto e Arial. Busque algo com caráter próprio que funcione bem em português.
- **Logo** — crie um logo em SVG para o Creden. Pode ser tipográfico, com símbolo, ou combinado. Deve funcionar em fundo claro e escuro.
- **Tom de voz** — defina como o produto fala com o organizador e com o participante. Exemplos de microcopy: botões, mensagens de confirmação, erros.
- **Componentes base** — botão primário, botão secundário, input, badge de status (inscrito / presente / cancelado)

Entregue tudo como artefato visual interativo ou SVG renderizado.

---

## Etapa 2 — Telas principais

Crie mockups funcionais em HTML/CSS das seguintes telas, usando a identidade visual definida na Etapa 1:

### Lado do organizador

1. **Dashboard** (`/dashboard`)
   - Lista de eventos criados com card para cada um
   - Cada card mostra: nome do evento, data, total de inscritos, % de check-in, botão "Gerenciar"
   - Botão de criar novo evento em destaque

2. **Criar evento** (`/eventos/novo`)
   - Formulário: nome do evento, descrição, data e hora, local, número máximo de vagas, valor (grátis ou pago)
   - Seção para adicionar campos extras ao formulário de inscrição (ex: instituição, CPF, tamanho de camiseta)
   - Preview da URL pública gerada automaticamente

3. **Lista de inscritos** (`/eventos/[id]/inscritos`)
   - Tabela com: nome, e-mail, data de inscrição, status (inscrito / presente), hora do check-in
   - Filtro por status
   - Botão exportar CSV
   - Contador no topo: X inscritos / Y presentes

4. **Tela de check-in** (`/eventos/[id]/checkin`)
   - Câmera ocupando a maior parte da tela (simulada no mockup)
   - Feedback visual grande: verde com "Entrada confirmada — [Nome]" ou vermelho com "QR inválido" ou amarelo com "Já entrou às [hora]"
   - Contador de entradas no topo
   - Botão para busca manual por nome como fallback

### Lado do participante

5. **Página pública do evento** (`/e/[slug]`)
   - Nome e descrição do evento
   - Data, hora e local com ícones
   - Vagas restantes
   - Botão principal "Fazer inscrição"
   - Visual atraente que o organizador vai querer compartilhar

6. **Ingresso digital** (`/i/[token]`)
   - QR code grande e legível no centro
   - Nome do participante e nome do evento
   - Data e local
   - Status: "Válido" ou "Já utilizado"
   - Instrução: "Apresente esta tela na entrada"

Cada tela deve ser um artefato HTML separado, responsivo e fiel à identidade visual.

---

## Etapa 3 — Estrutura inicial de código

Gere a estrutura de pastas e arquivos iniciais do projeto Next.js com App Router:

```
creden/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Landing page
│   ├── dashboard/
│   │   └── page.tsx
│   ├── eventos/
│   │   ├── novo/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── inscritos/
│   │       │   └── page.tsx
│   │       └── checkin/
│   │           └── page.tsx
│   ├── e/
│   │   └── [slug]/
│   │       ├── page.tsx                  # Página pública do evento
│   │       └── inscricao/
│   │           └── page.tsx
│   └── i/
│       └── [token]/
│           └── page.tsx                  # Ingresso digital
├── components/
│   ├── ui/                               # Componentes base (Button, Input, Badge)
│   ├── EventCard.tsx
│   ├── InscritoRow.tsx
│   └── QrReader.tsx
├── lib/
│   ├── supabase.ts                       # Client e server client
│   ├── email.ts                          # Funções Resend
│   └── qr.ts                            # Geração de token e QR code
└── types/
    └── index.ts                          # Tipos: Evento, Inscricao, User
```

Para cada arquivo acima, gere o código inicial funcional com:
- Tipagem TypeScript correta
- Integração com Supabase já configurada
- Comentários indicando onde implementar a lógica principal
- Tratamento básico de erros e loading states

---

## Modelo de dados — Supabase

Gere o SQL de criação das tabelas no Supabase:

```sql
-- Tabela: eventos
-- Tabela: inscricoes
-- Com RLS (Row Level Security) configurado
-- Com índices necessários
-- Com triggers para updated_at automático
```

Inclua também as políticas RLS para garantir que:
- Organizador só vê seus próprios eventos
- Qualquer pessoa pode criar uma inscrição numa página pública
- Somente o organizador do evento pode fazer check-in

---

## Instruções de execução

Ao gerar cada etapa:
1. Entregue a Etapa 1 completa antes de avançar
2. Pergunte se aprovo antes de iniciar a Etapa 2
3. Idem para a Etapa 3
4. Cada tela da Etapa 2 deve ser um artefato separado e funcional
5. O código da Etapa 3 deve ser copiável e funcional desde o início

Seja direto, não repita explicações desnecessárias. Foque em entregar produto de qualidade, com identidade visual forte e código limpo.