// backend/src/modules/engine-config/engine-config-prompts.controller.ts
// Step 7.2: Read-only prompt visibility endpoints

import { Controller, Get } from '@nestjs/common';

@Controller('v1/admin/prompts')
export class EngineConfigPromptsController {
  /**
   * GET /v1/admin/prompts/micro-feedback
   * Returns read-only list of micro feedback messages by score band
   */
  @Get('micro-feedback')
  getMicroFeedback() {
    // Hard-coded micro feedback messages from AiScoringService.buildMicroFeedback
    return {
      ok: true,
      feedback: [
        {
          scoreRange: '92-100',
          rarity: 'S+',
          message: 'Brilliant tension and clarity here. This is the kind of line that can shift the whole vibe.',
        },
        {
          scoreRange: '84-91',
          rarity: 'S',
          message: 'Strong message with attractive energy. A tiny bit more specificity could make it killer.',
        },
        {
          scoreRange: '72-83',
          rarity: 'A',
          message: 'Good message. You're on the right track – a bit more playfulness or detail would level this up.',
        },
        {
          scoreRange: '58-71',
          rarity: 'B',
          message: 'Decent message. Try adding more personality or a specific detail to make it stand out.',
        },
        {
          scoreRange: '0-57',
          rarity: 'C',
          message: 'Feels too short and low-effort. Give the other side a bit more to work with.',
        },
      ],
    };
  }

  /**
   * GET /v1/admin/prompts/openings
   * Returns read-only list of opening templates
   */
  @Get('openings')
  getOpeningTemplates() {
    // Import opening templates registry
    const { OPENING_TEMPLATES } = require('../ai-engine/registries/opening-templates.registry');
    
    const templates = Object.values(OPENING_TEMPLATES).map((t: any) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      template: t.template,
      variables: t.variables,
      compatibleStyles: t.compatibleStyles,
      defaultEnergy: t.defaultEnergy,
      defaultCuriosity: t.defaultCuriosity,
    }));

    return {
      ok: true,
      templates,
    };
  }
}

