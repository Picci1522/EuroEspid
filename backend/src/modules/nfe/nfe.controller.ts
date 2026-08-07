import { Body, Controller, Post } from '@nestjs/common';
import { NfeService } from './nfe.service';

@Controller('nfe')
export class NfeController {
  constructor(private readonly nfeService: NfeService) {}

  /**
   * Teste rápido: POST /nfe/xml com { "xml": "<conteúdo do XML>" }
   */
  @Post('xml')
  importarXml(@Body('xml') xml: string) {
    return this.nfeService.importarPorXml(xml);
  }
}
