import { supabase } from '../lib/supabase';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

/** Retorna headers com JWT + empresa ativa */
async function buildHeaders(extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  // localStorage guarda o objeto completo; extrai só o UUID
  let empresaId = '';
  try {
    const raw = localStorage.getItem('empresaAtiva') || '';
    if (raw) {
      const parsed = JSON.parse(raw);
      empresaId = parsed?.id ?? raw;   // objeto → .id; string pura → usa direto
    }
  } catch {
    empresaId = '';
  }

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    ...(empresaId ? { 'X-Empresa-ID': empresaId } : {}),
    ...extra,
  };
}

async function req(path, options = {}) {
  const headers = await buildHeaders(options.headers);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Sessão expirada.');
    }
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard: {
    kpis               : (mes)  => req(`/dashboard/kpis${mes ? `?mes=${mes}` : ''}`),
    fluxoMensal        : ()     => req('/dashboard/fluxo-mensal'),
    distribuicaoDespesas: (mes) => req(`/dashboard/distribuicao-despesas${mes ? `?mes=${mes}` : ''}`),
    ultimosLancamentos : ()     => req('/dashboard/ultimos-lancamentos'),
  },

  // CNPJ (público, sem empresa)
  cnpj: (cnpj) => req(`/cnpj/${cnpj.replace(/\D/g, '')}`),

  // Empresas
  empresas: {
    listar  : ()          => req('/empresas'),
    criar   : (data)      => req('/empresas', { method: 'POST', body: data }),
    buscar  : (id)        => req(`/empresas/${id}`),
    atualizar: (id, data) => req(`/empresas/${id}`, { method: 'PUT', body: data }),
    usuarios: {
      listar     : (id)            => req(`/empresas/${id}/usuarios`),
      vincular   : (id, data)      => req(`/empresas/${id}/usuarios`, { method: 'POST', body: data }),
      atualizar  : (id, uid, data) => req(`/empresas/${id}/usuarios/${uid}`, { method: 'PATCH', body: data }),
    },
  },

  // Clientes
  clientes: {
    listar   : (params = {}) => req(`/clientes?${new URLSearchParams(params)}`),
    buscar   : (id)          => req(`/clientes/${id}`),
    criar    : (data)        => req('/clientes', { method: 'POST', body: data }),
    atualizar: (id, data)    => req(`/clientes/${id}`, { method: 'PUT', body: data }),
    excluir  : (id)          => req(`/clientes/${id}`, { method: 'DELETE' }),
  },

  // Fornecedores
  fornecedores: {
    listar   : (params = {}) => req(`/fornecedores?${new URLSearchParams(params)}`),
    buscar   : (id)          => req(`/fornecedores/${id}`),
    criar    : (data)        => req('/fornecedores', { method: 'POST', body: data }),
    atualizar: (id, data)    => req(`/fornecedores/${id}`, { method: 'PUT', body: data }),
    excluir  : (id)          => req(`/fornecedores/${id}`, { method: 'DELETE' }),
  },

  // Financeiro
  financeiro: {
    lancamentos       : (params = {}) => req(`/financeiro/lancamentos?${new URLSearchParams(params)}`),
    criarLancamento   : (data)        => req('/financeiro/lancamentos', { method: 'POST', body: data }),
    atualizarLancamento: (id, data)   => req(`/financeiro/lancamentos/${id}`, { method: 'PUT', body: data }),
    deletarLancamento  : (id)         => req(`/financeiro/lancamentos/${id}`, { method: 'DELETE' }),

    contasPagar        : (params = {}) => req(`/financeiro/contas-pagar?${new URLSearchParams(params)}`),
    criarContaPagar    : (data)        => req('/financeiro/contas-pagar', { method: 'POST', body: data }),
    pagarConta         : (id, data)    => req(`/financeiro/contas-pagar/${id}/pagar`, { method: 'PATCH', body: data }),
    atualizarContaPagar: (id, data)    => req(`/financeiro/contas-pagar/${id}`, { method: 'PUT', body: data }),

    contasReceber        : (params = {}) => req(`/financeiro/contas-receber?${new URLSearchParams(params)}`),
    criarContaReceber    : (data)        => req('/financeiro/contas-receber', { method: 'POST', body: data }),
    receberConta         : (id, data)    => req(`/financeiro/contas-receber/${id}/receber`, { method: 'PATCH', body: data }),
    atualizarContaReceber: (id, data)    => req(`/financeiro/contas-receber/${id}`, { method: 'PUT', body: data }),

    importar            : (rows)        => req('/financeiro/importar', { method: 'POST', body: { rows } }),
    importarNF          : (data)        => req('/financeiro/importar-nf', { method: 'POST', body: data }),
    importarContasPagar : (linhas)      => req('/financeiro/importar-contas-pagar', { method: 'POST', body: { linhas } }),
    conciliar       : (id, data)    => req(`/financeiro/lancamentos/${id}/conciliar`, { method: 'PATCH', body: data }),
    conciliarBulk   : (pares)       => req('/financeiro/lancamentos/conciliar-bulk', { method: 'PATCH', body: { pares } }),

    planoContas: () => req('/financeiro/plano-contas'),
    fluxoCaixa : (params = {}) => req(`/financeiro/fluxo-caixa?${new URLSearchParams(params)}`),
    dre        : (params = {}) => req(`/financeiro/dre?${new URLSearchParams(params)}`),
    dreAnalitico: (params = {}) => req(`/financeiro/dre/analitico?${new URLSearchParams(params)}`),
  },

  // Contas Bancárias
  contasBancarias: {
    listar  : ()          => req('/contas-bancarias'),
    saldos  : ()          => req('/contas-bancarias/saldos'),
    match   : (bankId, acctId) => req(`/contas-bancarias/match?bank_id=${encodeURIComponent(bankId || '')}&acct_id=${encodeURIComponent(acctId || '')}`),
    criar   : (data)      => req('/contas-bancarias', { method: 'POST', body: data }),
    atualizar: (id, data) => req(`/contas-bancarias/${id}`, { method: 'PATCH', body: data }),
    excluir : (id)        => req(`/contas-bancarias/${id}`, { method: 'DELETE' }),
  },

  // Billing (Stripe)
  billing: {
    createCheckout: (data) => req('/billing/create-checkout', { method: 'POST', body: data }),
    portal        : (data) => req('/billing/portal',          { method: 'POST', body: data }),
  },
};

export function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function fmtData(data) {
  if (!data) return '—';
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function fmtMes(mes) {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(m) - 1]}/${ano.slice(2)}`;
}
