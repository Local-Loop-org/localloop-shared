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
- Labels qualitativos são gerados server-side:
  - `"Mesmo bairro"` → prefixos do geohash são iguais
  - `"Região próxima"` → célula vizinha
  - `"Na cidade"` → mesma cidade

### Controle de DMs
```
dm_permission = 'nobody'   → rejeita com 403
dm_permission = 'members'  → aceita apenas se há grupo em comum
dm_permission = 'everyone' → aceita de qualquer usuário autenticado
```

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
