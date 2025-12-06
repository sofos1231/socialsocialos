// backend/src/modules/shared/normalizers/chat-message.normalizer.spec.ts
// ✅ Step 5.5: Unit tests for shared chat message normalizer

import { MessageRole } from '@prisma/client';
import { normalizeChatMessageRead } from './chat-message.normalizer';

describe('normalizeChatMessageRead', () => {
  describe('turnIndex normalization', () => {
    it('should use valid turnIndex from message', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 5, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        10,
      );
      expect(result.turnIndex).toBe(5);
    });

    it('should truncate non-integer turnIndex', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 5.7, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        10,
      );
      expect(result.turnIndex).toBe(5);
    });

    it('should use fallbackIndex when turnIndex is missing', () => {
      const result = normalizeChatMessageRead(
        { role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        3,
      );
      expect(result.turnIndex).toBe(3);
    });

    it('should use fallbackIndex when turnIndex is undefined', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: undefined, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        7,
      );
      expect(result.turnIndex).toBe(7);
    });

    it('should use fallbackIndex when turnIndex is null', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: null, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        2,
      );
      expect(result.turnIndex).toBe(2);
    });

    it('should use fallbackIndex when turnIndex is NaN', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: NaN, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        4,
      );
      expect(result.turnIndex).toBe(4);
    });

    it('should use fallbackIndex when turnIndex is Infinity', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: Infinity, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        1,
      );
      expect(result.turnIndex).toBe(1);
    });

    it('should use fallbackIndex when turnIndex is negative', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: -1, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        0,
      );
      expect(result.turnIndex).toBe(0);
    });

    it('should truncate fallbackIndex if non-integer', () => {
      const result = normalizeChatMessageRead(
        { role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        9.8,
      );
      expect(result.turnIndex).toBe(9);
    });
  });

  describe('score normalization', () => {
    it('should return valid score within range', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 75, traitData: {} },
        0,
      );
      expect(result.score).toBe(75);
    });

    it('should truncate non-integer score', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 75.7, traitData: {} },
        0,
      );
      expect(result.score).toBe(75);
    });

    it('should return null when score is undefined', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: undefined, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is null', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: null, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is NaN', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: NaN, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is Infinity', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: Infinity, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is -Infinity', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: -Infinity, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is -1 (out of range)', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: -1, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return null when score is 101 (out of range)', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 101, traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });

    it('should return 0 when score is exactly 0', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 0, traitData: {} },
        0,
      );
      expect(result.score).toBe(0);
    });

    it('should return 100 when score is exactly 100', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: 100, traitData: {} },
        0,
      );
      expect(result.score).toBe(100);
    });

    it('should return null when score is not a number', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: '75', traitData: {} },
        0,
      );
      expect(result.score).toBeNull();
    });
  });

  describe('traitData normalization', () => {
    it('should apply normalizeTraitData', () => {
      const result = normalizeChatMessageRead(
        {
          turnIndex: 0,
          role: MessageRole.USER,
          content: 'test',
          score: null,
          traitData: { traits: { key: 'value' }, flags: ['flag1'], label: 'test' },
        },
        0,
      );
      expect(result.traitData).toEqual({
        traits: { key: 'value' },
        flags: ['flag1'],
        label: 'test',
      });
    });

    it('should handle null traitData', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'test', score: null, traitData: null },
        0,
      );
      expect(result.traitData).toEqual({
        traits: {},
        flags: [],
        label: null,
      });
    });
  });

  describe('content normalization', () => {
    it('should preserve valid string content', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 'Hello world', score: null, traitData: {} },
        0,
      );
      expect(result.content).toBe('Hello world');
    });

    it('should handle null content', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: null, score: null, traitData: {} },
        0,
      );
      expect(result.content).toBe('');
    });

    it('should handle undefined content', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: undefined, score: null, traitData: {} },
        0,
      );
      expect(result.content).toBe('');
    });

    it('should handle non-string content', () => {
      const result = normalizeChatMessageRead(
        { turnIndex: 0, role: MessageRole.USER, content: 123, score: null, traitData: {} },
        0,
      );
      expect(result.content).toBe('');
    });
  });

  describe('idempotency', () => {
    it('should be idempotent - applying twice yields same result', () => {
      const input = {
        turnIndex: 5,
        role: MessageRole.USER,
        content: 'test',
        score: 75,
        traitData: { traits: { key: 'value' }, flags: ['flag'], label: 'label' },
      };

      const first = normalizeChatMessageRead(input, 0);
      const second = normalizeChatMessageRead(first, first.turnIndex);

      expect(second.turnIndex).toBe(first.turnIndex);
      expect(second.score).toBe(first.score);
      expect(second.content).toBe(first.content);
      expect(second.traitData).toEqual(first.traitData);
    });

    it('should be idempotent with null score', () => {
      const input = {
        turnIndex: 3,
        role: MessageRole.AI,
        content: 'reply',
        score: null,
        traitData: {},
      };

      const first = normalizeChatMessageRead(input, 0);
      const second = normalizeChatMessageRead(first, first.turnIndex);

      expect(second.turnIndex).toBe(first.turnIndex);
      expect(second.score).toBeNull();
      expect(second.score).toBe(first.score);
    });
  });
});

