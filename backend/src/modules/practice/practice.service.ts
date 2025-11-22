// backend/src/modules/practice/practice.service.ts
// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards,
// plus Option B AiCore metrics (charismaIndex + traits) for every real session.

// backend/src/modules/practice/practice.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { PracticeMessageInput } from '../ai/ai.types';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { TranscriptMessage } from '../ai/ai-scoring.types';

@Injectable()
export class PracticeService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly aiScoring: AiScoringService,
    private readonly aiCore: AiCoreScoringService,
  ) {}

  /**
   * מצב טקסט רגיל – כפי שהיה עד עכשיו.
   */
  async runRealSession(userId: string, dto: any) {
    const { messages } = dto;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestException({
        code: 'PRACTICE_EMPTY',
        message: 'messages must contain at least one item',
      });
    }

    // Clean topic
    const topic = dto.topic?.trim() || 'Practice session';

    // Normalize incoming messages to PracticeMessageInput[]
    const normalizedMessages: PracticeMessageInput[] = messages.map(
      (m: any, index: number) => ({
        index,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? ''),
      }),
    );

    // Build transcript for Option B AiCore
    const transcript: TranscriptMessage[] = normalizedMessages.map((m) => ({
      sentBy: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
    }));

    const aiCoreResult = await this.aiCore.scoreSession(transcript);

    // Useful logging while wiring the loop
    console.log('[AiCore v1]', {
      userId,
      topic,
      charismaIndex: aiCoreResult.metrics.charismaIndex,
      overallScore: aiCoreResult.metrics.overallScore,
      totalMessages: aiCoreResult.metrics.totalMessages,
    });

    // Option A AI scoring engine (rarity/xp)
    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: dto.personaId ?? null,
      templateId: dto.templateId ?? null,
      messages: normalizedMessages,
    });

    // Convert AI result → SessionsService scoring format
    const messageScores = aiResult.perMessage.map((m) => m.score);

    // Let SessionsService handle DB writes + stats + wallet + AiCore persistence
    const sessionResult =
      await this.sessionsService.createScoredSessionFromScores({
        userId,
        topic,
        messageScores,
        aiCoreResult,
      });

    // Attach AI metadata to response
    return {
      ...sessionResult,
      ai: aiResult,
      aiCore: aiCoreResult,
      mode: 'text',
    };
  }

  /**
   * 7.1 – Voice Practice
   *
   * הפרונט כבר עושה speech-to-text ושולח לנו transcript אחד.
   * פה אנחנו:
   * - עושים validate שהוא לא ריק
   * - בונים הודעה אחת (או יותר) ללופ הקיים
   * - מריצים AiCore + AiScoring + SessionsService
   */
  async runVoiceSession(userId: string, dto: any) {
    const rawTranscript = dto?.transcript;

    if (
      !rawTranscript ||
      typeof rawTranscript !== 'string' ||
      rawTranscript.trim().length === 0
    ) {
      throw new BadRequestException({
        code: 'VOICE_EMPTY',
        message: 'transcript must be a non-empty string',
      });
    }

    const transcriptText = rawTranscript.trim();
    const topic = dto.topic?.trim() || 'Voice practice session';

    // MVP: מתייחסים לכל ה-transcript כהודעה אחת של המשתמש
    const normalizedMessages: PracticeMessageInput[] = [
      {
        index: 0,
        role: 'user',
        content: transcriptText,
      },
    ];

    const transcript: TranscriptMessage[] = [
      {
        sentBy: 'user',
        text: transcriptText,
      },
    ];

    const aiCoreResult = await this.aiCore.scoreSession(transcript);

    console.log('[AiCore v1 – VOICE]', {
      userId,
      topic,
      charismaIndex: aiCoreResult.metrics.charismaIndex,
      overallScore: aiCoreResult.metrics.overallScore,
      totalMessages: aiCoreResult.metrics.totalMessages,
    });

    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: null,
      templateId: null,
      messages: normalizedMessages,
    });

    const messageScores = aiResult.perMessage.map((m) => m.score);

    const sessionResult =
      await this.sessionsService.createScoredSessionFromScores({
        userId,
        topic,
        messageScores,
        aiCoreResult,
      });

    return {
      ...sessionResult,
      ai: aiResult,
      aiCore: aiCoreResult,
      mode: 'voice',
      transcript: transcriptText,
    };
  }

  /**
   * 7.3 – A vs B Practice
   *
   * - מקבלים optionA + optionB (ולפעמים prompt להקשר)
   * - נותנים ציון לשתיהן דרך AiScoring
   * - בוחרים winner
   * - בונים סשן אחד עם שתי הודעות והולכים ללופ הרגיל
   * - AiCore מקבל את הטקסט של הזוכה לניתוח עומק
   */
  async runABSession(userId: string, dto: any) {
    const optionA = dto?.optionA;
    const optionB = dto?.optionB;

    if (
      !optionA ||
      typeof optionA !== 'string' ||
      optionA.trim().length === 0
    ) {
      throw new BadRequestException({
        code: 'AB_EMPTY_A',
        message: 'optionA must be a non-empty string',
      });
    }

    if (
      !optionB ||
      typeof optionB !== 'string' ||
      optionB.trim().length === 0
    ) {
      throw new BadRequestException({
        code: 'AB_EMPTY_B',
        message: 'optionB must be a non-empty string',
      });
    }

    const topic =
      dto.topic?.trim() ||
      dto.prompt?.trim() ||
      'A vs B practice session';

    const cleanA = optionA.trim();
    const cleanB = optionB.trim();

    const normalizedMessages: PracticeMessageInput[] = [
      {
        index: 0,
        role: 'user',
        content: cleanA,
      },
      {
        index: 1,
        role: 'user',
        content: cleanB,
      },
    ];

    // נשתמש ב-AiScoring כדי לדרג את שתי התשובות
    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: null,
      templateId: null,
      messages: normalizedMessages,
    });

    const scores = aiResult.perMessage.map((m) => m.score);
    const scoreA = scores[0] ?? 0;
    const scoreB = scores[1] ?? 0;

    const winnerIndex = scoreA >= scoreB ? 0 : 1;
    const winnerLabel = winnerIndex === 0 ? 'A' : 'B';
    const winnerText = winnerIndex === 0 ? cleanA : cleanB;

    // AiCore יקבל את התשובה המנצחת כ"טקסט הייצוגי" של הסשן
    const transcript: TranscriptMessage[] = [
      {
        sentBy: 'user',
        text: winnerText,
      },
    ];

    const aiCoreResult = await this.aiCore.scoreSession(transcript);

    console.log('[AiCore v1 – A/B]', {
      userId,
      topic,
      winner: winnerLabel,
      charismaIndex: aiCoreResult.metrics.charismaIndex,
      overallScore: aiCoreResult.metrics.overallScore,
    });

    // ללופ ה-Session אנחנו נותנים את שתי הניקודיים (A + B)
    const messageScores = scores;

    const sessionResult =
      await this.sessionsService.createScoredSessionFromScores({
        userId,
        topic,
        messageScores,
        aiCoreResult,
      });

    return {
      ...sessionResult,
      ai: aiResult,
      aiCore: aiCoreResult,
      mode: 'ab',
      ab: {
        prompt: dto.prompt ?? null,
        optionA: {
          text: cleanA,
          score: scoreA,
          details: aiResult.perMessage[0],
        },
        optionB: {
          text: cleanB,
          score: scoreB,
          details: aiResult.perMessage[1],
        },
        winner: winnerLabel,
      },
    };
  }
}
