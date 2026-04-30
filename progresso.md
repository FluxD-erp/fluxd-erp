# FluxD ERP — Progresso do Projeto

> Última atualização: 30/04/2026  
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
| 13 | `3bb341a` | Fix: POST /lancamentos persiste campos OFX (conciliado, ofx_fitid, ofx_memo) |
| 14 | `8212582` | Exportação de DRE em PDF profissional (jsPDF + autoTable) |
| 15 | `caabb54` | **Fix crítico:** `X-Empresa-ID` enviava objeto JSON em vez do UUID puro |

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
- [ ] **Smoke test completo em produção** — agora que o bug do `X-Empresa-ID` foi corrigido, validar todos os módulos no ambiente Netlify + Render
- [ ] **Seed de dados de demonstração** — facilitar onboarding de novos clientes SaaS com dados realistas pré-carregados
- [ ] **Testes de carga no Render** — plano gratuito hiberna após inatividade; avaliar upgrade ou warm-up automático

### Produto
- [ ] **Relatório de Fluxo de Caixa em PDF** — mesmo padrão visual do DRE (reaproveitar `drePdf.js`)
- [ ] **Filtros avançados em Lançamentos** — por conta contábil, por cliente/fornecedor
- [ ] **Dashboard por período** — hoje mostra sempre o mês corrente; permitir selecionar mês/ano
- [ ] **Notificações por e-mail** — boletos vencendo (hoje só aparece no sino)
- [ ] **Importação de fornecedores/clientes via CSV** — mesmo padrão da importação de lançamentos

### Técnico
- [ ] **Rate limiting no backend** — proteger endpoints públicos de abuso
- [ ] **Testes automatizados** — ao menos testes de integração nos endpoints críticos (lançamentos, contas)
- [ ] **RLS (Row Level Security) no Supabase** — adicionar policies para garantir isolamento multi-tenant no nível do banco, não só na aplicação
- [ ] **Refresh token handling** — tratar expiração de sessão Supabase com redirect para login
