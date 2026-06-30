import Conferencia from './components/Conferencia';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra Superior Limpa e Direta */}
      <nav className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl tracking-tight">
            EuroEspid <span className="text-green-500 font-medium">Logística</span>
          </div>
          <div className="text-xs text-slate-400 font-mono uppercase tracking-wider bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
            Modo Operacional Ativo
          </div>
        </div>
      </nav>

      {/* Área Principal - Direto na Bipagem e Impressão */}
      <main className="flex-1 py-8">
        <Conferencia />
      </main>
    </div>
  );
}

export default App;