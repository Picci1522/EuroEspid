import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Package, CheckSquare, Clock, Download } from 'lucide-react';

const mockDadosProdutividade = [
  { hora: '08:00', volumes: 45 },
  { hora: '09:00', volumes: 78 },
  { hora: '10:00', volumes: 112 },
  { hora: '11:00', volumes: 89 },
  { hora: '12:00', volumes: 30 }, // Horário de almoço
  { hora: '13:00', volumes: 95 },
];

export default function Dashboard() {
  return (
    <div className="p-4 max-w-6xl mx-auto font-sans animate-in fade-in duration-500">
      <header className="mb-8 border-b pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel do Supervisor</h1>
          <p className="text-slate-500">Visão geral da expedição em tempo real</p>
        </div>
        
        {/* Aqui está o nosso novo botão de PDF! */}
        <button 
          onClick={() => window.open('/api/relatorios/pdf', '_blank')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Download size={20} />
          Exportar Relatório PDF
        </button>
      </header>

      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Package size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">Total de Notas Hoje</p>
            <p className="text-2xl font-black text-slate-800">142</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CheckSquare size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">Notas Expedidas</p>
            <p className="text-2xl font-black text-slate-800">89</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-yellow-500">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">Aguardando Doca</p>
            <p className="text-2xl font-black text-slate-800">53</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-slate-500 font-bold">Volumes Conferidos</p>
            <p className="text-2xl font-black text-slate-800">4.521</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Produtividade */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Volumes Conferidos por Hora</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockDadosProdutividade}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="volumes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}