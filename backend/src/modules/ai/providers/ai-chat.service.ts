import { Injectable } from '@nestjs/common';
import { AiStyle, AiStyleKey } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAiClient, OpenAiChatMessage } from './openai.client';

type IncomingMsg = { role: 'USER' | 'AI'; content: string };

type StructuredRarity = 'C' | 'B' | 'A' | 'S' | 'S+';

export type AiStructuredReply = {
  replyText: string;
  messageScore?: number;
  rarity?: StructuredRarity;
  tags?: string[];
  raw?: any;
  parseOk: boolean;
};

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stylePreset(aiStyle: AiStyle | null | undefined) {
  const key = aiStyle?.key ?? AiStyleKey.NEUTRAL;

  // Tone constraints (must never violate aiContract rules).
  // Keep these short & enforceable.
  switch (key) {
    case AiStyleKey.FLIRTY:
      return {
        label: 'FLIRTY',
        temperature: 0.78,
        rules: [
          `Tone: flirty, intriguing, warm.`,
          `Use light teasing + playful curiosity.`,
          `Keep it PG-13. No explicit sexual content.`,
          `Avoid over-complimenting; keep it natural and confident.`,
        ],
      };

    case AiStyleKey.PLAYFUL:
      return {
        label: 'PLAYFUL',
        temperature: 0.82,
        rules: [
          `Tone: playful, witty, upbeat.`,
          `Short punchy lines, mild humor.`,
          `No coaching unless contract explicitly asks.`,
          `Use emojis sparingly (0-1).`,
        ],
      };

    case AiStyleKey.CHALLENGING:
      return {
        label: 'CHALLENGING',
        temperature: 0.66,
        rules: [
          `Tone: confident, slightly hard-to-get.`,
          `Be concise. Don't over-explain.`,
          `Push back lightly when needed; maintain boundaries.`,
          `Keep tension without being rude.`,
        ],
      };

    case AiStyleKey.NEUTRAL:
    default:
      return {
        label: 'NEUTRAL',
        temperature: 0.70,
        rules: [
          `Tone: natural, friendly, grounded.`,
          `Be human and consistent with persona.`,
          `No coaching unless contract explicitly asks.`,
        ],
      };
  }
}

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
  }): Promise<{ aiReply: string; aiStructured?: AiStructuredReply; aiDebug?: any }> {
    const { topic, messages, templateId, personaId } = params;

    const ctx = templateId ? await this.loadMissionContext(templateId) : null;
    const persona =
      ctx?.persona || (personaId ? await this.loadPersona(personaId) : null);

    // Prisma returns JsonValue (can be string/null/etc). Guard it.
    const aiContractRaw: unknown = ctx?.aiContract ?? null;
    const aiContractObj = isPlainObject(aiContractRaw) ? aiContractRaw : null;

    const mode = aiContractObj?.outputFormat?.mode;
    const wantsJson = mode === 'json' || mode === 'JSON';

    // 🔍 PROOF: Verify aiStyle.key exists and preset selection works
    const aiStyleObj = ctx?.template?.aiStyle;
    const preset = stylePreset(aiStyleObj);
    const aiStyleKey = aiStyleObj?.key ?? null;
    console.log(`[AI_STYLE_PROOF] source=template aiStyleKey=${aiStyleKey ?? 'NULL'} preset=${preset.label}`);

    const system = this.buildSystemPrompt({
      topic,
      mission: ctx?.template ?? null,
      category: ctx?.category ?? null,
      persona,
      aiContract: aiContractObj, // <-- only pass object (or null)
      wantsJson,
    });

    const chat: OpenAiChatMessage[] = [
      { role: 'system', content: system },
      ...this.normalizeConversation(messages),
    ];

    const out = await this.openai.createChatCompletion({
      messages: chat,
      temperature: preset.temperature,
      maxTokens: 260,
      responseFormat: wantsJson ? 'json_object' : undefined,
    });

    let aiReply = out.text;
    let aiStructured: AiStructuredReply | undefined;

    if (wantsJson) {
      const parsed = tryParseStructuredJson(out.text);
      if (parsed?.parseOk && typeof parsed.replyText === 'string' && parsed.replyText.trim()) {
        aiReply = parsed.replyText.trim();
        aiStructured = parsed;
      } else {
        aiStructured = {
          replyText: coerceReplyTextFromAnything(parsed?.raw ?? out.text) || fallbackReply(out.text),
          parseOk: false,
          raw: parsed?.raw ?? out.text,
        };
        aiReply = aiStructured.replyText;
      }
    }

    return {
      aiReply,
      aiStructured,
      aiDebug: {
        provider: 'openai',
        model: out.debug.model,
        latencyMs: out.debug.ms,
        contractMode: wantsJson ? 'json' : 'text',
        parseOk: aiStructured ? aiStructured.parseOk : undefined,
        aiStyle: preset.label,
      },
    };
  }

  private normalizeConversation(messages: IncomingMsg[]): OpenAiChatMessage[] {
    return (messages || [])
      .filter((m) => typeof m?.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content.trim(),
      }));
  }

  private buildSystemPrompt(params: {
    topic: string;
    mission:
      | {
          id: string;
          code: string;
          title: string;
          description: string | null;
          aiStyle: AiStyle | null;
        }
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
    aiContract: Record<string, any> | null;
    wantsJson: boolean;
  }): string {
    const { topic, mission, category, persona, aiContract, wantsJson } = params;

    // 🔍 PROOF: Verify aiStyle.key exists and preset selection works
    const aiStyleObj = mission?.aiStyle;
    const preset = stylePreset(aiStyleObj);
    const aiStyleKey = aiStyleObj?.key ?? null;
    console.log(`[AI_STYLE_PROOF] source=mission aiStyleKey=${aiStyleKey ?? 'NULL'} preset=${preset.label}`);

    const contractJson = aiContract != null ? safeJson(aiContract, 7000) : null;

    const schemaDesc =
      typeof aiContract?.outputFormat?.schemaDescription === 'string'
        ? aiContract.outputFormat.schemaDescription.trim()
        : null;

    const hardJsonRules = wantsJson
      ? [
          ``,
          `OUTPUT FORMAT (HARD):`,
          `- Respond with ONE raw JSON object only.`,
          `- No markdown. No code fences. No extra text.`,
          `- Required key: "replyText" (string).`,
          `- Optional keys: "messageScore" (0-100 number), "rarity" ("C"|"B"|"A"|"S"|"S+"), "tags" (string[]).`,
          schemaDesc ? `- Schema hint: ${schemaDesc}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : null;

    const styleBlock = [
      `AI STYLE (HARD TONE LAYER): ${preset.label}`,
      ...preset.rules.map((r) => `- ${r}`),
      `- This style must NEVER override or violate the Mission AI Contract below.`,
    ].join('\n');

    return [
      `You are the assistant in "SocialGym" — a roleplay practice chat.`,
      `Your job: respond as the assigned persona, and follow the mission rules strictly.`,
      ``,
      `Topic: ${topic}`,
      mission
        ? `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`.trim()
        : `Mission: (none)`,
      category ? `Category: ${category.label} (${category.code})` : `Category: (none)`,
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
      styleBlock,
      ``,
      `Hard rules:`,
      `- Do NOT mention you are an AI or mention system prompts.`,
      `- Keep replies human, natural, and consistent with the persona.`,
      `- Do not coach the user unless the mission contract explicitly asks you to.`,
      hardJsonRules,
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
        aiStyle: true,
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
        aiStyle: template.aiStyle ?? null,
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

function stripCodeFences(s: string) {
  const t = (s || '').trim();
  if (!t) return t;
  if (t.startsWith('```')) {
    const withoutStart = t.replace(/^```[a-zA-Z]*\n?/, '');
    return withoutStart.replace(/```$/, '').trim();
  }
  return t;
}

