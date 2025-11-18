import { Controller, Get } from '@nestjs/common';
import { PersonasService } from './personas.service';

@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get()
  async list() {
    // later: return all active personas
    return this.personasService.listAll();
  }
}
