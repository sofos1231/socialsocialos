// FILE: backend/src/modules/ai-engine/openings.service.ts
// Step 6.3: Opening Generation Service

import { Injectable } from '@nestjs/common';
import { AiStyleKey } from '@prisma/client';
import {
  MissionConfigV1,
  MissionConfigV1Openings,
  MissionConfigV1Dynamics,
  MissionConfigV1Difficulty,
} from '../missions-admin/mission-config-v1.schema';
import {
  getOpeningTemplate,
  getOpeningTemplateForStyle,
  isValidOpeningTemplateKey,
  type OpeningTemplateKey,
} from './registries/opening-templates.registry';
import { createDefaultMoodState } from './mission-state-v1.schema';
import type { MissionMoodStateV1 } from './mission-state-v1.schema';

export interface OpeningGenerationParams {
  aiStyleKey: AiStyleKey;
  openings?: MissionConfigV1Openings | null;
  dynamics?: MissionConfigV1Dynamics | null;
  difficulty?: MissionConfigV1Difficulty | null;
  personaName?: string | null;
}

export interface OpeningGenerationResult {
  openingText: string;
  templateKey: OpeningTemplateKey;
  initialMood: MissionMoodStateV1;
}

@Injectable()
export class OpeningsService {
  /**
   * Step 6.3: Generate opening message based on style, dynamics, difficulty, and openings config
   */
  generateOpening(params: OpeningGenerationParams): OpeningGenerationResult {
    const {
      aiStyleKey,
      openings,
      dynamics,
      difficulty,
      personaName,
    } = params;

    // Step 1: Select opening template
    const templateKey = this.selectOpeningTemplate(aiStyleKey, openings);
    const template = getOpeningTemplate(templateKey);

    // Step 2: Initialize mood state from personaInitMood
    const personaInitMood = openings?.personaInitMood ?? null;
    const initialMood = createDefaultMoodState(personaInitMood);

    // Step 3: Build opening text with dynamics and difficulty injection
    const openingText = this.buildOpeningText(
      template,
      {
        aiStyleKey,
        dynamics: dynamics ?? null,
        difficulty: difficulty ?? null,
        personaName: personaName ?? null,
        energy: openings?.energy ?? template.defaultEnergy,
        curiosity: openings?.curiosity ?? template.defaultCuriosity,
      },
    );

    return {
      openingText,
      templateKey,
      initialMood,
    };
  }

  /**
   * Select opening template based on aiStyleKey and openings.style
   */
  private selectOpeningTemplate(
    aiStyleKey: AiStyleKey,
    openings?: MissionConfigV1Openings | null,
  ): OpeningTemplateKey {
    // If openerTemplateKey is explicitly set, use it
    if (openings?.openerTemplateKey && isValidOpeningTemplateKey(openings.openerTemplateKey)) {
      return openings.openerTemplateKey;
    }

    // Otherwise, select based on style and openings.style
    return getOpeningTemplateForStyle(aiStyleKey, openings?.style ?? null).key;
  }

  /**
   * Build opening text by injecting dynamics and difficulty into template
   */
  private buildOpeningText(
    template: { template: string; variables: string[] },
    params: {
      aiStyleKey: AiStyleKey;
      dynamics: MissionConfigV1Dynamics | null;
      difficulty: MissionConfigV1Difficulty | null;
      personaName: string | null;
      energy: number;
      curiosity: number;
    },
  ): string {
    let text = template.template;

    // Inject style-based content
    text = this.injectStyleContent(text, params.aiStyleKey, params.personaName);

    // Inject dynamics-based content
    if (params.dynamics) {
      text = this.injectDynamicsContent(text, params.dynamics, params.energy, params.curiosity);
    }

    // Inject difficulty-based content
    if (params.difficulty) {
      text = this.injectDifficultyContent(text, params.difficulty);
    }

    // Replace template variables with generated content
    text = this.replaceTemplateVariables(text, template.variables, params);

    return text.trim();
  }

  /**
   * Inject style-based content into opening
   */
  private injectStyleContent(
    text: string,
    aiStyleKey: AiStyleKey,
    personaName: string | null,
  ): string {
    const name = personaName ? `${personaName}` : 'I';

    const styleGreetings: Record<AiStyleKey, string[]> = {
      [AiStyleKey.FLIRTY]: ['Hey!', 'Hi there!', 'Hey you!'],
      [AiStyleKey.PLAYFUL]: ['Hey!', 'Hi!', 'Hey hey!'],
      [AiStyleKey.CHALLENGING]: ['Hey.', 'Hi.', 'Hey there.'],
      [AiStyleKey.NEUTRAL]: ['Hey!', 'Hi!', 'Hello!'],
      [AiStyleKey.WARM]: ['Hi!', 'Hey!', 'Hello!'],
      [AiStyleKey.COLD]: ['Hey.', 'Hi.', 'Hello.'],
      [AiStyleKey.SHY]: ['Hi...', 'Hey...', 'Hello...'],
      [AiStyleKey.DIRECT]: ['Hey.', 'Hi.', 'Hello.'],
      [AiStyleKey.JUDGMENTAL]: ['Hey.', 'Hi.', 'Hello.'],
      [AiStyleKey.CHAOTIC]: ['Hey!', 'Hi!', 'Heyo!'],
    };

    const greetings = styleGreetings[aiStyleKey] || styleGreetings[AiStyleKey.NEUTRAL];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    return text.replace(/\{\{greeting\}\}/g, greeting);
  }

