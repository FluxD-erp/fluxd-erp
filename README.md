# UNICRI ERP — Sistema Financeiro

ERP financeiro desenvolvido para a UNICRI (Pau dos Ferros/RN), com identidade visual da marca, dashboards executivos e integração automática com a Receita Federal via CNPJ.

## Como iniciar

### Opção 1 — Script automático (Windows)
```
iniciar.bat
```

### Opção 2 — Manual

```bash
# Backend (porta 3001)
cd server
npm install
node src/db/seed.js   # apenas na primeira vez
npm run dev

# Frontend (porta 5173) — em outro terminal
cd client
npm install
npm run dev
```

Acesse: **http://localhost:5173**

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | KPIs financeiros, gráficos de receitas/despesas, alertas de vencimento |
| **Contas a Pagar** | Gestão de obrigações, registro de pagamentos parciais/totais |
| **Contas a Receber** | Gestão de créditos, registro de recebimentos |
| **Lançamentos** | Registro livre de receitas e despesas |
| **Fluxo de Caixa** | Visão diária da movimentação com saldo acumulado |
| **Clientes** | Cadastro com busca automática de CNPJ na Receita Federal |
| **Fornecedores** | Cadastro com busca automática de CNPJ na Receita Federal |
| **Plano de Contas** | Estrutura contábil adaptada para educação |
| **Relatórios (DRE)** | Demonstrativo de Resultado com margem líquida |

## Integração Receita Federal

Ao cadastrar clientes ou fornecedores do tipo **Pessoa Jurídica**, basta digitar o CNPJ e clicar em **Buscar CNPJ**. O sistema consulta a API BrasilAPI (que espelha dados da Receita Federal) e preenche automaticamente:

- Razão Social e Nome Fantasia
- Endereço completo (logradouro, bairro, cidade, UF, CEP)
- Telefone e E-mail (quando disponível)
- Situação Cadastral (Ativa, Baixada, Inapta, etc.)
- Atividade Principal (CNAE)

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **API externa:** BrasilAPI (CNPJ/Receita Federal)
