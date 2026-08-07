import { Injectable } from '@nestjs/common';
import { INfeProvider, NfeConsultaResult } from '../interfaces/nfe-provider.interface';
import { XMLParser } from 'fast-xml-parser';

/**
 * Provider "modo rascunho": lê um XML de NF-e já em mãos (upload manual),
 * sem depender de nenhuma API externa. É o mesmo caso de uso que hoje o
 * index.html não tem — mantém funcionando offline.
 */
@Injectable()
export class XmlLocalProvider implements INfeProvider {
  readonly nome = 'xml_local';

  async consultarPorChave(chaveNfe: string): Promise<NfeConsultaResult> {
    // Nesta fase o XML é recebido via endpoint de upload (não pela chave).
    // Este método existe para satisfazer a interface comum; a rota de
    // upload chama parseXml() diretamente. Ver NfeController (Fase 2).
    throw new Error(
      `XmlLocalProvider não busca por chave (${chaveNfe}) — use o endpoint de upload de XML.`,
    );
  }

  parseXml(xmlContent: string): NfeConsultaResult {
    // parseTagValue/parseAttributeValue: false evita que o parser converta
    // sozinho valores como CNPJ, número de NF ou chave de acesso para número
    // (o que quebra o Prisma, que espera String nesses campos).
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      parseAttributeValue: false,
    });
    const parsed = parser.parse(xmlContent);

    const nfe = parsed?.nfeProc?.NFe?.infNFe ?? parsed?.NFe?.infNFe;
    if (!nfe) {
      throw new Error('XML de NF-e inválido ou fora do padrão esperado pela SEFAZ.');
    }

    const det = Array.isArray(nfe.det) ? nfe.det : [nfe.det];

    return {
      chaveNfe: nfe['@_Id']?.replace('NFe', '') ?? '',
      numeroNf: nfe.ide?.nNF ?? '',
      dataEmissao: new Date(nfe.ide?.dhEmi ?? nfe.ide?.dEmi),
      cliente: {
        nome: nfe.dest?.xNome ?? '',
        cnpj: nfe.dest?.CNPJ ?? nfe.dest?.CPF ?? '',
      },
      transportadora: nfe.transp?.transporta
        ? { nome: nfe.transp.transporta.xNome, cnpj: nfe.transp.transporta.CNPJ }
        : undefined,
      itens: det.map((d: any) => ({
        codigoProduto: d.prod?.cProd ?? '',
        descricaoProduto: d.prod?.xProd ?? '',
        lote: d.prod?.rastro?.nLote ?? '',
        quantidade: Number(d.prod?.qCom ?? 0),
        unidade: d.prod?.uCom ?? '',
        dataFabricacao: d.prod?.rastro?.dFab ? new Date(d.prod.rastro.dFab) : undefined,
        dataValidade: d.prod?.rastro?.dVal ? new Date(d.prod.rastro.dVal) : undefined,
      })),
      xmlRaw: xmlContent,
    };
  }
}