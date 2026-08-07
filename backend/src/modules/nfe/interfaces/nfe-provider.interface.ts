/**
 * Contrato que TODO provider de NF-e precisa implementar.
 *
 * Isso é o que permite plugar XML local, SEFAZ, Focus NFe, Nuvem Fiscal
 * e Tecnospeed sem NUNCA alterar o NfeService ou qualquer tela — só se
 * registra um novo provider aqui e no NfeProviderFactory.
 */
export interface NfeItemDto {
  codigoProduto: string;
  descricaoProduto: string;
  lote: string;
  quantidade: number;
  unidade: string;
  dataFabricacao?: Date;
  dataValidade?: Date;
}

export interface NfeConsultaResult {
  chaveNfe: string;
  numeroNf: string;
  dataEmissao: Date;
  cliente: { nome: string; cnpj: string };
  transportadora?: { nome: string; cnpj: string };
  itens: NfeItemDto[];
  xmlRaw: string;
}

export interface INfeProvider {
  /** Identificador único do provider — usado no campo `origem` da NF-e. */
  readonly nome: string;

  /**
   * Recebe a chave de 44 dígitos da NF-e e devolve os dados já normalizados.
   * Cada provider decide COMO buscar (XML em disco, API REST externa etc.);
   * quem chama nunca sabe qual provider está por trás.
   */
  consultarPorChave(chaveNfe: string): Promise<NfeConsultaResult>;
}
