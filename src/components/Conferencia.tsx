import React, { useState } from 'react';
import { useExpedicaoStore } from '../store/useExpedicaoStore';
import { CheckCircle2, ScanLine, PackageCheck, Camera } from 'lucide-react';
import ScannerCamera from './ScannerCamera'; // Importamos a câmera aqui!

export default function Conferencia() {
  const [inputNfe, setInputNfe] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false); // Controle da câmera
  const { notaAtual, produtos, iniciarConferencia, biparProduto } = useExpedicaoStore();

  const handleBuscarNota = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNfe) iniciarConferencia(inputNfe);
  };

  const handleScanSuccess = (textoLido: string) => {
    setIsCameraOpen(false); // Fecha a câmera
    setInputNfe(textoLido); // Joga o número no input
    iniciarConferencia(textoLido); // Inicia a busca automaticamente
  };

  const totalEsperado = produtos.reduce((acc, curr) => acc + curr.qtdEsperada, 0);
  const totalConferido = produtos.reduce((acc, curr) => acc + curr.qtdConferida, 0);
  const finalizado = totalEsperado > 0 && totalEsperado === totalConferido;

  return (
    <div className="p-4 max-w-3xl mx-auto font-sans relative">
      <header className="mb-6 border-b pb-4 flex items-center gap-2">
        <PackageCheck className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Expedição Indústria</h1>
      </header>

      {!notaAtual ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Ler Código de Barras da DANFE
          </label>
          <form onSubmit={handleBuscarNota} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              autoFocus
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg outline-none"
              placeholder="Digite ou bip com a pistola..."
              value={inputNfe}
              onChange={(e) => setInputNfe(e.target.value)}
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                <ScanLine className="w-5 h-5" /> Buscar
              </button>
              
              {/* Botão para abrir a câmera */}
              <button 
                type="button" 
                onClick={() => setIsCameraOpen(true)}
                className="flex-1 sm:flex-none bg-slate-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-slate-700 flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" /> Câmera
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-inner">
            <div>
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Nota em Conferência</p>
              <p className="font-mono text-slate-800 font-bold mt-1">{notaAtual}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Progresso</p>
              <p className="text-3xl font-black text-blue-600">{totalConferido} <span className="text-lg text-slate-400">/ {totalEsperado}</span></p>
            </div>
          </div>

          <div className="grid gap-3">
            {produtos.map((prod) => {
              const concluido = prod.qtdConferida === prod.qtdEsperada;
              const emAndamento = prod.qtdConferida > 0 && !concluido;

              return (
                <div 
                  key={prod.id} 
                  className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-all
                    ${concluido ? 'bg-green-50 border-green-500 shadow-sm' : 
                      emAndamento ? 'bg-yellow-50 border-yellow-400 shadow-sm' : 'bg-white border-slate-200'}
                  `}
                >
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{prod.codigo} - {prod.descricao}</h3>
                    {prod.lote && <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">Lote exigido: <span className="font-mono font-bold text-slate-700">{prod.lote}</span></p>}
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <span className="text-2xl font-black text-slate-700">
                      {prod.qtdConferida} <span className="text-base text-slate-400 font-bold">/ {prod.qtdEsperada}</span>
                    </span>
                    
                    {concluido ? (
                      <CheckCircle2 className="text-green-600 w-10 h-10" />
                    ) : (
                      <button 
                        onClick={() => biparProduto(prod.id)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-transform w-full sm:w-auto flex justify-center items-center gap-2"
                      >
                        <ScanLine className="w-5 h-5"/> Bipar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {finalizado && (
            <div className="mt-8 p-8 bg-green-600 text-white rounded-xl text-center shadow-xl animate-in fade-in zoom-in duration-500">
              <CheckCircle2 className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-3xl font-black mb-2">Conferência Finalizada!</h2>
              <p className="text-green-100 font-medium text-lg">Carga conferida com sucesso e pronta para expedição.</p>
            </div>
          )}
        </div>
      )}

      {/* Renderiza o Scanner Flutuante quando clicamos em "Câmera" */}
      {isCameraOpen && (
        <ScannerCamera 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
}