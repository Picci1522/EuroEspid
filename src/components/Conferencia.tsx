import React, { useState } from 'react';
import { useExpedicaoStore } from '../store/useExpedicaoStore';
import { CheckCircle2, ScanLine, PackageCheck, Camera, Printer, Plus, Trash2, Save, FileCode, ArrowLeft } from 'lucide-react';
import ScannerCamera from './ScannerCamera'; 

interface ItemManual {
  codigo: string;
  descricao: string;
  lote: string;
  qtdEsperada: string;
}

export default function Conferencia() {
  const [inputChave, setInputChave] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false); 
  const [erroNota, setErroNota] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Estados do formulário manual/XML
  const [numNota, setNumNota] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [itensManuais, setItensManuais] = useState<ItemManual[]>([
    { codigo: '', descricao: '', lote: '', qtdEsperada: '' }
  ]);

  const [quantidadesDigitadas, setQuantidadesDigitadas] = useState<Record<string, string>>({});

  // Puxamos a função 'limparNota' do seu store para conseguir resetar a pesquisa
  const { notaAtual, produtos, iniciarConferencia, limparNota } = useExpedicaoStore();

  const resetarFormularioManual = () => {
    setNumNota('');
    setDestinatario('');
    setTransportadora('');
    setItensManuais([{ codigo: '', descricao: '', lote: '', qtdEsperada: '' }]);
  };

  // BOTÃO INTELIGENTE DE VOLTAR / NOVA PESQUISA
  const handleVoltarAoInicio = () => {
    setErroNota(false);
    setInputChave('');
    resetarFormularioManual();
    if (typeof limparNota === 'function') {
      limparNota(); // Reseta o estado global se a função existir
    } else {
      // Força um recarregamento rápido da página caso o store não tenha o resetter
      window.location.reload();
    }
  };

  const handleBuscarNota = async (inputChaveAlvo: string) => {
    if (!inputChaveAlvo) return;
    
    setErroNota(false);
    setCarregando(true);

    try {
      const resposta = await fetch(`/api/nfe/${inputChaveAlvo}`);
      
      if (resposta.ok) {
        await iniciarConferencia(inputChaveAlvo);
      } else {
        setErroNota(true);
        if (inputChaveAlvo.length === 44) {
          const nfExtraida = parseInt(inputChaveAlvo.substring(25, 34), 10).toString();
          setNumNota(`NF-${nfExtraida}`);
        }
      }
    } catch (err) {
      setErroNota(true);
    } finally {
      setCarregando(false);
    }
  };

  const handleScanSuccess = (textoLido: string) => {
    setIsCameraOpen(false); 
    setInputChave(textoLido); 
    handleBuscarNota(textoLido);
  };

  // LEITURA DO XML ROBUSTA (Busca lote em múltiplos lugares possíveis)
  const handleProcessarXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      try {
        const conteudoTxt = evento.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(conteudoTxt, "text/xml");

        const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent || "";
        if (nNF) setNumNota(`NF-${parseInt(nNF, 10)}`);

        const xNomeDest = xmlDoc.getElementsByTagName("dest")[0]?.getElementsByTagName("xNome")[0]?.textContent || "";
        if (xNomeDest) setDestinatario(xNomeDest.toUpperCase());

        const xNomeTransp = xmlDoc.getElementsByTagName("transporta")[0]?.getElementsByTagName("xNome")[0]?.textContent || "";
        setTransportadora(xNomeTransp ? xNomeTransp.toUpperCase() : "RETIRA / CLIENTE");

        const tagsDet = xmlDoc.getElementsByTagName("det");
        const listaProdutosMapeados: ItemManual[] = [];

        for (let i = 0; i < tagsDet.length; i++) {
          const prodTag = tagsDet[i].getElementsByTagName("prod")[0];
          if (prodTag) {
            const codigo = prodTag.getElementsByTagName("cProd")[0]?.textContent || "";
            const descricao = prodTag.getElementsByTagName("xProd")[0]?.textContent || "";
            const qCom = prodTag.getElementsByTagName("qCom")[0]?.textContent || "1";
            
            // Tentativa 1 de achar Lote: Tag padrão <rastro>
            const rastroTag = tagsDet[i].getElementsByTagName("rastro")[0];
            let loteDetectado = rastroTag ? rastroTag.getElementsByTagName("nLote")[0]?.textContent || "" : "";

            // Tentativa 2 de achar Lote: Procurar nas informações adicionais do produto
            if (!loteDetectado) {
              const infAdProd = tagsDet[i].getElementsByTagName("infAdProd")[0]?.textContent || "";
              const matchLote = infAdProd.match(/LOTE:\s*([A-Za-z0-9\-]+)/i);
              if (matchLote) loteDetectado = matchLote[1];
            }

            listaProdutosMapeados.push({
              codigo,
              descricao: descricao.toUpperCase(),
              lote: loteDetectado.toUpperCase(), // Se não achar nada, vem em branco pro operador ditar
              qtdEsperada: Math.ceil(parseFloat(qCom)).toString()
            });
          }
        }

        if (listaProdutosMapeados.length > 0) {
          setItensManuais(listaProdutosMapeados);
        }

      } catch (erroParse) {
        alert("Erro ao ler a estrutura deste XML.");
      }
    };
    leitor.readAsText(arquivo);
  };

  const handleAdicionarItemManual = () => {
    setItensManuais([...itensManuais, { codigo: '', descricao: '', lote: '', qtdEsperada: '' }]);
  };

  const handleRemoverItemManual = (index: number) => {
    if (itensManuais.length > 1) {
      setItensManuais(itensManuais.filter((_, i) => i !== index));
    }
  };

  const handleItemManualChange = (index: number, campo: keyof ItemManual, valor: string) => {
    const novosItens = [...itensManuais];
    novosItens[index][campo] = valor;
    setItensManuais(novosItens);
  };

  const handleSalvarNotaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numNota || !destinatario || !transportadora) return;

    try {
      const resposta = await fetch('/api/nfe/salvar-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chave: inputChave || `MANUAL-${Date.now()}`,
          numero: numNota,
          destinatario,
          transportadora,
          produtos: itensManuais
        })
      });

      if (resposta.ok) {
        setErroNota(false);
        resetarFormularioManual();
        await iniciarConferencia(inputChave || `MANUAL-${Date.now()}`);
      }
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
    }
  };

  const handleQtdChange = (prodId: string, valor: string) => {
    setQuantidadesDigitadas(prev => ({ ...prev, [prodId]: valor }));
  };

  const handleImprimirEtiquetaProduto = (prodId: string, qtdPadrao: number) => {
    const qtdCustomizada = quantidadesDigitadas[prodId];
    const qtdFinal = qtdCustomizada !== undefined && qtdCustomizada !== '' ? qtdCustomizada : qtdPadrao;
    window.open(`/api/etiqueta/produto/${prodId}?qtd=${qtdFinal}`, '_blank');
  };

  return (
    <div className="p-4 max-w-3xl mx-auto font-sans relative">
      <header className="mb-6 border-b pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Expedição Indústria</h1>
        </div>

        {/* BOTÃO MÁGICO DE RETORNAR/NOVA PESQUISA (Aparece se tiver nota carregada ou em modo manual) */}
        {(notaAtual || erroNota) && (
          <button 
            onClick={handleVoltarAoInicio}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border transition-colors shadow-sm"
          >
            <ArrowLeft size={14} /> Nova Pesquisa
          </button>
        )}
      </header>

      {!notaAtual && !erroNota && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Ler Código de Barras da DANFE
          </label>
          <form onSubmit={(e) => { e.preventDefault(); handleBuscarNota(inputChave); }} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              autoFocus
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg outline-none"
              placeholder="Digite ou bip com a pistola..."
              value={inputChave}
              onChange={(e) => setInputChave(e.target.value)}
              disabled={carregando}
            />
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={carregando}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-blue-400"
              >
                <ScanLine className="w-5 h-5" /> {carregando ? 'Buscando...' : 'Buscar'}
              </button>
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
      )}

      {/* GERADOR MANUAL / IMPORTADOR DE XML */}
      {!notaAtual && erroNota && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-amber-200 space-y-6 animate-in fade-in duration-300">
          <div className="border-b pb-3 border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                ⚠️ Carga Nova Identificada
              </h2>
              <p className="text-slate-500 text-sm mt-1">Insira o XML do Cofre NFe para preenchimento veloz ou altere manualmente abaixo.</p>
            </div>
            
            <label className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm">
              <FileCode size={16} />
              Importar XML do Cofre
              <input type="file" accept=".xml" className="hidden" onChange={handleProcessarXML} />
            </label>
          </div>

          <form onSubmit={handleSalvarNotaManual} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Identificação NF</label>
                <input required type="text" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={numNota} onChange={e => setNumNota(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente / Destinatário</label>
                <input required type="text" placeholder="Ex: FRIGORIFICO FRANGO FACIO LTDA" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={destinatario} onChange={e => setDestinatario(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Transportadora Vinculada</label>
              <input required type="text" placeholder="Ex: ALFA TRANSPORTES LTDA" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={transportadora} onChange={e => setTransportadora(e.target.value)} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Itens e Lotes da Carga</label>
              
              {itensManuais.map((item, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 relative group items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 sm:hidden">Cód</label>
                    <input required placeholder="Cód. Prod" className="w-full p-2 border rounded-md bg-white text-sm font-bold" value={item.codigo} onChange={e => handleItemManualChange(index, 'codigo', e.target.value)} />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 sm:hidden">Descrição</label>
                    <input required placeholder="Descrição do Produto" className="w-full p-2 border rounded-md bg-white text-sm" value={item.descricao} onChange={e => handleItemManualChange(index, 'descricao', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 sm:hidden">Lote</label>
                    <input placeholder="Digitar Lote" className="w-full p-2 border rounded-md bg-amber-50 text-sm font-mono border-amber-300 font-bold text-amber-900" value={item.lote} onChange={e => handleItemManualChange(index, 'lote', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 sm:hidden">Qtd</label>
                    <input required type="number" placeholder="Qtd" className="w-full p-2 border rounded-md bg-white text-sm text-center font-bold" value={item.qtdEsperada} onChange={e => handleItemManualChange(index, 'qtdEsperada', e.target.value)} />
                  </div>
                  <div className="sm:col-span-1 flex justify-center pb-1">
                    <button type="button" disabled={itensManuais.length === 1} onClick={() => handleRemoverItemManual(index)} className="text-red-500 hover:text-red-700 disabled:opacity-30">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              <button type="button" onClick={handleAdicionarItemManual} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1 mt-2">
                <Plus size={16} /> Adicionar Próximo Item
              </button>
            </div>

            <div className="flex gap-2 border-t pt-4 justify-end">
              <button type="button" onClick={handleVoltarAoInicio} className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 font-bold">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow">
                <Save size={18} /> Salvar e Gerar Rótulos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXIBIÇÃO DOS PRODUTOS DA NOTA */}
      {notaAtual && (
        <div className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex justify-between items-center shadow-inner">
            <div>
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Nota em Conferência</p>
              <p className="font-mono text-slate-800 font-bold mt-1">{notaAtual}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Itens</p>
              <p className="text-2xl font-black text-slate-700">{produtos.length} <span className="text-sm text-slate-400 font-bold">Tipos</span></p>
            </div>
          </div>

          <div className="grid gap-3">
            {produtos.map((prod) => {
              const valorInput = quantidadesDigitadas[prod.id] !== undefined ? quantidadesDigitadas[prod.id] : prod.qtdEsperada.toString();

              return (
                <div key={prod.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">{prod.codigo} - {prod.descricao}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <p className="text-slate-500 font-medium">
                        Lote Exigido: <span className="font-mono font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">{prod.lote || 'N/A'}</span>
                      </p>
                      <p className="text-slate-400">
                        Qtd Original da Nota: <span className="font-bold text-slate-600">{prod.qtdEsperada}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Qtd Rótulo:</label>
                      <input 
                        type="number"
                        className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={valorInput}
                        onChange={(e) => handleQtdChange(prod.id, e.target.value)}
                      />
                    </div>

                    <button 
                      onClick={() => handleImprimirEtiquetaProduto(prod.id, prod.qtdEsperada)}
                      className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold shadow hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Printer className="w-4 h-4"/> Imprimir Item
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCameraOpen && (
        <ScannerCamera 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
}