# FluxD ERP — Progresso do Projeto

> Última atualização: 02/05/2026 (sessão 2)
> Stack: React 18 + Vite · Node.js/Express · Supabase (PostgreSQL) · Netlify (front) · Render (back)

---

## Estado atual: Produção ✅

- **Frontend (ERP):** https://fluxd-erp.netlify.app
- **Backend:** https://fluxd-erp.onrender.com
- **Landing page:** implementada, pendente deploy no Netlify

---

## Histórico de entregas (por commit)

| # | Commit | Entrega |
|---|--------|---------|
| 1 | `8476964` | Commit inicial — ERP financeiro completo (CRUD, dashboard, relatórios) |
| 2 | `38b6342` | Migração SQLite → Supabase PostgreSQL |
| 3 | `171eb01` | Fix `_redirects` para SPA routing no Netlify |
| 4 | `e9a6c5b` | CORS multi-origem via `APP_URL` separado por vírgula |
| 5 | `66f5213` | Reenviar convite para usuários pendentes (Gestão de Acessos) |
| 6 | `29ee263` | Multi-tenant: múltiplas empresas por usuário |
| 7 | `a5fd997` | Página de Configurações SaaS unificada + nav refatorado |
| 8 | `849b5a9` | Notification bell (boletos do dia) + user menu dropdown |
| 9 | `8c688a1` | Recorrências, parcelamentos, importação CSV, onboarding guiado, Stripe, dashboard melhorado |
| 10 | `3e01113` | Conciliação bancária via OFX (parser + auto-match + match manual) |
| 11 | `23a082a` | Edição e cancelamento de lançamentos |
| 12 | `fc97db2` | Edição e cancelamento de contas a pagar/receber |
| 13 | `3bb341a` | Fix: POST /lancamentos persiste campos OFX |
| 14 | `8212582` | Exportação de DRE em PDF profissional |
| 15 | `caabb54` | **Fix crítico:** X-Empresa-ID enviava objeto JSON em vez do UUID puro |
| 16 | `99dcb11` | Refresh token, rate limiting, RLS migration, dashboard por período, filtros avançados |
| 17 | `44591a0` | DRE analítico: endpoint + páginas detalhadas por categoria no PDF + seed demo |
| 18 | `7f50cdb` | Importação de NF via XML — duplicatas viram contas a pagar automaticamente |
| 19 | `91e5f24` | Página de Planos simplificada — Free e Pro R$97 |
| 20 | `a6110d1` | Fix: empresaAtiva atualiza com dados frescos após checkout Stripe |
| 21 | `1bad217` | Landing page — hero, features, preços, depoimentos, CTA (landing/src/App.jsx) |

---

## Módulos implementados

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | ✅ KPIs reais, seletor mês/ano, tendências, saldo em caixa, meta mensal, onboarding |
| Lançamentos | `/lancamentos` | ✅ CRUD completo + importação CSV + filtros por conta/cliente/fornecedor |
| Contas a Pagar | `/contas-pagar` | ✅ Simples/Parcelado/Recorrente + Importação NF via XML |
| Contas a Receber | `/contas-receber` | ✅ Simples/Parcelado/Recorrente + edição/cancelamento |
| Fluxo de Caixa | `/fluxo-caixa` | ✅ Saldo acumulado diário |
| Programação da Semana | `/programacao-semana` | ✅ Grade semanal + export .ics |
| Passivos Especiais | `/passivos` | ✅ Dívida Ativa, PERT, capital informal |
| Clientes | `/clientes` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Fornecedores | `/fornecedores` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Plano de Contas | `/plano-contas` | ✅ 57 contas, estrutura CPC 26 |
| Relatórios / DRE | `/relatorios` | ✅ DRE + PDF profissional + páginas analíticas por categoria |
| Conciliação Bancária | `/conciliacao` | ✅ OFX parser + auto-match + match manual |
| Planos / Billing | `/planos` | ✅ Free e Pro R$97 · Stripe Checkout testado e funcional |
| Configurações | `/configuracoes` | ✅ Empresa, usuários (RBAC), logs de auditoria |
| Onboarding | (componente) | ✅ Checklist de 5 etapas, persistido por empresa |
| Landing page | `/landing` | ✅ Implementada · ⚠️ Pendente deploy no Netlify |

---

## Stripe — Estado atual

