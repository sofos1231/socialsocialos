// backend/src/modules/insights/engine/insight-prng.ts
// Step 5.2: Deterministic seeded PRNG utility (no external dependencies)

/**
 * Linear Congruential Generator (LCG) for deterministic pseudo-random numbers
 * Same seed => same sequence of random numbers
 * 
 * Algorithm: X(n+1) = (a * X(n) + c) mod m
 * Using parameters from Numerical Recipes: a=1664525, c=1013904223, m=2^32
 */
class SeededPRNG {
  private seed: number;

  constructor(seed: string) {
    // Convert string seed to numeric seed using hash-like function
    this.seed = this.hashString(seed);
  }

  /**
   * Generate next random number in sequence (0 to 1 exclusive)
   */
  next(): number {
    // LCG parameters (Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    // Generate next value
    this.seed = (a * this.seed + c) % m;

    // Normalize to [0, 1)
    return this.seed / m;
  }

  /**
   * Hash string to numeric seed
   * Simple but effective: sum of char codes with multiplier
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive and within valid range
    return Math.abs(hash) % 2147483647; // Max 32-bit signed int
  }
}

/**
 * Create a seeded PRNG function from a seed string
 * 
 * @param seed - Deterministic seed (e.g., hash of userId|sessionId|"insightsV2")
 * @returns Function that returns deterministic random numbers [0, 1)
 * 
 * @example
 * const rng = createSeededPRNG('abc123');
 * const value1 = rng(); // Always same for same seed
 * const value2 = rng(); // Next in deterministic sequence
 */
export function createSeededPRNG(seed: string): () => number {
  const prng = new SeededPRNG(seed);
  return () => prng.next();
}

/**
 * Generate deterministic seed from user and session identifiers
 * 
 * @param userId - User ID
 * @param sessionId - Session ID
 * @param constant - Constant string (e.g., "insightsV2")
 * @returns Deterministic seed string
 */
export function generateInsightsV2Seed(
  userId: string,
  sessionId: string,
  constant: string = 'insightsV2',
): string {
  const input = `${userId}|${sessionId}|${constant}`;
  
  // Use Node.js crypto for hash (available in backend)
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Return first 16 chars (sufficient for seed, keeps it readable)
  return hash.substring(0, 16);
}

