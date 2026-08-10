import { Module } from '@nestjs/common';
import { PalletEngine } from './pallet.service';
import { PalletController } from './pallet.controller';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [PalletController],
  providers: [PalletEngine, PrismaService],
  exports: [PalletEngine], // etiquetas/rastreabilidade (Fase 3) vão consumir isso
})
export class PalletModule {}