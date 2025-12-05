// FILE: backend/src/modules/ai-styles/ai-styles.controller.ts
import { Controller, Get } from '@nestjs/common';
import { AiStylesService } from './ai-styles.service'; // TS2307

@Controller('ai-styles')
export class AiStylesController {
  constructor(private readonly aiStylesService: AiStylesService) {}

  /**
   * GET /v1/ai-styles
   * Public endpoint for mobile dropdowns.
   */
  @Get()
  async list() {
    return this.aiStylesService.listActive();
  }
}
