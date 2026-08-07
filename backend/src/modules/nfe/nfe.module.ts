import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NfeService } from './nfe.service';
import { NfeController } from './nfe.controller';
import { XmlLocalProvider } from './providers/xml-local.provider';
import { FocusNfeProvider } from './providers/focus-nfe.provider';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [NfeController],
  providers: [NfeService, XmlLocalProvider, FocusNfeProvider, PrismaService],
  exports: [NfeService], // outros módulos (pallet, rastreabilidade) consomem só o service
})
export class NfeModule {}