- ✅ Chaves configuradas no Render (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`)
- ✅ Produto "FluxD Pro" — `price_1TSc661WxeziN2F5XUbiEWgx`
- ✅ Webhook configurado para `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- ✅ Checkout testado com cartão de teste 4242 — redirecionamento e banner de sucesso funcionando
- ✅ `empresaAtiva` atualiza plano com dados frescos ao voltar do Stripe

---

## Precificação atual

| Plano | Preço | Empresas | Usuários |
|-------|-------|----------|----------|
| Free | R$ 0 | 1 | 2 |
| Pro | R$ 97/mês | até 3 | Ilimitados |

---

## Decisões técnicas tomadas

### Banco de dados
- **Migração SQLite → Supabase PostgreSQL** (commit `38b6342`): toda persistência em Supabase.
- **Soft-delete** em lançamentos/contas: `status = 'CANCELADO'` em vez de `DELETE`.

### Multi-tenant
- Todas as queries filtradas por `empresa_id`.
- `X-Empresa-ID` header enviado em todas as requisições autenticadas.
- `empresaAtiva` sempre atualizado com dados frescos do servidor a cada `fetchEmpresas()`.

### Autenticação
- Supabase Auth (JWT) para todas as rotas protegidas.
- RBAC via tabela `profiles`: `ADMIN` / `FINANCEIRO` / `VISUALIZACAO`.
- Refresh token: `onAuthStateChange` redireciona para `/login` em `SIGNED_OUT`.

### Segurança
- Rate limiting: `express-rate-limit@7.5.0` — 300 req/15min geral, 20 req/15min em `/api/admin/invite-user`.
- RLS Supabase: migration `supabase/migrations/08_rls.sql` criada. **Pendente aplicar no SQL Editor.**

### Stripe / Billing
- Graceful degradation: servidor inicia sem `STRIPE_SECRET_KEY`, retorna 503 nos endpoints de billing.
- Webhook com `express.raw()` montado antes do `express.json()` (ordem crítica no `index.js`).
- Planos no servidor: `PLANOS` object em `billing.js` com `essencial`, `pro`, `multi` (essencial e multi sem price IDs reais ainda).

### Infraestrutura
- **Frontend ERP:** Netlify com `_redirects` para SPA routing.
- **Backend:** Render (Node.js) — plano gratuito hiberna após inatividade.
- **Landing:** pasta `/landing` no repo, build com Vite + Tailwind. Pendente site separado no Netlify.
- **CORS:** lista de origens via `APP_URL` (separado por vírgula) + `localhost:5173`.

---

## Migrações Supabase aplicadas

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `00_profiles.sql` | Tabela `profiles` + RBAC | ✅ |
| `01_audit_logs.sql` | Tabela `audit_logs` + trigger | ✅ |
| `02_financial_tables.sql` | `lancamentos`, `contas_pagar`, `contas_receber`, `plano_contas`, `clientes`, `fornecedores` | ✅ |
| `03_seed.sql` | Dados iniciais do plano de contas | ✅ |
| `04_empresas.sql` | Tabela `empresas` + multi-tenant | ✅ |
| `05_recorrencias.sql` | Colunas de recorrência/parcelamento | ✅ |
| `06_billing.sql` | Colunas Stripe (`plano`, `stripe_customer_id`, `plano_expira_em`) | ✅ |
| `07_conciliacao.sql` | Colunas OFX (`conciliado`, `ofx_fitid`, `ofx_memo`) | ✅ |
| `08_rls.sql` | RLS multi-tenant em todas as tabelas financeiras | ⚠️ Criada, pendente aplicar |

---

## Variáveis de ambiente necessárias

```bash
# client/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=https://fluxd-erp.onrender.com

# server/.env (Render)
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://fluxd-erp.netlify.app
STRIPE_SECRET_KEY=
STRIPE_PRICE_PRO=price_1TSc661WxeziN2F5XUbiEWgx
STRIPE_WEBHOOK_SECRET=
```

---

## Próximos passos

### Prioritários
- [ ] **Deploy da landing page** — criar novo site no Netlify apontando para `landing/` (base dir: `landing`, build: `npm run build`, publish: `landing/dist`)
- [ ] **Aplicar migration RLS** — executar `supabase/migrations/08_rls.sql` no SQL Editor do Supabase

### Produto
- [ ] **Logo no PDF** — cabeçalho do DRE com logo da empresa + FluxD
- [ ] **Relatório de Fluxo de Caixa em PDF** — mesmo padrão visual do DRE
- [ ] **Notificações por e-mail** — boletos vencendo
- [ ] **Importação CSV de clientes/fornecedores**
- [ ] **Paginação em Lançamentos** — hoje limitado a 200 registros

### Técnico
- [ ] **Upgrade Render** — plano gratuito hiberna; avaliar plano pago
- [ ] **Testes automatizados** — endpoints críticos
