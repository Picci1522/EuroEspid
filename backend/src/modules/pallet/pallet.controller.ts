import { Body, Controller, Param, Post } from '@nestjs/common';
import { PalletEngine, EstrategiaSeparacao } from './pallet.service';

@Controller('pallets')
export class PalletController {
  constructor(private readonly palletEngine: PalletEngine) {}

  /**
   * Teste rápido: POST /pallets/montar/:nfeId
   * Body opcional: { "estrategia": "FEFO", "capacidadePorPallet": 40 }
   */
  @Post('montar/:nfeId')
  montar(
    @Param('nfeId') nfeId: string,
    @Body() body: { estrategia?: EstrategiaSeparacao; capacidadePorPallet?: number },
  ) {
    return this.palletEngine.montarPalletsParaNfe(nfeId, body);
  }
}