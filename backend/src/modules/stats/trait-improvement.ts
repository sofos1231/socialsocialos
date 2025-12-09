// backend/src/modules/stats/trait-improvement.ts
// Step 5.5: Deterministic trait improvement mapping

import { TraitKey } from './stats.types';
import { TraitImprovement } from './stats.types';
import { CategoryKey } from '../analytics/category-taxonomy';

/**
 * Deterministic improvement suggestions per trait
 * No randomness, stable ordering, consistent across calls
 */
const IMPROVEMENT_MAP: Record<TraitKey, TraitImprovement> = {
  confidence: {
    tip: 'Practice assertive language and reduce apologetic phrases. Start conversations with clear statements instead of questions. Focus on maintaining eye contact and speaking at a steady pace.',
    freePlaySuggestion: 'Try a challenging scenario like approaching someone at a bar or starting a conversation in a coffee shop. Practice introducing yourself confidently.',
    missionRoadTargets: [CategoryKey.CONFIDENCE], // Filter missions by confidence category
  },
  clarity: {
    tip: 'Avoid filler words ("um", "like", "you know"). Be concise and direct. Structure your messages with clear points. Practice explaining complex ideas simply.',
    freePlaySuggestion: 'Practice clear communication in scenarios where you need to explain something important, like giving directions or describing an event.',
    missionRoadTargets: [CategoryKey.CLARITY],
  },
  humor: {
    tip: 'Use light, self-deprecating humor. Avoid sarcasm in initial conversations. Share funny observations about situations, not people. Practice timing and reading the room.',
    freePlaySuggestion: 'Try playful scenarios like a casual chat where you can practice making someone laugh with situational humor.',
    missionRoadTargets: [CategoryKey.HUMOR],
  },
  tensionControl: {
    tip: 'Stay calm under pressure. Don\'t react defensively to challenges. Use breathing techniques. Practice handling awkward moments with grace and humor.',
    freePlaySuggestion: 'Practice scenarios with high tension, like handling rejection or navigating difficult conversations.',
    missionRoadTargets: [CategoryKey.TENSION],
  },
  emotionalWarmth: {
    tip: 'Show genuine interest in others. Use empathy and validation. Share personal stories that create connection. Practice active listening and responding with emotional intelligence.',
    freePlaySuggestion: 'Try scenarios where emotional connection matters, like consoling someone or celebrating with them.',
    missionRoadTargets: [CategoryKey.EMPATHY], // emotionalWarmth maps to EMPATHY category
  },
  dominance: {
    tip: 'Assert your boundaries clearly and respectfully. Lead conversations when appropriate. Make decisions confidently without being controlling. Practice saying "no" gracefully.',
    freePlaySuggestion: 'Practice scenarios where you need to take charge, like planning an activity or setting boundaries.',
    missionRoadTargets: [CategoryKey.DOMINANCE],
  },
};

/**
 * Get improvement suggestion for a trait
 */
export function getImprovementForTrait(traitKey: TraitKey): TraitImprovement {
  return IMPROVEMENT_MAP[traitKey];
}

/**
 * Get all improvements as a record
 */
export function getAllImprovements(): Record<TraitKey, TraitImprovement> {
  return { ...IMPROVEMENT_MAP };
}

