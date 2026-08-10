import { Module } from '@nestjs/common';
import { NfeModule } from './modules/nfe/nfe.module';
import { PalletModule } from './modules/pallet/pallet.module';

@Module({
  imports: [NfeModule, PalletModule],
})
export class AppModule {}