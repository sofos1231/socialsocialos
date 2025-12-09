// backend/src/modules/analyzer/analyzer.service.ts
// Step 5.7: Analyzer service

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ChatMessage } from '@prisma/client';
import { normalizeTraitData } from '../shared/normalizers/chat-message.normalizer';
import { generateWhyItWorked, generateWhatToImprove } from '../stats/templates/messageBreakdown.templates';
import { MessageBreakdownDTO, TraitKey } from '../stats/stats.types';
import {
  MessageListItemDTO,
  DeepParagraphDTO,
  AnalyzerListsResponse,
  AnalyzeMessageResponse,
} from './analyzer.types';
import { loadParagraphHistory } from './helpers/paragraph-history';
import { selectDeepParagraphs } from './templates/deepParagraph.registry';
import {
  CandidateInsight,
  InsightKind,
  InsightSource,
  RotationSurface,
} from '../insights/insights.types';

@Injectable()
export class AnalyzerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  /**
   * Step 5.7: Get analyzer lists (positive and negative messages)
   * Uses Step 5.6 glue methods from StatsService
   */
  async getAnalyzerLists(
    userId: string,
    limit: number = 10,
  ): Promise<AnalyzerListsResponse> {
    // Call existing Step 5.6 glue methods (already exclude burned messages)
    const [positive, negative] = await Promise.all([
      this.statsService.getTopPositiveMessages(userId, limit),
      this.statsService.getTopNegativeMessages(userId, limit),
    ]);

    // Map HallOfFameMessageItem → MessageListItemDTO (fields map 1:1)
    const mapToMessageListItem = (
      item: any,
    ): MessageListItemDTO => ({
      messageId: item.messageId,
      sessionId: item.sessionId,
      recordedAtISO: item.recordedAtISO,
      turnIndex: item.turnIndex,
      contentSnippet: item.contentSnippet,
      score: item.score,
      breakdown: item.breakdown,
    });

    return {
      positive: positive.map(mapToMessageListItem),
      negative: negative.map(mapToMessageListItem),
    };
  }

  /**
   * Step 5.7: Analyze a specific message
   */
  async analyzeMessage(
    userId: string,
    messageId: string,
  ): Promise<AnalyzeMessageResponse> {
    // Validate ownership
    const message = await this.validateMessageOwnership(userId, messageId);

    // Check burned state
    const burned = await this.prisma.burnedMessage.findUnique({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
    });

    if (burned) {
      throw new BadRequestException({
        code: 'MESSAGE_BURNED',
        message: 'This message has been burned and cannot be analyzed',
      });
    }

    // Build breakdown
    const breakdown = this.buildMessageBreakdown(message);

    // Load 5.8 glue history
    const paragraphHistory = await loadParagraphHistory(
      this.prisma,
      userId,
    );

    // Select deep paragraphs (with cooldown exclusion)
    const paragraphs = selectDeepParagraphs(
      breakdown,
      paragraphHistory.usedParagraphIds,
    );

    // Build MessageListItemDTO for this message
    const content = typeof message.content === 'string' ? message.content : '';
    const contentSnippet =
      content.length > 100 ? content.substring(0, 100) + '...' : content;

    const messageItem: MessageListItemDTO = {
      messageId: message.id,
      sessionId: message.sessionId,
      recordedAtISO: message.createdAt.toISOString(),
      turnIndex:
        typeof message.turnIndex === 'number' ? message.turnIndex : 0,
      contentSnippet,
      score: typeof message.score === 'number' ? message.score : 0,
      breakdown,
    };

    return {
      message: messageItem,
      breakdown,
      paragraphs,
    };
  }

  /**
   * Step 5.7: Burn a message (exclude from all lists)
   */
  async burnMessage(userId: string, messageId: string): Promise<void> {
    // Validate ownership first
    await this.validateMessageOwnership(userId, messageId);

    // Upsert into BurnedMessage
    await this.prisma.burnedMessage.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId,
        },
      },
      create: {
        userId,
        messageId,
        burnedAt: new Date(),
      },
      update: {
        burnedAt: new Date(),
      },
    });
  }

  /**
   * Step 5.7: Validate message ownership
   */
  private async validateMessageOwnership(
    userId: string,
    messageId: string,
  ): Promise<ChatMessage> {
    const message = await this.prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        content: true,
        score: true,
        createdAt: true,
        turnIndex: true,
        traitData: true,
      },
    });

    if (!message) {
      throw new NotFoundException({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found or does not belong to user',
      });
    }

    return message as ChatMessage;
  }

  /**
   * Step 5.7: Build message breakdown DTO
   * Reuses Step 5.6 templates and normalizers
   */
  private buildMessageBreakdown(message: any): MessageBreakdownDTO {
    const traitData = normalizeTraitData(message.traitData);
    const traits = traitData.traits || {};
    const hooks = Array.isArray(traitData.hooks) ? traitData.hooks : [];
    const patterns = Array.isArray(traitData.patterns)
      ? traitData.patterns
      : [];
    const score = typeof message.score === 'number' ? message.score : 0;

    // Normalize traits to ensure all TraitKey fields exist (0-100 scale)
    const normalizedTraits: Record<TraitKey, number> = {
      confidence:
        typeof traits.confidence === 'number'
          ? Math.round(traits.confidence)
          : 0,
      clarity:
        typeof traits.clarity === 'number' ? Math.round(traits.clarity) : 0,
      humor: typeof traits.humor === 'number' ? Math.round(traits.humor) : 0,
      tensionControl:
        typeof traits.tensionControl === 'number'
          ? Math.round(traits.tensionControl)
          : 0,
      emotionalWarmth:
        typeof traits.emotionalWarmth === 'number'
          ? Math.round(traits.emotionalWarmth)
          : 0,
      dominance:
        typeof traits.dominance === 'number'
          ? Math.round(traits.dominance)
          : 0,
    };

    return {
      score,
      traits: normalizedTraits,
      hooks,
      patterns,
      whyItWorked: generateWhyItWorked(score, normalizedTraits, hooks),
      whatToImprove: generateWhatToImprove(
        score,
        normalizedTraits,
        patterns,
      ),
    };
  }

  /**
   * Step 5.11: Get paragraph candidates for rotation engine
   * Generates candidate insights from analyzer deep paragraphs
   * 
   * @param breakdown - Message breakdown DTO
   * @returns Array of CandidateInsight objects
   */
  async getParagraphCandidatesForRotation(
    breakdown: MessageBreakdownDTO,
  ): Promise<CandidateInsight[]> {
    // Select paragraphs with empty history (no cooldown filtering here)
    // The rotation engine will handle cooldown
    const paragraphs = selectDeepParagraphs(breakdown, []);

    // Convert to CandidateInsight format
    return paragraphs.map((paragraph) => ({
      id: paragraph.id,
      kind: 'ANALYZER_PARAGRAPH' as InsightKind,
      source: 'ANALYZER' as InsightSource,
      category: paragraph.category || 'analysis',
      priority: 50, // Fixed priority for analyzer paragraphs
      weight: 50,
      evidence: {
        // Store message snippet or breakdown data if needed
      },
      isPremium: false, // Step 5.11: Can be extended later
      surfaces: ['ANALYZER'] as RotationSurface[],
      title: paragraph.title, // Step 5.11: Preserve title
      body: paragraph.body, // Step 5.11: Preserve body
    }));
  }
}

