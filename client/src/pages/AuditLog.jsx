import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

const ACTIONS = ['INSERT', 'UPDATE', 'DELETE'];
const ACTION_STYLE = {
  INSERT: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};
const TABLES = [
  'lancamentos','contas_pagar','contas_receber',
  'clientes','fornecedores','profiles',
];

const PAGE_SIZE = 25;

function JsonDiff({ oldValue, newValue, action }) {
  if (action === 'INSERT') {
    return (
      <pre className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-3 overflow-x-auto max-h-64">
        {JSON.stringify(newValue, null, 2)}
      </pre>
    );
  }
  if (action === 'DELETE') {
    return (
      <pre className="text-[11px] text-red-700 bg-red-50 rounded-lg p-3 overflow-x-auto max-h-64">
        {JSON.stringify(oldValue, null, 2)}
      </pre>
    );
  }
  // UPDATE: mostra diff lado a lado
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Antes</div>
        <pre className="text-[11px] text-red-700 bg-red-50 rounded-lg p-3 overflow-x-auto max-h-48">
          {JSON.stringify(oldValue, null, 2)}
        </pre>
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Depois (campos alterados)</div>
        <pre className="text-[11px] text-blue-700 bg-blue-50 rounded-lg p-3 overflow-x-auto max-h-48">
          {JSON.stringify(newValue, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-50/50 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
          {new Date(log.created_at).toLocaleString('pt-BR')}
        </td>
        <td className="px-5 py-3">
          <div className="text-xs font-semibold text-gray-700">{log.user_email ?? '—'}</div>
        </td>
        <td className="px-5 py-3">
          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {log.table_name}
          </span>
        </td>
        <td className="px-5 py-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_STYLE[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
            {log.action}
          </span>
        </td>
        <td className="px-5 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate">
          {log.record_id}
        </td>
        <td className="px-5 py-3 text-right">
          {open
            ? <ChevronDown size={14} className="text-gray-400 ml-auto" />
            : <ChevronRight size={14} className="text-gray-400 ml-auto" />
          }
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-5 pb-4 pt-0 bg-gray-50/50">
            <div className="rounded-xl border border-gray-100 p-4">
              <JsonDiff
                oldValue={log.old_value}
                newValue={log.new_value}
                action={log.action}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLog() {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(0);
  const [total, setTotal]           = useState(0);

  // Filtros
  const [userEmail, setUserEmail]   = useState('');
  const [action, setAction]         = useState('');
  const [tableName, setTableName]   = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  const carregar = useCallback(async (pg = 0) => {
    setLoading(true);

    let q = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1);

    if (userEmail)  q = q.ilike('user_email', `%${userEmail}%`);
    if (action)     q = q.eq('action', action);
    if (tableName)  q = q.eq('table_name', tableName);
    if (dateFrom)   q = q.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo)     q = q.lte('created_at', dateTo   + 'T23:59:59');

    const { data, count, error } = await q;
    setLoading(false);
    if (error) { console.error(error); return; }
    setLogs(data ?? []);
    setTotal(count ?? 0);
    setPage(pg);
  }, [userEmail, action, tableName, dateFrom, dateTo]);

  useEffect(() => { carregar(0); }, [carregar]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Logs de Sistema"
        subtitle={`${total.toLocaleString('pt-BR')} evento(s) registrado(s)`}
        actions={
          <button className="btn-secondary text-xs" onClick={() => carregar(0)}>
            <RefreshCw size={14} /> Atualizar
          </button>
        }
      />

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filtros</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative col-span-2 lg:col-span-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-7 text-xs"
              placeholder="E-mail do usuário"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
            />
          </div>

          <select className="input text-xs" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">Todas as ações</option>
            {ACTIONS.map(a => <option key={a}>{a}</option>)}
          </select>

          <select className="input text-xs" value={tableName} onChange={e => setTableName(e.target.value)}>
            <option value="">Todas as tabelas</option>
            {TABLES.map(t => <option key={t}>{t}</option>)}
          </select>

          <input type="date" className="input text-xs" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} placeholder="Data inicial" />
          <input type="date" className="input text-xs" value={dateTo}
            onChange={e => setDateTo(e.target.value)} placeholder="Data final" />
        </div>
      </div>

      {/* Tabela */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3">Data/Hora</th>
              <th className="px-5 py-3">Usuário</th>
              <th className="px-5 py-3">Tabela</th>
              <th className="px-5 py-3">Ação</th>
              <th className="px-5 py-3">ID do Registro</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="w-6 h-6 border-2 border-unicri-orange border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  Nenhum log encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              logs.map(log => <LogRow key={log.id} log={log} />)
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Página {page + 1} de {totalPages} · {total.toLocaleString('pt-BR')} registros
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => carregar(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >← Anterior</button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => carregar(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
