import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { INfeProvider, NfeConsultaResult } from '../interfaces/nfe-provider.interface';

/**
 * Provider real para a API da Focus NFe. Mesma interface do XmlLocalProvider —
 * o NfeService não sabe (nem precisa saber) qual dos dois está sendo usado.
 *
 * Preencher FOCUS_NFE_TOKEN e FOCUS_NFE_BASE_URL no .env antes de habilitar.
 */
@Injectable()
export class FocusNfeProvider implements INfeProvider {
  readonly nome = 'focus_nfe';

  constructor(private readonly http: HttpService) {}

  async consultarPorChave(chaveNfe: string): Promise<NfeConsultaResult> {
    const baseUrl = process.env.FOCUS_NFE_BASE_URL;
    const token = process.env.FOCUS_NFE_TOKEN;

    const { data } = await firstValueFrom(
      this.http.get(`${baseUrl}/v2/nfe/${chaveNfe}`, {
        auth: { username: token ?? '', password: '' },
      }),
    );

    // Mapeamento do payload da Focus NFe para o formato interno comum.
    // Estrutura exata a validar com a documentação da Focus antes de ligar em produção.
    return {
      chaveNfe: data.chave_nfe,
      numeroNf: data.numero,
      dataEmissao: new Date(data.data_emissao),
      cliente: { nome: data.destinatario?.nome, cnpj: data.destinatario?.cnpj },
      transportadora: data.transportadora
        ? { nome: data.transportadora.nome, cnpj: data.transportadora.cnpj }
        : undefined,
      itens: (data.itens ?? []).map((i: any) => ({
        codigoProduto: i.codigo,
        descricaoProduto: i.descricao,
        lote: i.numero_lote,
        quantidade: Number(i.quantidade_comercial),
        unidade: i.unidade_comercial,
        dataFabricacao: i.data_fabricacao ? new Date(i.data_fabricacao) : undefined,
        dataValidade: i.data_validade ? new Date(i.data_validade) : undefined,
      })),
      xmlRaw: data.xml ?? '',
    };
  }
}