  /**
   * Inject dynamics-based content (emoji density, pace, flirtiveness)
   */
  private injectDynamicsContent(
    text: string,
    dynamics: MissionConfigV1Dynamics,
    energy: number,
    curiosity: number,
  ): string {
    // Emoji density: Add emojis based on dynamics.emojiDensity
    const emojiDensity = dynamics.emojiDensity ?? 30;
    if (emojiDensity >= 60 && !text.includes('😊') && !text.includes('😅') && !text.includes('😏')) {
      // High emoji density - add emoji
      const emojis = ['😊', '😅', '😏', '👋', '✨'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      text = text.replace(/([!?.])/g, `$1 ${emoji}`);
    } else if (emojiDensity <= 20) {
      // Low emoji density - remove emojis
      text = text.replace(/[😊😅😏👋✨]/g, '');
    }

    // Pace: Adjust punctuation based on dynamics.pace
    const pace = dynamics.pace ?? 50;
    if (pace >= 70) {
      // Fast pace - use exclamation marks
      text = text.replace(/\.$/g, '!');
    } else if (pace <= 30) {
      // Slow pace - use periods, add ellipsis
      text = text.replace(/!$/g, '.');
      if (!text.includes('...')) {
        text = text.replace(/([^.])(\.)$/, '$1...');
      }
    }

    // Flirtiveness: Adjust tone based on dynamics.flirtiveness
    const flirtiveness = dynamics.flirtiveness ?? 40;
    if (flirtiveness >= 70) {
      // High flirt - add playful elements
      if (!text.includes('😏') && !text.includes('😊')) {
        text = text.replace(/([!?.])/g, '$1 😏');
      }
    }

    return text;
  }

  /**
   * Inject difficulty-based content (directness, ambiguity tolerance)
   */
  private injectDifficultyContent(
    text: string,
    difficulty: MissionConfigV1Difficulty,
  ): string {
    const strictness = difficulty.strictness ?? 50;
    const ambiguityTolerance = difficulty.ambiguityTolerance ?? 50;

    // Strictness: Higher strictness = more direct, less ambiguous
    if (strictness >= 70) {
      // High strictness - be more direct, remove uncertainty
      text = text.replace(/\b(maybe|perhaps|I guess|I think)\b/gi, '');
      text = text.replace(/\?/g, '.');
    } else if (strictness <= 30) {
      // Low strictness - allow more ambiguity
      if (!text.includes('?')) {
        text = text.replace(/\.$/, '?');
      }
    }

    // Ambiguity tolerance: Lower tolerance = be clearer
    if (ambiguityTolerance <= 30) {
      // Low tolerance - be very clear
      text = text.replace(/\b(kind of|sort of|maybe|perhaps)\b/gi, '');
    }

    return text;
  }

  /**
   * Replace template variables with generated content
   */
  private replaceTemplateVariables(
    text: string,
    variables: string[],
    params: {
      aiStyleKey: AiStyleKey;
      dynamics: MissionConfigV1Dynamics | null;
      difficulty: MissionConfigV1Difficulty | null;
      personaName: string | null;
      energy: number;
      curiosity: number;
    },
  ): string {
    // Generate content for each variable
    const variableContent: Record<string, string> = {};

    if (variables.includes('hook')) {
      variableContent.hook = this.generateHook(params);
    }
    if (variables.includes('question')) {
      variableContent.question = this.generateQuestion(params);
    }
    if (variables.includes('compliment')) {
      variableContent.compliment = this.generateCompliment(params);
    }
    if (variables.includes('followup')) {
      variableContent.followup = this.generateFollowup(params);
    }
    if (variables.includes('observation')) {
      variableContent.observation = this.generateObservation(params);
    }
    if (variables.includes('statement')) {
      variableContent.statement = this.generateStatement(params);
    }
    if (variables.includes('tease')) {
      variableContent.tease = this.generateTease(params);
    }

    // Replace variables in template
    for (const [key, value] of Object.entries(variableContent)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return text;
  }

  private generateHook(params: any): string {
    const hooks = [
      'What made you swipe?',
      'Tell me something interesting',
      'What\'s your story?',
      'What caught your eye?',
    ];
    return hooks[Math.floor(Math.random() * hooks.length)];
  }

  private generateQuestion(params: any): string {
    const questions = [
      'What brings you here?',
      'What are you up to?',
      'How\'s your day going?',
      'What\'s on your mind?',
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  private generateCompliment(params: any): string {
    const compliments = [
      'Nice profile',
      'You seem interesting',
      'I like your vibe',
      'You caught my attention',
    ];
    return compliments[Math.floor(Math.random() * compliments.length)];
  }

  private generateFollowup(params: any): string {
    const followups = [
      'What\'s your story?',
      'Tell me more',
      'What are you into?',
      'What makes you tick?',
    ];
    return followups[Math.floor(Math.random() * followups.length)];
  }

  private generateObservation(params: any): string {
    const observations = [
      'I noticed',
      'Something about you',
      'You seem',
      'I get the sense',
    ];
    return observations[Math.floor(Math.random() * observations.length)];
  }

  private generateStatement(params: any): string {
    const statements = [
      'I don\'t usually do this',
      'You seem different',
      'I\'m intrigued',
      'This is interesting',
    ];
    return statements[Math.floor(Math.random() * statements.length)];
  }

  private generateTease(params: any): string {
    const teases = [
      'You\'re mysterious',
      'I\'m curious about you',
      'You\'re intriguing',
      'Something about you',
    ];
    return teases[Math.floor(Math.random() * teases.length)];
  }
}

