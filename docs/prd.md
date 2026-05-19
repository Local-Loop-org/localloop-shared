# PRD — LocalLoop MVP v1.0

> Proximity-Based Group Chat  
> Plataforma: React Native | Backend: NestJS | Banco: PostgreSQL + PostGIS

---

## 1. Visão Geral

### 1.1 Proposta de Valor

LocalLoop é um aplicativo mobile de mensagens baseado em proximidade geográfica. Usuários criam e participam de **grupos temáticos ancorados em localizações físicas** — estabelecimentos, bairros, condomínios ou eventos — conectando pessoas que compartilham o mesmo espaço físico **sem expor sua localização exata**.

### 1.2 Decisões de Design Centrais

| Decisão | Detalhe |
|---------|---------|
| Unidade de interação | Grupo (não usuário individual) |
| Privacidade de localização | Coordenadas nunca expostas; apenas labels qualitativos |
| Geohash | Precisão 6 (~1.2km²) como célula base |
| Atualização de posição | Lazy: apenas se mover >300m ou abrir o app |
| DMs | Flag de 3 níveis: `nobody` / `members` / `everyone` |
| Grupos | Abertos ou com aprovação obrigatória (critério do criador) |

### 1.3 Personas Primárias

| Persona | Contexto | Caso de Uso |
|---------|----------|-------------|
| Morador do Bairro | Residente urbano | Avisos, achados e perdidos, eventos locais |
| Frequentador de Bar | Usuário em estabelecimento | Socializar com presentes no mesmo local |
| Condômino | Membro de condomínio | Comunicados e avisos do condomínio |
| Visitante de Feira | Usuário em evento temporário | Dicas, barganhas, encontros |

---

## 2. Fases de Desenvolvimento

| Fase | Entregáveis | Duração |
|------|------------|---------|
| 1 — Fundação | Monorepo, banco, migrations, Auth, geo-utils | 2 semanas |
| 2 — Grupos | CRUD, descoberta por geohash, ingresso, cache Redis | 3 semanas |
| 3 — Chat | WebSocket, histórico persistente, upload de mídia | 3 semanas |
| 4 — Mobile | Todas as screens, navegação, localização lazy | 4 semanas |
| 5 — DM + Push | Mensagens diretas, push notifications | 2 semanas |
| 6 — Polimento | Moderação, LGPD, rate limiting, E2E, CI/CD | 2 semanas |

**Total estimado:** 16 semanas (dev solo avançado)

---

## 3. Tipos de Âncora de Grupo

| Tipo | Exemplo | Raio Sugerido |
|------|---------|---------------|
| `establishment` | "Galera do Bar do Zé" | ~100m |
| `neighborhood` | "Pessoal do Batel" | ~2km |
| `condo` | "Edifício Aurora" | Endereço exato |
| `event` | "Feira da Lapa — sábado" | ~500m |
| `city` | "Curitiba Geral" | Cidade inteira |

---

## 4. Regras de Negócio Críticas

### Privacidade Geográfica
- O servidor **nunca** retorna `lat/lng` de usuários
- O geohash do usuário **nunca** é exposto na API pública
- A distância exata em metros é calculada server-side (haversine entre as
  coordenadas do usuário e do grupo) e formatada no cliente como `<n>M` /
  `<n>Km`. As coordenadas brutas do grupo nunca são retornadas.
- **Distância usuário-a-usuário nunca é calculada nem exposta.** A distância só
  faz sentido em relação ao âncora do grupo (um ponto público). Recursos como
  "distância do remetente da mensagem" estão explicitamente fora de escopo
  para evitar triangulação de posição.

### Controle de DMs

O destinatário controla quem pode enviar DMs para ele com `dm_permission` +
uma lista de exceções por pessoa. Toda DM resolve para uma de duas saídas:
**entrega direta** na thread ou **solicitação pendente** que o destinatário
pode aceitar depois. Não existe recusa silenciosa nem erro 403 por política
— o envio bloqueado vira uma solicitação.

```
Avaliado nessa ordem contra o destinatário (B), para um envio de A → B:

  exceção(B, A) existe                          → entrega direta
  B.dm_permission = 'everyone'                  → entrega direta
  B.dm_permission = 'members' e grupo em comum  → entrega direta
  B.dm_permission = 'members' e sem grupo       → solicitação
  B.dm_permission = 'nobody'                    → solicitação
```

`nobody` significa "ninguém EXCETO exceções" — é o piso de privacidade, não
um bloqueio absoluto. Bloqueio por pessoa (block) é item de Fase 5.

**Lista de exceções (`dm_permission_exceptions`).** Uma exceção `(B, A)`
significa "B autoriza A a enviar DMs para B". Exceções são unidirecionais e
preenchidas por três caminhos:

  - **Implícito**: quando A consegue entregar uma mensagem direta para B, o
    sistema grava `exceção(A, B)` — A está sinalizando que aceita a resposta
    de B. Não dispara quando o envio vira solicitação.
  - **Explícito**: ao aceitar uma solicitação pendente, B grava
    `exceção(B, A)` (e o conteúdo pendente vira uma mensagem real).
  - **Manual**: a tela de perfil → seção de permissões permite adicionar ou
    remover exceções a qualquer momento.

**Remover uma exceção** apenas bloqueia envios futuros daquele contato —
não esconde o histórico já entregue.

**Leitura de thread existente:** uma vez que ao menos uma mensagem foi
entregue, qualquer um dos dois participantes pode ler o histórico completo
(`GET /dm/:userId` não faz checagem de política).

Para a especificação completa do roteamento, lifecycle de exceções, eventos
WebSocket e gaps conhecidos no código, ver `architecture.md → "Direct
messages (Phase 4)"` e ADR-006.

### Ingresso em Grupos
```
privacy = 'open'              → entra imediatamente
privacy = 'approval_required' → cria GroupJoinRequest (status: pending)
```

---

## 5. Glossário

| Termo | Definição |
|-------|-----------|
| Âncora | Local físico de referência de um grupo |
| Célula Vizinha | Uma das 8 células geohash que fazem fronteira com a atual |
| Owner | Criador do grupo — permissões totais |
| Moderador | Promovido pelo owner — pode remover mensagens e membros |
| Presigned URL | URL temporária para upload direto ao storage |
