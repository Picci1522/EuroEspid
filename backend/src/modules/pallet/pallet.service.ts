import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

export type EstrategiaSeparacao = 'FIFO' | 'FEFO';

interface OpcoesMontagem {
  estrategia?: EstrategiaSeparacao;
  /** Quantidade máxima (na unidade do item) que um pallet físico comporta. */
  capacidadePorPallet?: number;
}

/**
 * PalletEngine: única classe responsável por decidir COMO os itens de uma
 * NF-e viram pallets físicos. Nenhuma outra parte do sistema deve conter
 * lógica de FIFO/FEFO/GMP+ — se um dia essa regra mudar, mexe só aqui.
 */
@Injectable()
export class PalletEngine {
  private readonly CAPACIDADE_PADRAO = 40; // ex.: 40 sacas por pallet, ajustável por chamada

  constructor(private readonly prisma: PrismaService) {}

  async montarPalletsParaNfe(nfeId: string, opcoes: OpcoesMontagem = {}) {
    const estrategia = opcoes.estrategia ?? 'FEFO';
    const capacidade = opcoes.capacidadePorPallet ?? this.CAPACIDADE_PADRAO;

    const nfe = await this.prisma.nfe.findUnique({
      where: { id: nfeId },
      include: { itens: true },
    });
    if (!nfe) {
      throw new NotFoundException(`NF-e ${nfeId} não encontrada.`);
    }
    if (nfe.itens.length === 0) {
      throw new BadRequestException(`NF-e ${nfeId} não tem itens para montar pallets.`);
    }

    this.validarGMP(nfe.itens);

    const itensOrdenados = this.ordenarPorEstrategia(nfe.itens, estrategia);
    const gruposPorProduto = this.agruparPorProduto(itensOrdenados);

    return this.prisma.$transaction(async (tx) => {
      const palletsCriados = [];

      for (const [produtoId, itensDoProduto] of gruposPorProduto) {
        let palletAtual: { lote: string; quantidade: number }[] = [];
        let quantidadeNoPalletAtual = 0;

        const fecharPallet = async () => {
          if (palletAtual.length === 0) return;
          const pallet = await tx.pallet.create({
            data: {
              nfeId: nfe.id,
              clienteId: nfe.clienteId,
              status: 'MONTADO',
              itens: {
                create: palletAtual.map((it) => ({
                  produtoId,
                  lote: it.lote,
                  quantidade: it.quantidade,
                })),
              },
            },
            include: { itens: true },
          });
          palletsCriados.push(pallet);
          palletAtual = [];
          quantidadeNoPalletAtual = 0;
        };

        for (const item of itensDoProduto) {
          let restante = Number(item.quantidade);

          // Um lote pode precisar ser fisicamente dividido entre pallets
          // se ultrapassar a capacidade do pallet atual — é o "separação
          // física" e "quantidade por lote" que o documento pede.
          while (restante > 0) {
            const espacoLivre = capacidade - quantidadeNoPalletAtual;
            const quantidadeNesteLote = Math.min(espacoLivre, restante);

            palletAtual.push({ lote: item.lote, quantidade: quantidadeNesteLote });
            quantidadeNoPalletAtual += quantidadeNesteLote;
            restante -= quantidadeNesteLote;

            if (quantidadeNoPalletAtual >= capacidade) {
              await fecharPallet();
            }
          }
        }

        await fecharPallet(); // fecha o último pallet parcial do produto
      }

      return palletsCriados;
    });
  }

  /**
   * Validação GMP+: nenhum lote vencido ou sem data de validade definida
   * pode ser expedido. Regra não-negociável em nutrição animal.
   */
  private validarGMP(itens: { lote: string; validade: Date | null }[]) {
    const hoje = new Date();
    for (const item of itens) {
      if (!item.validade) {
        throw new BadRequestException(
          `Lote ${item.lote} não tem data de validade informada — bloqueado pela validação GMP+.`,
        );
      }
      if (item.validade < hoje) {
        throw new BadRequestException(
          `Lote ${item.lote} está vencido (validade ${item.validade.toISOString().slice(0, 10)}) — bloqueado pela validação GMP+.`,
        );
      }
    }
  }

  private ordenarPorEstrategia<T extends { validade: Date | null; fabricacao: Date | null }>(
    itens: T[],
    estrategia: EstrategiaSeparacao,
  ): T[] {
    const copia = [...itens];
    if (estrategia === 'FEFO') {
      // First-Expire-First-Out: lote que vence primeiro sai primeiro.
      return copia.sort((a, b) => (a.validade?.getTime() ?? 0) - (b.validade?.getTime() ?? 0));
    }
    // FIFO: lote fabricado primeiro sai primeiro.
    return copia.sort((a, b) => (a.fabricacao?.getTime() ?? 0) - (b.fabricacao?.getTime() ?? 0));
  }

  private agruparPorProduto<T extends { produtoId: string }>(itens: T[]): Map<string, T[]> {
    const grupos = new Map<string, T[]>();
    for (const item of itens) {
      const lista = grupos.get(item.produtoId) ?? [];
      lista.push(item);
      grupos.set(item.produtoId, lista);
    }
    return grupos;
  }
}