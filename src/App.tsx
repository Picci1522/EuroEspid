import { useState } from 'react';
import Conferencia from './components/Conferencia';
import Dashboard from './components/Dashboard';
import { LayoutDashboard, ScanLine } from 'lucide-react';

function App() {
  const [telaAtiva, setTelaAtiva] = useState<'operacao' | 'dashboard'>('operacao');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de Navegação Superior */}
      <nav className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl tracking-tight">EuroEspid <span className="text-blue-400 font-medium">Logística</span></div>
          
          <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setTelaAtiva('operacao')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-colors ${telaAtiva === 'operacao' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <ScanLine size={18} /> Operação
            </button>
            <button 
              onClick={() => setTelaAtiva('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-colors ${telaAtiva === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <LayoutDashboard size={18} /> Gestão
            </button>
          </div>
        </div>
      </nav>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 py-8">
        {telaAtiva === 'operacao' ? <Conferencia /> : <Dashboard />}
      </main>
    </div>
  );
}

export default App;