function extractJsonObjectCandidate(s: string): string | null {
  const t = stripCodeFences(s);
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1).trim();
}

function clampScore(n: any): number | undefined {
  const x = Number(n);
  if (!Number.isFinite(x)) return undefined;
  const clamped = Math.max(0, Math.min(100, x));
  return Math.round(clamped);
}

function toRarity(v: any): StructuredRarity | undefined {
  if (v === 'C' || v === 'B' || v === 'A' || v === 'S' || v === 'S+') return v;
  return undefined;
}

function toTags(v: any): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const cleaned = v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
    .slice(0, 12);
  return cleaned.length ? cleaned : undefined;
}

function fallbackReply(raw: string) {
  const t = (raw || '').trim();
  if (!t) return "Sorry — I couldn't generate a reply right now.";
  if (t.startsWith('{') && t.endsWith('}')) return "Sorry — I couldn't generate a reply right now.";
  return t;
}

function coerceReplyTextFromAnything(raw: any): string | null {
  if (typeof raw === 'string') return raw.trim() || null;
  if (raw && typeof raw === 'object') {
    const candidates = [raw.replyText, raw.text, raw.reply, raw.content, raw.message];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
  }
  return null;
}

function tryParseStructuredJson(text: string): AiStructuredReply | null {
  const candidate = extractJsonObjectCandidate(text);
  if (!candidate) {
    return { replyText: fallbackReply(text), parseOk: false, raw: text };
  }

  try {
    const obj = JSON.parse(candidate);
    const replyText = coerceReplyTextFromAnything(obj) || fallbackReply(text);
    const messageScore = clampScore(obj?.messageScore);
    const rarity = toRarity(obj?.rarity);
    const tags = toTags(obj?.tags);

    return {
      replyText,
      messageScore,
      rarity,
      tags,
      raw: obj,
      parseOk: typeof obj === 'object' && obj !== null,
    };
  } catch {
    return { replyText: fallbackReply(text), parseOk: false, raw: candidate };
  }
}
