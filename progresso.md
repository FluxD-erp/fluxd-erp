# FluxD ERP — Progresso do Projeto

> Última atualização: 02/05/2026  
> Stack: React 18 + Vite · Node.js/Express · Supabase (PostgreSQL) · Netlify (front) · Render (back)

---

## Estado atual: Produção ✅

O sistema está **deployado e funcional** em:
- **Frontend:** https://fluxd-erp.netlify.app
- **Backend:** https://fluxd-erp.onrender.com

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

---

## Módulos implementados

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | ✅ KPIs reais, seletor mês/ano, tendências, saldo em caixa, meta mensal, onboarding |
| Lançamentos | `/lancamentos` | ✅ CRUD completo + importação CSV + filtros por conta/cliente/fornecedor |
| Contas a Pagar | `/contas-pagar` | ✅ Simples/Parcelado/Recorrente + **Importação NF via XML** |
| Contas a Receber | `/contas-receber` | ✅ Simples/Parcelado/Recorrente + edição/cancelamento |
| Fluxo de Caixa | `/fluxo-caixa` | ✅ Saldo acumulado diário |
| Programação da Semana | `/programacao-semana` | ✅ Grade semanal + export .ics |
| Passivos Especiais | `/passivos` | ✅ Dívida Ativa, PERT, capital informal |
| Clientes | `/clientes` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Fornecedores | `/fornecedores` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Plano de Contas | `/plano-contas` | ✅ 57 contas, estrutura CPC 26 |
| Relatórios / DRE | `/relatorios` | ✅ DRE + PDF profissional + páginas analíticas por categoria |
| Conciliação Bancária | `/conciliacao` | ✅ OFX parser + auto-match + match manual |
| Planos / Billing | `/planos` | ⚠️ Stripe configurado (chaves no Render), página de planos precisa revisão |
| Configurações | `/configuracoes` | ✅ Empresa, usuários (RBAC), logs de auditoria |
| Onboarding | (componente) | ✅ Checklist de 5 etapas |

---

## Stripe — Estado atual

