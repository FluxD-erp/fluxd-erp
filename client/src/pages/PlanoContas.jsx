import { useEffect, useState } from 'react';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';

const TIPO_COLORS = {
  RECEITA: 'bg-emerald-100 text-emerald-700',
  DESPESA: 'bg-red-100 text-red-700',
  ATIVO: 'bg-blue-100 text-blue-700',
  PASSIVO: 'bg-sky-100 text-sky-700',
  PATRIMONIO: 'bg-purple-100 text-purple-700',
};

export default function PlanoContas() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.financeiro.planoContas().then(data => { setContas(data); setLoading(false); });
  }, []);

  const grupos = contas.reduce((acc, c) => {
    const g = c.tipo;
    if (!acc[g]) acc[g] = [];
    acc[g].push(c);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Plano de Contas" subtitle="Estrutura contábil do sistema" />
      {loading ? (
        <div className="text-center py-10 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grupos).map(([tipo, contas]) => (
            <div key={tipo} className="card overflow-hidden">
              <div className={`px-5 py-3 flex items-center gap-2 ${TIPO_COLORS[tipo]} font-bold text-sm`}>
                {tipo}
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {contas.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-mono text-xs text-gray-400 w-28">{c.codigo}</td>
                      <td className="px-5 py-2.5 text-gray-800" style={{ paddingLeft: `${(c.nivel - 1) * 24 + 20}px` }}>
                        {c.nome}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-400">{c.natureza}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
