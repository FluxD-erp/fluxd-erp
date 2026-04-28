import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, ExternalLink,
  Download, AlertCircle, CheckCircle2, Clock, TrendingDown,
  TrendingUp, Info,
} from 'lucide-react';
import { api, fmt } from '../services/api';
import PageHeader from '../components/PageHeader';

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Retorna a segunda-feira da semana que contém `date`
function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function dateStr(date) {
  return date.toISOString().split('T')[0];
}

// Abre o Google Agenda com o evento pré-preenchido (sem OAuth, fluxo público)
function googleCalendarUrl(ev) {
  const d = (ev.data_vencimento || '').replace(/-/g, '');
  const prefix = ev._tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
  const title = `[FluxD] ${prefix}: ${ev.descricao}`;
  const body = [
    ev._tipo === 'PAGAR' ? 'Conta a Pagar' : 'Conta a Receber',
    `Valor: ${fmt(ev.valor_original)}`,
    `Status: ${ev.status}`,
    '',
    'FluxD — Sistema Financeiro',
  ].join('\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${d}/${d}`,
    details: body,
    sf: 'true',
    output: 'xml',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// Gera um arquivo .ics compatível com Google Agenda, Apple Calendar, Outlook
function generateICS(events, weekLabel) {
  const esc = (s) =>
    String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

  const vevents = events.map((ev) => {
    const d = (ev.data_vencimento || '').replace(/-/g, '');
    const tipo = ev._tipo === 'PAGAR' ? 'PAGAR' : 'RECEBER';
    // DTEND = dia seguinte para evento de dia inteiro
    const dNext = dateStr(new Date(new Date(ev.data_vencimento + 'T12:00:00').getTime() + 864e5)).replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:fluxd-${ev.id}@fluxd.app`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${dNext}`,
      `SUMMARY:${esc(`[${tipo}] ${ev.descricao} — ${fmt(ev.valor_original)}`)}`,
      `DESCRIPTION:${esc([
        ev._tipo === 'PAGAR' ? 'Conta a Pagar' : 'Conta a Receber',
        `Valor: ${fmt(ev.valor_original)}`,
        `Status: ${ev.status}`,
        ev._tipo === 'PAGAR' && ev.fornecedor_nome ? `Fornecedor: ${ev.fornecedor_nome}` : '',
        ev._tipo === 'RECEBER' && ev.cliente_nome ? `Cliente: ${ev.cliente_nome}` : '',
      ].filter(Boolean).join('\n'))}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`Vencimento hoje: ${ev.descricao}`)}`,
      'TRIGGER:-PT8H',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//FluxD//Sistema Financeiro//PT-BR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:FluxD — Vencimentos ${weekLabel}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EventCard({ ev }) {
  const isPagar = ev._tipo === 'PAGAR';
  const isDone = ev.status === 'PAGA' || ev.status === 'RECEBIDA';
  const isOverdue = ev.status === 'VENCIDA';

  const bg = isDone
    ? 'bg-gray-50 border-gray-200 opacity-60'
    : isPagar
    ? isOverdue
      ? 'bg-red-50 border-red-300'
      : 'bg-red-50/70 border-red-150'
    : isOverdue
    ? 'bg-amber-50 border-amber-200'
    : 'bg-emerald-50/70 border-emerald-150';

  const valueColor = isDone ? 'text-gray-400' : isPagar ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className={`rounded-lg p-2 text-xs border group relative transition-all hover:shadow-sm ${bg}`}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {isDone ? (
            <CheckCircle2 size={11} className="text-gray-400 shrink-0" />
          ) : isOverdue ? (
            <AlertCircle size={11} className="text-red-400 shrink-0" />
          ) : (
            <Clock size={11} className="text-gray-300 shrink-0" />
          )}
          <span className={`font-semibold truncate ${isPagar ? 'text-red-700' : 'text-emerald-700'} ${isDone ? 'line-through' : ''}`}>
            {(ev.descricao || '').replace(/\[.*?\]\s*/, '')}
          </span>
        </div>
        <a
          href={googleCalendarUrl(ev)}
          target="_blank"
          rel="noopener noreferrer"
          title="Agendar no Google Agenda"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-blue-500 mt-0.5"
        >
          <ExternalLink size={11} />
        </a>
      </div>

      <div className={`font-bold mt-0.5 ${valueColor}`}>
        {isPagar ? '−' : '+'}{fmt(ev.valor_original)}
      </div>

      {isPagar && ev.fornecedor_nome && (
        <div className="text-gray-400 truncate mt-0.5">{ev.fornecedor_nome}</div>
      )}
      {!isPagar && ev.cliente_nome && (
        <div className="text-gray-400 truncate mt-0.5">{ev.cliente_nome}</div>
      )}
    </div>
  );
}

export default function ProgramacaoSemana() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [loading, setLoading] = useState(true);

  // Os 7 dias da semana corrente
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const inicio = dateStr(weekDays[0]);
  const fim = dateStr(weekDays[6]);

  const weekLabel = `${weekDays[0].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [cp, cr] = await Promise.all([
        api.financeiro.contasPagar({ inicio, fim }),
        api.financeiro.contasReceber({ inicio, fim }),
      ]);
      setContasPagar(cp.map((c) => ({ ...c, _tipo: 'PAGAR' })));
      setContasReceber(cr.map((c) => ({ ...c, _tipo: 'RECEBER' })));
    } finally {
      setLoading(false);
    }
  }, [inicio, fim]);

  useEffect(() => { carregar(); }, [carregar]);

  const allEvents = [...contasPagar, ...contasReceber];

  // Agrupa por data de vencimento
  const byDate = {};
  allEvents.forEach((ev) => {
    const key = (ev.data_vencimento || '').split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  });

  const hoje = dateStr(new Date());

  // KPIs da semana
  const pendPagar = contasPagar.filter((c) => c.status !== 'PAGA' && c.status !== 'CANCELADO');
  const pendReceber = contasReceber.filter((c) => c.status !== 'RECEBIDA' && c.status !== 'CANCELADO');
  const totalPagar = pendPagar.reduce((s, c) => s + (c.valor_original - (c.valor_pago || 0)), 0);
  const totalReceber = pendReceber.reduce((s, c) => s + (c.valor_original - (c.valor_recebido || 0)), 0);
  const saldo = totalReceber - totalPagar;

  const vencidas = allEvents.filter((e) => e.status === 'VENCIDA');

  const handleExport = () => {
    const ics = generateICS(allEvents, weekLabel);
    downloadICS(ics, `fluxd-semana-${inicio}.ics`);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  return (
    <div>
      <PageHeader
        title="Programação da Semana"
        subtitle={weekLabel}
        actions={
          <button className="btn-secondary text-xs" onClick={handleExport} title="Exportar todos os vencimentos da semana como arquivo .ics">
            <Download size={14} /> Exportar .ics
          </button>
        }
      />

      {/* Alerta de vencidas */}
      {vencidas.length > 0 && (
        <div className="mb-5 card p-3 bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <span className="text-sm text-red-700">
            <strong>{vencidas.length} conta(s) vencida(s)</strong> nesta semana —{' '}
            {fmt(vencidas.reduce((s, e) => s + e.valor_original, 0))} em atraso.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4 border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={15} className="text-red-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">A Pagar</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{fmt(totalPagar)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{pendPagar.length} conta(s) pendente(s)</div>
        </div>

        <div className="card p-4 border-l-4 border-emerald-400">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-emerald-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">A Receber</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{fmt(totalReceber)}</div>
          <div className="text-xs text-gray-400 mt-0.5">{pendReceber.length} conta(s) pendente(s)</div>
        </div>

        <div className={`card p-4 border-l-4 ${saldo >= 0 ? 'border-unicri-orange' : 'border-red-400'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={15} className={saldo >= 0 ? 'text-unicri-orange' : 'text-red-400'} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo Líquido</span>
          </div>
          <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-unicri-navy' : 'text-red-600'}`}>{fmt(saldo)}</div>
          <div className="text-xs text-gray-400 mt-0.5">Recebimentos − Pagamentos</div>
        </div>
      </div>

      {/* Navegação de semana */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            Hoje
          </button>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> A Pagar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> A Receber
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Liquidado
          </span>
        </div>
      </div>

      {/* Grade semanal */}
      {loading ? (
        <div className="flex items-center justify-center h-72">
          <div className="w-8 h-8 border-4 border-unicri-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2.5">
          {weekDays.map((day, i) => {
            const ds = dateStr(day);
            const isToday = ds === hoje;
            const isPast = ds < hoje;
            const events = byDate[ds] || [];

            // Saldo do dia: recebimentos positivos, pagamentos negativos (apenas pendentes)
            const dayBalance = events.reduce((s, e) => {
              if (e.status === 'PAGA' || e.status === 'RECEBIDA') return s;
              return s + (e._tipo === 'RECEBER' ? e.valor_original : -e.valor_original);
            }, 0);

            return (
              <div
                key={ds}
                className={`flex flex-col rounded-xl border overflow-hidden transition-shadow
                  ${isToday
                    ? 'border-unicri-orange shadow-lg shadow-unicri-orange/15'
                    : 'border-gray-200 shadow-sm'
                  }`}
              >
                {/* Cabeçalho do dia */}
                <div
                  className={`px-3 py-2.5 flex items-center justify-between shrink-0
                    ${isToday
                      ? 'bg-unicri-orange'
                      : isPast
                      ? 'bg-gray-100'
                      : 'bg-white border-b border-gray-100'
                    }`}
                >
                  <div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest
                      ${isToday ? 'text-white/70' : isPast ? 'text-gray-400' : 'text-gray-400'}`}>
                      {DIAS[i]}
                    </div>
                    <div className={`text-xl font-extrabold leading-none mt-0.5
                      ${isToday ? 'text-white' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                      {day.getDate()}
                    </div>
                    <div className={`text-[10px] mt-0.5
                      ${isToday ? 'text-white/60' : isPast ? 'text-gray-300' : 'text-gray-400'}`}>
                      {day.toLocaleDateString('pt-BR', { month: 'short' })}
                    </div>
                  </div>

                  {events.length > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                      ${isToday ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {events.length}
                    </span>
                  )}
                </div>

                {/* Lista de eventos */}
                <div className="flex-1 bg-white p-2 space-y-1.5 overflow-y-auto" style={{ minHeight: 180, maxHeight: 280 }}>
                  {events.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs text-gray-200 select-none">—</span>
                    </div>
                  ) : (
                    events.map((ev) => <EventCard key={ev.id} ev={ev} />)
                  )}
                </div>

                {/* Rodapé: saldo do dia */}
                {events.length > 0 && (
                  <div className={`px-3 py-2 bg-gray-50 border-t border-gray-100 text-right text-xs font-bold shrink-0
                    ${dayBalance > 0 ? 'text-emerald-600' : dayBalance < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {dayBalance > 0 ? '+' : ''}{fmt(dayBalance)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Instrução de integração */}
      <div className="mt-6 card p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
        <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <strong className="text-blue-800">Integração com Google Agenda:</strong>{' '}
          Passe o mouse sobre qualquer vencimento e clique no ícone{' '}
          <ExternalLink size={11} className="inline align-middle" />{' '}
          para criar um lembrete individual diretamente no Google Agenda (sem login adicional).
          Para importar todos os vencimentos da semana de uma vez, clique em{' '}
          <strong>Exportar .ics</strong> e importe o arquivo em{' '}
          <em>Google Agenda → Configurações → Importar e exportar</em>.
          O arquivo inclui um lembrete automático 8h antes de cada vencimento.
        </div>
      </div>
    </div>
  );
}
