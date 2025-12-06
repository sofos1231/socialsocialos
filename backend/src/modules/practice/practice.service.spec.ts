// backend/src/modules/practice/practice.service.spec.ts
// Step 5.3 tests for normalizeEndReason helper

import { normalizeEndReason } from './practice.service';
import { Prisma } from '@prisma/client';
import {
  MissionEndReasonCode,
  MISSION_END_REASON_CODES,
} from '../missions-admin/mission-config-v1.schema';

describe('PracticeService - Step 5.3 normalizeEndReason', () => {
  describe('normalizeEndReason', () => {
    it('should return null for both when code and meta are null', () => {
      const result = normalizeEndReason(null, null);
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return null for both when code and meta are undefined', () => {
      const result = normalizeEndReason(undefined, undefined);
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return null for both when code and meta are Prisma.DbNull', () => {
      const result = normalizeEndReason(Prisma.DbNull, Prisma.DbNull);
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return null for both when code and meta are Prisma.JsonNull', () => {
      const result = normalizeEndReason(Prisma.JsonNull, Prisma.JsonNull);
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return valid code and meta for valid inputs', () => {
      const result = normalizeEndReason('SUCCESS_OBJECTIVE', { score: 75 });
      expect(result.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(result.endReasonMeta).toEqual({ score: 75 });
    });

    it('should return null for invalid code (not in enum)', () => {
      const result = normalizeEndReason('INVALID_CODE', { score: 75 });
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toEqual({ score: 75 });
    });

    it('should return null for code when code is a number', () => {
      const result = normalizeEndReason(123, { score: 75 });
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toEqual({ score: 75 });
    });

    it('should return null for code when code is an object', () => {
      const result = normalizeEndReason({ invalid: true }, { score: 75 });
      expect(result.endReasonCode).toBeNull();
      expect(result.endReasonMeta).toEqual({ score: 75 });
    });

    it('should return null for meta when meta is an array', () => {
      const result = normalizeEndReason('SUCCESS_OBJECTIVE', [1, 2, 3]);
      expect(result.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return null for meta when meta is a string', () => {
      const result = normalizeEndReason('SUCCESS_OBJECTIVE', 'not-an-object');
      expect(result.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(result.endReasonMeta).toBeNull();
    });

    it('should return null for meta when meta is a number', () => {
      const result = normalizeEndReason('SUCCESS_OBJECTIVE', 123);
      expect(result.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(result.endReasonMeta).toBeNull();
    });

    it('should validate all valid enum codes', () => {
      for (const code of MISSION_END_REASON_CODES) {
        const result = normalizeEndReason(code, { test: true });
        expect(result.endReasonCode).toBe(code);
        expect(result.endReasonMeta).toEqual({ test: true });
      }
    });

    it('should be idempotent - applying twice yields same result', () => {
      const first = normalizeEndReason('SUCCESS_OBJECTIVE', { score: 75 });
      const second = normalizeEndReason(
        first.endReasonCode,
        first.endReasonMeta,
      );
      expect(second.endReasonCode).toBe(first.endReasonCode);
      expect(second.endReasonMeta).toEqual(first.endReasonMeta);
    });

    it('should be idempotent - normalizing null twice yields null', () => {
      const first = normalizeEndReason(null, null);
      const second = normalizeEndReason(
        first.endReasonCode,
        first.endReasonMeta,
      );
      expect(second.endReasonCode).toBeNull();
      expect(second.endReasonMeta).toBeNull();
    });

    it('should preserve plain object meta with nested objects', () => {
      const meta = {
        score: 75,
        nested: { value: 123 },
        array: [1, 2, 3],
      };
      const result = normalizeEndReason('FAIL_OBJECTIVE', meta);
      expect(result.endReasonCode).toBe('FAIL_OBJECTIVE');
      expect(result.endReasonMeta).toEqual(meta);
    });

    it('should handle empty object as valid meta', () => {
      const result = normalizeEndReason('ABORT_DISQUALIFIED', {});
      expect(result.endReasonCode).toBe('ABORT_DISQUALIFIED');
      expect(result.endReasonMeta).toEqual({});
    });

    it('should return null for meta when meta is null but code is valid', () => {
      const result = normalizeEndReason('SUCCESS_OBJECTIVE', null);
      expect(result.endReasonCode).toBe('SUCCESS_OBJECTIVE');
      expect(result.endReasonMeta).toBeNull();
    });
  });
});

