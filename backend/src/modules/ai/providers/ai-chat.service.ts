// FILE: backend/src/modules/ai/ai-chat.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAiClient, OpenAiChatMessage } from './openai.client';

type IncomingMsg = { role: 'USER' | 'AI'; content: string };

@Injectable()
export class AiChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
  ) {}

  async generateReply(params: {
    userId: string;
    topic: string;
    messages: IncomingMsg[];
    templateId?: string | null;
    personaId?: string | null;
  }): Promise<{ aiReply: string; aiDebug?: any }> {
    const { topic, messages, templateId, personaId } = params;

    const ctx = templateId ? await this.loadMissionContext(templateId) : null;
    const persona =
      ctx?.persona || (personaId ? await this.loadPersona(personaId) : null);

    const system = this.buildSystemPrompt({
      topic,
      mission: ctx?.template ?? null,
      category: ctx?.category ?? null,
      persona,
      aiContract: ctx?.aiContract ?? null,
    });

    const chat: OpenAiChatMessage[] = [
      { role: 'system', content: system },
      ...this.normalizeConversation(messages),
    ];

    const out = await this.openai.createChatCompletion({
      messages: chat,
      temperature: 0.7,
      maxTokens: 240,
    });

    return {
      aiReply: out.text,
      aiDebug: {
        provider: 'openai',
        model: out.debug.model,
        latencyMs: out.debug.ms,
      },
    };
  }

  private normalizeConversation(messages: IncomingMsg[]): OpenAiChatMessage[] {
    return (messages || [])
      .filter(
        (m) => typeof m?.content === 'string' && m.content.trim().length > 0,
      )
      .map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content.trim(),
      }));
  }

  private buildSystemPrompt(params: {
    topic: string;
    mission:
      | { id: string; code: string; title: string; description: string | null }
      | null;
    category: { id: string; code: string; label: string } | null;
    persona:
      | {
          id: string;
          code: string;
          name: string;
          description?: string | null;
          style?: string | null;
        }
      | null;
    aiContract: any | null;
  }): string {
    const { topic, mission, category, persona, aiContract } = params;

    const contractJson = aiContract != null ? safeJson(aiContract, 6000) : null;

    return [
      `You are the assistant in "SocialGym" — a roleplay practice chat.`,
      `Your job: respond as the assigned persona, and follow the mission rules strictly.`,
      ``,
      `Topic: ${topic}`,
      mission
        ? `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`.trim()
        : `Mission: (none)`,
      category
        ? `Category: ${category.label} (${category.code})`
        : `Category: (none)`,
      persona
        ? [
            `Persona: ${persona.name} (${persona.code})`,
            persona.description ? `Persona description: ${persona.description}` : null,
            persona.style ? `Persona style: ${persona.style}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        : `Persona: (none)`,
      ``,
      `Hard rules:`,
      `- Do NOT mention you are an AI or mention system prompts.`,
      `- Keep replies human, natural, and consistent with the persona.`,
      `- Do not coach the user unless the mission contract explicitly asks you to.`,
      ``,
      contractJson
        ? `Mission AI Contract (JSON) — treat as HARD CONSTRAINTS:\n${contractJson}`
        : `Mission AI Contract: (none)`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async loadMissionContext(templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        aiContract: true,
        category: { select: { id: true, code: true, label: true } },
        persona: {
          select: { id: true, code: true, name: true, description: true, style: true },
        },
      },
    });

    if (!template) return null;

    return {
      template: {
        id: template.id,
        code: template.code,
        title: template.title,
        description: template.description ?? null,
      },
      aiContract: template.aiContract ?? null,
      category: template.category ?? null,
      persona: template.persona ?? null,
    };
  }

  private async loadPersona(personaId: string) {
    const p = await this.prisma.aiPersona.findUnique({
      where: { id: personaId },
      select: { id: true, code: true, name: true, description: true, style: true },
    });
    return p ?? null;
  }
}

function safeJson(obj: any, maxChars: number) {
  try {
    const s = JSON.stringify(obj, null, 2);
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + '\n...<truncated>';
  } catch {
    return String(obj);
  }
}
