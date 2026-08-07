import { Module } from '@nestjs/common';
import { NfeModule } from './modules/nfe/nfe.module';

@Module({
  imports: [NfeModule],
})
export class AppModule {}
