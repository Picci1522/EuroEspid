export interface ProdutoBD {
    id: string;
    codigo: string;
    descricao: string;
    qtdEsperada: number;
    qtdConferida: number;
    lote?: string;
  }
  
  export interface NotaFiscalBD {
    chave: string;
    numero: string;
    destinatario: string;
    transportadora: string;
    status: 'AGUARDANDO' | 'EM_CONFERENCIA' | 'CONFERIDO' | 'EXPEDIDO';
    produtos: ProdutoBD[];
  }
  
  export const tabelaNotasFiscais: Record<string, NotaFiscalBD> = {
    "452608000190": { // <-- Esta é a chave de teste que vamos usar!
      chave: "452608000190",
      numero: "NF-10452",
      destinatario: "EuroEspid Distribuidora LTDA",
      transportadora: "Alfa Transportes",
      status: "AGUARDANDO",
      produtos: [
        { id: '1', codigo: 'PRD-001', descricao: 'Óleo Lubrificante 5W40', qtdEsperada: 5, qtdConferida: 0, lote: 'L123' },
        { id: '2', codigo: 'PRD-002', descricao: 'Filtro de Ar Motor', qtdEsperada: 2, qtdConferida: 0 },
        { id: '3', codigo: 'PRD-003', descricao: 'Aditivo Radiador', qtdEsperada: 10, qtdConferida: 0, lote: 'L456' },
      ]
    }
  };
  
  export const tabelaHistorico: any[] = [];