- ✅ Chaves configuradas no Render (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`)
- ✅ Produto "FluxD Pro" criado no Stripe (price_1TSc661WxeziN2F5XUbiEWgx)
- ✅ Webhook configurado para `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- ⚠️ Página `/planos` precisa ser atualizada com nova precificação (FREE / Essencial R$47 / Pro R$97 / Multi R$197)
- ⚠️ Botão "Assinar" não está redirecionando — investigar na próxima sessão

---

## Landing Page — Estado atual

- ✅ Estrutura do projeto criada em `/landing` (Vite + React + Tailwind)
- ✅ Dependências instaladas
- ⚠️ Componente App.jsx ainda não implementado — pendente para próxima sessão
- ⚠️ Aguardando registro do domínio `fluxd.com.br`

---

## Precificação definida

| Plano | Preço | Empresas | Para quem |
|-------|-------|----------|-----------|
| Free | R$ 0 | 1 | Testar |
| Essencial | R$ 47/mês | 1 | Autônomo, MEI |
| Pro | R$ 97/mês | 3 | PME, varejo |
| Multi | R$ 197/mês | Ilimitado | Grupos, contadores |

---

## Próximos passos (próxima sessão)

### Prioritários
- [ ] **Corrigir página de Planos** — atualizar com 4 planos (Free/Essencial/Pro/Multi) e corrigir botão de checkout
- [ ] **Debugar botão Assinar** — verificar por que não redireciona para o Stripe
- [ ] **Implementar landing page** — App.jsx com hero, features, preços, CTA, depoimentos
- [ ] **Aplicar migration RLS** — executar `08_rls.sql` no SQL Editor do Supabase

### Produto
- [ ] **Logo no PDF** — cabeçalho do DRE com logo da empresa + FluxD
- [ ] **Relatório de Fluxo de Caixa em PDF**
- [ ] **Notificações por e-mail** — boletos vencendo
- [ ] **Importação CSV de clientes/fornecedores**
- [ ] **Paginação em Lançamentos** — hoje limitado a 200 registros

### Técnico
- [ ] **Upgrade Render** — plano gratuito hiberna; avaliar plano pago
- [ ] **Testes automatizados** — endpoints críticos


---

## Estado atual: Produção ✅

O sistema está **deployado e funcional** em:
- **Frontend:** https://fluxd-erp.netlify.app
- **Backend:** https://fluxd-erp.onrender.com

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
| 13 | `3bb341a` | Fix: POST /lancamentos persiste campos OFX (conciliado, ofx_fitid, ofx_memo) |
| 14 | `8212582` | Exportação de DRE em PDF profissional (jsPDF + autoTable) |
| 15 | `caabb54` | **Fix crítico:** `X-Empresa-ID` enviava objeto JSON em vez do UUID puro |
| 16 | `99dcb11` | Refresh token, rate limiting, RLS migration, dashboard por período, filtros avançados em lançamentos |
| 17 | `44591a0` | DRE analítico: endpoint + páginas detalhadas por categoria no PDF + seed de dados demo |

---

## Módulos implementados

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | ✅ KPIs reais, seletor mês/ano, tendências vs mês anterior, saldo em caixa, meta mensal, onboarding |
| Lançamentos | `/lancamentos` | ✅ CRUD completo + importação CSV + edição/cancelamento + filtros por conta/cliente/fornecedor |
| Contas a Pagar | `/contas-pagar` | ✅ Simples / Parcelado / Recorrente + edição/cancelamento |
| Contas a Receber | `/contas-receber` | ✅ Simples / Parcelado / Recorrente + edição/cancelamento |
| Fluxo de Caixa | `/fluxo-caixa` | ✅ Saldo acumulado diário |
| Programação da Semana | `/programacao-semana` | ✅ Grade semanal + export .ics + link Google Agenda |
| Passivos Especiais | `/passivos` | ✅ Dívida Ativa, PERT, capital informal |
| Clientes | `/clientes` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Fornecedores | `/fornecedores` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Plano de Contas | `/plano-contas` | ✅ 57 contas, estrutura CPC 26 |
| Relatórios / DRE | `/relatorios` | ✅ DRE + PDF profissional + **páginas analíticas por categoria** |
| Conciliação Bancária | `/conciliacao` | ✅ OFX parser + auto-match + match manual + criar lançamento |
| Planos / Billing | `/planos` | ✅ Stripe Checkout + Billing Portal + Webhooks |
| Configurações | `/configuracoes` | ✅ Empresa, usuários (RBAC), logs de auditoria |
| Onboarding | (componente) | ✅ Checklist de 5 etapas, persistido por empresa |

---

## Decisões técnicas tomadas

### Banco de dados
- **Migração SQLite → Supabase PostgreSQL** (commit `38b6342`): eliminada dependência de `sql.js` WebAssembly no servidor; toda persistência agora em Supabase.
- **Soft-delete** em lançamentos/contas: `status = 'CANCELADO'` em vez de `DELETE`, preservando histórico e auditoria.

### Multi-tenant
- Todas as queries filtradas por `empresa_id`.
- `X-Empresa-ID` header enviado em todas as requisições autenticadas.
- **Bug corrigido (commit `caabb54`):** `localStorage` armazenava o objeto completo da empresa; `api.js` agora extrai apenas o `id` via `JSON.parse`.

### Autenticação
- Supabase Auth (JWT) para todas as rotas protegidas.
- RBAC via tabela `profiles`: `ADMIN` / `FINANCEIRO` / `VISUALIZACAO`.
- Rotas `/api/admin/*` exigem JWT + perfil ADMIN.
- **Refresh token:** `onAuthStateChange` redireciona para `/login` em `SIGNED_OUT`; respostas `401` da API também redirecionam.

### Segurança
- **Rate limiting:** `express-rate-limit@7.5.0` — 300 req/15min geral, 20 req/15min em `/api/admin/invite-user`.
- **RLS Supabase:** migration `supabase/migrations/08_rls.sql` com policies multi-tenant para todas as tabelas financeiras + profiles. **Pendente aplicar no SQL Editor do Supabase.**

### Recorrências e parcelamentos
- Geração em bulk no POST (helper `gerarParcelas()`).
- Recorrentes: próxima ocorrência gerada automaticamente ao marcar como pago.
- Agrupadas por `grupo_id` (UUID) para rastreabilidade.

### Conciliação OFX
- Parser próprio (sem biblioteca externa): suporta SGML e XML, encoding ISO-8859-1.
- Auto-match por: tipo + valor (±R$0,02) + data (±2 dias) + score por descrição.
- Campos `conciliado`, `ofx_fitid`, `ofx_memo` nas tabelas de lançamentos.

### Exportação PDF (DRE)
- **100% programático** com `jsPDF` + `jsPDF-AutoTable` (sem html2canvas).
- Layout: cabeçalho navy/teal com branding, 3 KPI cards, tabela estruturada com % da receita, indicador de margem + gráfico de barras vetorial, rodapé com timestamp.
- **Páginas analíticas opcionais:** checkbox "Incluir detalhamento analítico" gera uma página por categoria do plano de contas com todos os lançamentos do período.
- **Pendente:** espaço no cabeçalho para logo da empresa + logo FluxD configurável por empresa.

### Stripe / Billing
- Graceful degradation: servidor inicia sem `STRIPE_SECRET_KEY`, retorna 503 nos endpoints de billing em vez de crashar.
- Webhook com `express.raw()` montado **antes** do `express.json()` (ordem crítica no `index.js`).
- Planos: `FREE` e `PRO` (R$97/mês). Campo `plano` na tabela `empresas`.

### Infraestrutura
- **Frontend:** Netlify com `_redirects` para SPA routing.
- **Backend:** Render (Node.js) — plano gratuito hiberna após inatividade.
- **CORS:** lista de origens via `APP_URL` (separado por vírgula) + `localhost:5173`.

### Dados de demonstração
- Script `server/seed-demo.js` popula empresa demo com 6 clientes, 7 fornecedores, 8 contas contábeis, 80 lançamentos (6 meses), 11 contas a pagar e 9 contas a receber.
- Uso: `$env:SEED_EMPRESA_ID="<uuid>"; node -r dotenv/config seed-demo.js`

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

# server/.env
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://fluxd-erp.netlify.app
STRIPE_SECRET_KEY=          # opcional — billing desativado se ausente
STRIPE_PRICE_PRO=           # price_id do plano Pro no Stripe
STRIPE_WEBHOOK_SECRET=      # opcional — webhook sem verificação de assinatura se ausente
```

---

## Próximos passos

### Pendências críticas
- [ ] **Aplicar migration RLS** — executar `supabase/migrations/08_rls.sql` no SQL Editor do Supabase para ativar isolamento multi-tenant no banco
- [ ] **Smoke test completo em produção** — validar todos os módulos no ambiente Netlify + Render com os dados demo
- [ ] **Upgrade Render** — plano gratuito hiberna após inatividade; avaliar plano pago ou warm-up automático via cron

### Produto
- [ ] **Logo no PDF** — espaço no cabeçalho do DRE para logo da empresa + logo FluxD, configurável nas Configurações
- [ ] **Relatório de Fluxo de Caixa em PDF** — mesmo padrão visual do DRE (reaproveitar `drePdf.js`)
- [ ] **Notificações por e-mail** — boletos vencendo (hoje só aparece no sino)
- [ ] **Importação CSV de clientes/fornecedores** — mesmo padrão da importação de lançamentos

### Técnico
- [ ] **Testes automatizados** — testes de integração nos endpoints críticos (lançamentos, contas a pagar/receber, DRE)
- [ ] **Paginação em Lançamentos** — hoje limitado a 200 registros; implementar paginação ou scroll infinito


---

## Estado atual: Produção ✅

O sistema está **deployado e funcional** em:
- **Frontend:** https://fluxd-erp.netlify.app
- **Backend:** https://fluxd-erp.onrender.com

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
| 13 | `3bb341a` | Fix: POST /lancamentos persiste campos OFX (conciliado, ofx_fitid, ofx_memo) |
| 14 | `8212582` | Exportação de DRE em PDF profissional (jsPDF + autoTable) |
| 15 | `caabb54` | **Fix crítico:** `X-Empresa-ID` enviava objeto JSON em vez do UUID puro |
| 16 | (pendente) | Refresh token: redirect para /login em SIGNED_OUT e 401 |
| 17 | (pendente) | Rate limiting: 300 req/15min geral, 20 req/15min em invite-user |
| 18 | (pendente) | RLS Supabase: migration `08_rls.sql` — isolamento multi-tenant no banco |
| 19 | (pendente) | Dashboard por período: seletor mês/ano + KPIs e distribuição filtrados |
| 20 | (pendente) | Filtros avançados em Lançamentos: conta contábil, cliente, fornecedor |

---

## Módulos implementados

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/` | ✅ KPIs reais, tendências vs mês anterior, saldo em caixa, meta mensal, onboarding |
| Lançamentos | `/lancamentos` | ✅ CRUD completo + importação CSV + edição/cancelamento |
| Contas a Pagar | `/contas-pagar` | ✅ Simples / Parcelado / Recorrente + edição/cancelamento |
| Contas a Receber | `/contas-receber` | ✅ Simples / Parcelado / Recorrente + edição/cancelamento |
| Fluxo de Caixa | `/fluxo-caixa` | ✅ Saldo acumulado diário |
| Programação da Semana | `/programacao-semana` | ✅ Grade semanal + export .ics + link Google Agenda |
| Passivos Especiais | `/passivos` | ✅ Dívida Ativa, PERT, capital informal |
| Clientes | `/clientes` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Fornecedores | `/fornecedores` | ✅ CRUD + lookup CNPJ via BrasilAPI |
| Plano de Contas | `/plano-contas` | ✅ 57 contas, estrutura CPC 26 |
| Relatórios / DRE | `/relatorios` | ✅ DRE + **exportação PDF profissional** |
| Conciliação Bancária | `/conciliacao` | ✅ OFX parser + auto-match + match manual + criar lançamento |
| Planos / Billing | `/planos` | ✅ Stripe Checkout + Billing Portal + Webhooks |
| Configurações | `/configuracoes` | ✅ Empresa, usuários (RBAC), logs de auditoria |
| Onboarding | (componente) | ✅ Checklist de 5 etapas, persistido por empresa |

---

## Decisões técnicas tomadas

### Banco de dados
- **Migração SQLite → Supabase PostgreSQL** (commit `38b6342`): eliminada dependência de `sql.js` WebAssembly no servidor; toda persistência agora em Supabase.
- **Soft-delete** em lançamentos/contas: `status = 'CANCELADO'` em vez de `DELETE`, preservando histórico e auditoria.

### Multi-tenant
- Todas as queries filtradas por `empresa_id`.
- `X-Empresa-ID` header enviado em todas as requisições autenticadas.
- **Bug corrigido (commit `caabb54`):** `localStorage` armazenava o objeto completo da empresa; `api.js` agora extrai apenas o `id` via `JSON.parse`.

### Autenticação
- Supabase Auth (JWT) para todas as rotas protegidas.
- RBAC via tabela `profiles`: `ADMIN` / `FINANCEIRO` / `VISUALIZACAO`.
- Rotas `/api/admin/*` exigem JWT + perfil ADMIN.

### Recorrências e parcelamentos
- Geração em bulk no POST (helper `gerarParcelas()`).
- Recorrentes: próxima ocorrência gerada automaticamente ao marcar como pago.
- Agrupadas por `grupo_id` (UUID) para rastreabilidade.

### Conciliação OFX
- Parser próprio (sem biblioteca externa): suporta SGML e XML, encoding ISO-8859-1.
- Auto-match por: tipo + valor (±R$0,02) + data (±2 dias) + score por descrição.
- Campos `conciliado`, `ofx_fitid`, `ofx_memo` nas tabelas de lançamentos.

### Exportação PDF (DRE)
- **100% programático** com `jsPDF` + `jsPDF-AutoTable` (sem html2canvas).
- Resultado: texto nítido, arquivo leve, sem dependência de renderização DOM.
- Layout: cabeçalho navy/teal com branding, 3 KPI cards, tabela estruturada com % da receita, indicador de margem + gráfico de barras vetorial, rodapé com timestamp.

### Stripe / Billing
- Graceful degradation: servidor inicia sem `STRIPE_SECRET_KEY`, retorna 503 nos endpoints de billing em vez de crashar.
- Webhook com `express.raw()` montado **antes** do `express.json()` (ordem crítica no `index.js`).
- Planos: `FREE` e `PRO` (R$97/mês). Campo `plano` na tabela `empresas`.

### Infraestrutura
- **Frontend:** Netlify com `_redirects` para SPA routing.
- **Backend:** Render (Node.js).
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

---

## Variáveis de ambiente necessárias

```bash
# client/.env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=https://fluxd-erp.onrender.com

# server/.env
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=https://fluxd-erp.netlify.app
STRIPE_SECRET_KEY=          # opcional — billing desativado se ausente
STRIPE_PRICE_PRO=           # price_id do plano Pro no Stripe
STRIPE_WEBHOOK_SECRET=      # opcional — webhook sem verificação de assinatura se ausente
```

---

## Próximos passos sugeridos

### Alta prioridade
- [x] **Refresh token handling** — `SIGNED_OUT` e 401 redirecionam para `/login` (`AuthContext.jsx` + `api.js`)
- [x] **Rate limiting no backend** — `express-rate-limit@7.5.0`: 300 req/15min geral, 20 req/15min em `/api/admin/invite-user`
- [x] **RLS no Supabase** — migration `supabase/migrations/08_rls.sql` pronta para aplicar no SQL Editor; cobre todas as tabelas financeiras + profiles
- [ ] **Smoke test completo em produção** — agora que o bug do `X-Empresa-ID` foi corrigido, validar todos os módulos no ambiente Netlify + Render
- [ ] **Seed de dados de demonstração** — facilitar onboarding de novos clientes SaaS com dados realistas pré-carregados
- [ ] **Testes de carga no Render** — plano gratuito hiberna após inatividade; avaliar upgrade ou warm-up automático

### Produto
- [x] **Dashboard por período** — seletor mês/ano com navegação ← →; KPIs e distribuição de despesas filtrados pelo mês selecionado; comparativo vs mês anterior dinâmico
- [x] **Filtros avançados em Lançamentos** — filtros por conta contábil, cliente e fornecedor adicionados à barra de filtros; seletores de cliente/fornecedor aparecem contextualmente conforme o tipo selecionado; botão "Limpar filtros" quando algum filtro avançado está ativo
- [ ] **Relatório de Fluxo de Caixa em PDF** — mesmo padrão visual do DRE (reaproveitar `drePdf.js`)
- [ ] **Dashboard por período** — hoje mostra sempre o mês corrente; permitir selecionar mês/ano

### Técnico
- [x] **Rate limiting no backend** — implementado (ver Alta prioridade)
- [ ] **Testes automatizados** — ao menos testes de integração nos endpoints críticos (lançamentos, contas)
- [x] **RLS (Row Level Security) no Supabase** — migration `08_rls.sql` criada; aplicar no SQL Editor do Supabase
- [x] **Refresh token handling** — implementado (ver Alta prioridade)
