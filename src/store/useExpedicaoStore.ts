import { create } from 'zustand';

export type ProdutoNF = {
  id: string;
  codigo: string;
  descricao: string;
  qtdEsperada: number;
  qtdConferida: number;
  lote?: string;
};

interface ExpedicaoState {
  notaAtual: string | null;
  produtos: ProdutoNF[];
  erro: string | null;
  iniciarConferencia: (chaveNfe: string) => Promise<void>;
  biparProduto: (idProduto: string) => Promise<void>;
}

const API_URL = '/api';

export const useExpedicaoStore = create<ExpedicaoState>((set, get) => ({
  notaAtual: null,
  produtos: [],
  erro: null,
  
  iniciarConferencia: async (chaveNfe) => {
    set({ erro: null });
    try {
      const resposta = await fetch(`${API_URL}/nfe/${chaveNfe}`);
      if (!resposta.ok) {
        alert('Nota não encontrada!');
        throw new Error('Nota Fiscal não encontrada');
      }
      
      const dados = await resposta.json();
      set({ notaAtual: dados.chave, produtos: dados.produtos });
    } catch (err: any) {
      set({ erro: err.message });
    }
  },

  biparProduto: async (idProduto) => {
    const { notaAtual } = get();
    if (!notaAtual) return;

    try {
      const resposta = await fetch(`${API_URL}/conferencia/bipar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: notaAtual, produtoId: idProduto })
      });

      if (!resposta.ok) {
        const erroDados = await resposta.json();
        alert(erroDados.erro);
        return;
      }

      const dados = await resposta.json();
      
      set((state) => ({
        produtos: state.produtos.map((prod) => 
          prod.id === idProduto ? { ...prod, qtdConferida: dados.produto.qtdConferida } : prod
        )
      }));
    } catch (err) {
      console.error('Erro ao bipar:', err);
    }
  }
}));