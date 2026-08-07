import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { XmlLocalProvider } from './providers/xml-local.provider';
import { FocusNfeProvider } from './providers/focus-nfe.provider';
import { INfeProvider, NfeConsultaResult } from './interfaces/nfe-provider.interface';

export type NfeProviderName = 'xml_local' | 'focus_nfe' | 'nuvem_fiscal' | 'tecnospeed' | 'sefaz';

/**
 * Ponto único de entrada para tudo relacionado a NF-e.
 *
 * Regra de ouro do documento: "nunca consumir API diretamente na tela" —
 * é por isso que este service existe. As telas (ou controllers REST) só
 * conversam com o NfeService; ele decide qual provider usar e como salvar.
 */
@Injectable()
export class NfeService {
  private readonly providers: Record<string, INfeProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly xmlLocalProvider: XmlLocalProvider,
    private readonly focusNfeProvider: FocusNfeProvider,
    // nuvemFiscalProvider e tecnospeedProvider entram aqui na Fase 6,
    // seguindo exatamente o mesmo padrão — zero mudança no resto da classe.
  ) {
    this.providers = {
      xml_local: this.xmlLocalProvider,
      focus_nfe: this.focusNfeProvider,
    };
  }

  private resolveProvider(origem: NfeProviderName): INfeProvider {
    const provider = this.providers[origem];
    if (!provider) {
      throw new BadRequestException(`Provider de NF-e "${origem}" não está configurado.`);
    }
    return provider;
  }

  async importarPorChave(chaveNfe: string, origem: NfeProviderName) {
    const provider = this.resolveProvider(origem);
    const dados = await provider.consultarPorChave(chaveNfe);
    return this.persistir(dados, origem);
  }

  async importarPorXml(xmlContent: string) {
    const dados = this.xmlLocalProvider.parseXml(xmlContent);
    return this.persistir(dados, 'xml_local');
  }

  private async persistir(dados: NfeConsultaResult, origem: string) {
    const existente = await this.prisma.nfe.findUnique({ where: { chaveNfe: dados.chaveNfe } });
    if (existente) {
      throw new BadRequestException(`NF-e ${dados.chaveNfe} já foi importada anteriormente.`);
    }

    const cliente = await this.prisma.cliente.upsert({
      where: { cnpj: dados.cliente.cnpj },
      update: { nome: dados.cliente.nome },
      create: { nome: dados.cliente.nome, cnpj: dados.cliente.cnpj },
    });

    return this.prisma.nfe.create({
      data: {
        chaveNfe: dados.chaveNfe,
        numeroNf: dados.numeroNf,
        dataEmissao: dados.dataEmissao,
        origem,
        xmlRaw: dados.xmlRaw,
        clienteId: cliente.id,
        itens: {
          create: await Promise.all(
            dados.itens.map(async (item) => {
              const produto = await this.prisma.produto.upsert({
                where: { codigoProduto: item.codigoProduto },
                update: { descricao: item.descricaoProduto },
                create: { codigoProduto: item.codigoProduto, descricao: item.descricaoProduto },
              });
              return {
                produtoId: produto.id,
                codigoProduto: item.codigoProduto,
                lote: item.lote,
                quantidade: item.quantidade,
                unidade: item.unidade,
                fabricacao: item.dataFabricacao,
                validade: item.dataValidade,
              };
            }),
          ),
        },
      },
      include: { itens: true },
    });
  }
}
