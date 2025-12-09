// backend/src/modules/stats/config/stats.config.ts
// Step 5.6: Stats configuration constants

/**
 * Hall of Fame score threshold
 * Messages with score >= this threshold are automatically saved to HallOfFameMessage
 */
export const HALL_OF_FAME_SCORE_THRESHOLD = 90;

/**
 * Maximum number of sessions to include in message evolution timeline
 */
export const MESSAGE_EVOLUTION_MAX_SESSIONS = 20;

/**
 * Number of weeks to include in trending traits heatmap
 */
export const TRENDING_TRAITS_WEEKS = 12;

/**
 * Maximum number of Hall of Fame messages to return
 */
export const HALL_OF_FAME_MAX_RESULTS = 20;

