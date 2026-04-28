const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  dashboard: {
    kpis: () => req('/dashboard/kpis'),
    fluxoMensal: () => req('/dashboard/fluxo-mensal'),
    distribuicaoDespesas: () => req('/dashboard/distribuicao-despesas'),
    ultimosLancamentos: () => req('/dashboard/ultimos-lancamentos'),
  },

  // CNPJ
  cnpj: (cnpj) => req(`/cnpj/${cnpj.replace(/\D/g, '')}`),

  // Clientes
  clientes: {
    listar: (params = {}) => req(`/clientes?${new URLSearchParams(params)}`),
    buscar: (id) => req(`/clientes/${id}`),
    criar: (data) => req('/clientes', { method: 'POST', body: data }),
    atualizar: (id, data) => req(`/clientes/${id}`, { method: 'PUT', body: data }),
    excluir: (id) => req(`/clientes/${id}`, { method: 'DELETE' }),
  },

  // Fornecedores
  fornecedores: {
    listar: (params = {}) => req(`/fornecedores?${new URLSearchParams(params)}`),
    buscar: (id) => req(`/fornecedores/${id}`),
    criar: (data) => req('/fornecedores', { method: 'POST', body: data }),
    atualizar: (id, data) => req(`/fornecedores/${id}`, { method: 'PUT', body: data }),
    excluir: (id) => req(`/fornecedores/${id}`, { method: 'DELETE' }),
  },

  // Financeiro
  financeiro: {
    lancamentos: (params = {}) => req(`/financeiro/lancamentos?${new URLSearchParams(params)}`),
    criarLancamento: (data) => req('/financeiro/lancamentos', { method: 'POST', body: data }),
    atualizarLancamento: (id, data) => req(`/financeiro/lancamentos/${id}`, { method: 'PUT', body: data }),

    contasPagar: (params = {}) => req(`/financeiro/contas-pagar?${new URLSearchParams(params)}`),
    criarContaPagar: (data) => req('/financeiro/contas-pagar', { method: 'POST', body: data }),
    pagarConta: (id, data) => req(`/financeiro/contas-pagar/${id}/pagar`, { method: 'PATCH', body: data }),
    atualizarContaPagar: (id, data) => req(`/financeiro/contas-pagar/${id}`, { method: 'PUT', body: data }),

    contasReceber: (params = {}) => req(`/financeiro/contas-receber?${new URLSearchParams(params)}`),
    criarContaReceber: (data) => req('/financeiro/contas-receber', { method: 'POST', body: data }),
    receberConta: (id, data) => req(`/financeiro/contas-receber/${id}/receber`, { method: 'PATCH', body: data }),
    atualizarContaReceber: (id, data) => req(`/financeiro/contas-receber/${id}`, { method: 'PUT', body: data }),

    planoContas: () => req('/financeiro/plano-contas'),
    fluxoCaixa: (params = {}) => req(`/financeiro/fluxo-caixa?${new URLSearchParams(params)}`),
    dre: (params = {}) => req(`/financeiro/dre?${new URLSearchParams(params)}`),
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
