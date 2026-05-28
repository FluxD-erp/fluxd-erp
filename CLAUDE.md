# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FluxD** — ERP financeiro desenvolvido em React + Node.js + SQLite (local) com autenticação e auditoria via Supabase. Contexto: empresa em reestruturação financeira, foco em UX para gestores não-técnicos.

---

## Commands

```bash
# Frontend (porta 5173)
cd client && npm run dev

# Backend (porta 3001)
cd server && npm run dev

# Ambos precisam rodar simultaneamente para o sistema funcionar

# Recriar banco do zero (apaga unicri.db e roda seed)
cd server && node fix-encoding.js   # corrige encoding do plano_contas se necessário
```

O Vite faz proxy de `/api/*` → `http://localhost:3001` (vite.config.js).

---

## Architecture

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts + Lucide + react-hot-toast |
| Backend | Node.js + Express (porta 3001 local / Vercel Serverless Function) |
| Banco | Supabase (PostgreSQL) — todas as tabelas financeiras |
| Auth + RBAC | Supabase Auth + tabela `profiles` (PostgreSQL) |
| Audit Log | Supabase tabela `audit_logs` com triggers PostgreSQL |

### Banco de dados — Supabase (PostgreSQL)

Todas as rotas do servidor usam o client Supabase (`server/src/db/supabase.js`) com a `service_role` key. O arquivo `server/src/db/schema.js` (SQLite/sql.js) é legado e não é mais usado em produção.

### Deploy — Vercel (monorepo)

O projeto é deployado como monorepo no Vercel:
- **Frontend:** `client/` — build com Vite, servido como static
- **Backend:** `server/api/index.js` — Serverless Function que exporta o Express app
- **Rewrites:** `/api/*` → serverless function, `/*` → SPA (`index.html`)

Configuração em `vercel.json` na raiz do repositório.

### Seed

O seed original (SQLite) é legado. Os dados agora vivem no Supabase (migrations em `supabase/migrations/`).

### Rotas do servidor

```
GET/POST   /api/dashboard/*          → routes/dashboard.js
GET/POST   /api/clientes             → routes/entidades.js
GET/POST   /api/fornecedores         → routes/entidades.js
GET        /api/cnpj/:cnpj           → routes/entidades.js (proxy BrasilAPI)
GET/POST   /api/financeiro/*         → routes/financeiro.js
POST       /api/admin/invite-user    → routes/admin.js (requer ADMIN)
GET        /api/admin/users          → routes/admin.js (requer ADMIN)
PATCH      /api/admin/users/:id      → routes/admin.js (requer ADMIN)
```

CNPJ lookup usa `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` — gratuito, sem auth.

### Autenticação (híbrida)

- **Frontend:** `AuthContext` (`src/context/AuthContext.jsx`) gerencia sessão Supabase. Expõe `user`, `profile`, `isAdmin`, `isFinanceiro`, `canWrite`, `signIn`, `signOut`.
- **Rotas financeiras locais (Express):** atualmente **não requerem** JWT — são públicas. O middleware `requireAuth` + `requireRole()` em `server/src/middleware/auth.js` existe e está pronto para ser aplicado progressivamente.
- **Rotas `/api/admin/*`:** requerem JWT Supabase válido + perfil ADMIN.

### RBAC — Perfis

| Perfil | Acesso |
|---|---|
| `ADMIN` | Tudo, incluindo Gestão de Acessos e Logs |
| `FINANCEIRO` | Leitura e gravação de dados financeiros e cadastros |
| `VISUALIZACAO` | Somente leitura (dashboard, relatórios) |

`ProtectedRoute` em `src/components/ProtectedRoute.jsx` aceita prop `requiredRole` opcional.

---

## Design System

### Tokens de cor (Tailwind)

Todos os tokens estão centralizados em `client/tailwind.config.js`. **Nunca usar hex hardcoded** — alterar o token propaga para toda a aplicação.

```js
unicri-orange      → #1A8DB5  (acento principal teal)
unicri-orange-dark → #1279A0  (hover)
unicri-navy        → #1E3A5F  (sidebar, textos primários)
unicri-cream       → #EFF8FC  (fundos sutis)
```

Para Recharts e outras libs que não leem Tailwind, importar de `src/theme.js`:
```js
import { BRAND, CHART_COLORS } from '../theme';
// BRAND.teal, BRAND.navy, CHART_COLORS[...]
```

### Classes globais (index.css)

`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.card`, `.input`, `.label`, `.badge-*` — usar sempre via `@apply`, nunca duplicar.

### Padrão de página

Toda página usa `<PageHeader title="" subtitle="" actions={<button>} />` + `<Modal>` para formulários. Dados carregados via `api.*` de `src/services/api.js`.

---

## Supabase

### Tabelas no PostgreSQL

- `profiles` — espelha `auth.users`, adiciona `perfil` (enum: ADMIN/FINANCEIRO/VISUALIZACAO) e `ativo`
- `audit_logs` — log de auditoria com `user_id`, `table_name`, `record_id`, `action`, `old_value` (JSONB), `new_value` (JSONB)

### Trigger de auditoria

Para ativar auditoria automática em qualquer tabela (após migrar para Supabase):
```sql
SELECT enable_audit('lancamentos');
```

### Log manual (tabelas ainda em SQLite)

```js
import { logAction } from '../lib/auditLog';
await logAction({ tableName: 'contas_pagar', recordId: id, action: 'INSERT', newValue: dados });
```

### Variáveis de ambiente

```
# client/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=

# server env (Vercel dashboard ou .env local)
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://fluxd-erp.vercel.app
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO=
STRIPE_WEBHOOK_SECRET=
```

O servidor usa `dotenv` — `require('dotenv').config()` está na primeira linha de `server/src/index.js`.

---

## Encoding

O banco `unicri.db` foi populado com dados via PowerShell (UTF-16), o que corrompeu acentos no `plano_contas`. O script `server/fix-encoding.js` corrige isso rodando diretamente no sql.js com Node.js (UTF-8). Se aparecerem `?` no lugar de acentos em dados do plano de contas, rodar o script.

---

## Módulos implementados

| Módulo | Rota | Notas |
|---|---|---|
| Dashboard | `/` | KPIs + gráficos Recharts |
| Lançamentos | `/lancamentos` | CRUD completo |
| Contas a Pagar | `/contas-pagar` | Com pagamento parcial |
| Contas a Receber | `/contas-receber` | Com recebimento parcial |
| Fluxo de Caixa | `/fluxo-caixa` | Saldo acumulado diário |
| Programação da Semana | `/programacao-semana` | Grade semanal + export .ics + link Google Agenda |
| Passivos Especiais | `/passivos` | Dívida Ativa, PERT, capital informal |
| Clientes | `/clientes` | Com lookup CNPJ via BrasilAPI |
| Fornecedores | `/fornecedores` | Com lookup CNPJ via BrasilAPI |
| Plano de Contas | `/plano-contas` | 57 contas, estrutura CPC 26 |
| Relatórios | `/relatorios` | DRE simplificado |
| Gestão de Acessos | `/gestao-acessos` | Admin only — RBAC via Supabase |
| Logs de Sistema | `/audit-log` | Admin only — filtros + diff JSON |
| Login | `/login` | Supabase Auth |
