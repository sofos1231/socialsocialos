// backend/src/modules/insights/engine/insight-selector.ts
// Step 5.2: Deterministic insight selector (variety enforcement + quotas)

import {
  InsightCard,
  CandidateInsight,
  InsightSignals,
  InsightHistory,
  InsightsV2Payload,
  InsightKind,
} from '../insights.types';
import { getInsightCatalog } from '../catalog/insight-catalog.v1';
import { createSeededPRNG } from './insight-prng';

/**
 * Select insights deterministically from signals and history
 * 
 * Algorithm:
 * 1. Build candidate buckets (gate, hook, pattern, general)
 * 2. Filter by exclusion set (last 5 missions)
 * 3. Sort by priority (gate > hook > pattern > tip)
 * 4. Apply quotas (gate 2-3, hook 2-3, pattern 1-2)
 * 5. Use seeded PRNG for tie-breaking if needed
 * 
 * @param signals - Extracted signals from session
 * @param history - Insight history (excluded IDs)
 * @param seed - Deterministic seed for PRNG
 * @returns InsightsV2Payload with selected insights
 */
export function selectInsightsV2(
  signals: InsightSignals,
  history: InsightHistory,
  seed: string,
): InsightsV2Payload {
  const catalog = getInsightCatalog();
  const rng = createSeededPRNG(seed);
  const excludedIds = new Set<string>(history.pickedIds as string[]);

  // Build candidate buckets by priority
  const candidates: CandidateInsight[] = [];

  // Priority 1: Gate fail insights (priority 100)
  for (const gateFail of signals.gateFails) {
    const templates = catalog.getGateInsights(gateFail.gateKey);
    for (const template of templates) {
      if (!excludedIds.has(template.id)) {
        candidates.push({
          id: template.id,
          kind: template.kind,
          category: template.category,
          priority: 100, // Highest priority
          weight: template.weight,
          source: 'GATES',
          evidence: {
            gateKey: gateFail.gateKey,
          },
        });
      }
    }
  }

  // Priority 2: Positive hook insights (priority 80)
  for (const hook of signals.positiveHooks) {
    // Try to match by hookKey first, then by category
    let templates = catalog.getHookInsights(undefined, hook.hookKey);
    if (templates.length === 0) {
      // Fallback: get general hook insights for common categories
      templates = catalog.getHookInsights('confidence'); // Default category
    }
    
    for (const template of templates) {
      if (!excludedIds.has(template.id)) {
        candidates.push({
          id: template.id,
          kind: template.kind,
          category: template.category,
          priority: 80,
          weight: template.weight,
          source: 'HOOKS',
          evidence: {
            hookKey: hook.hookKey,
            strength: hook.strength,
            turnIndex: hook.turnIndex,
          },
        });
      }
    }
  }

  // Priority 3: Negative pattern insights (priority 60)
  for (const pattern of signals.negativePatterns) {
    const templates = catalog.getPatternInsights(undefined, pattern.patternKey);
    for (const template of templates) {
      if (!excludedIds.has(template.id)) {
        candidates.push({
          id: template.id,
          kind: template.kind,
          category: template.category,
          priority: 60,
          weight: template.weight,
          source: 'PATTERNS',
          evidence: {
            patternKey: pattern.patternKey,
            severity: pattern.severity,
            turnIndex: pattern.turnIndex,
          },
        });
      }
    }
  }

  // Priority 4: General tips (priority 40) - fallback if quotas not met
  const generalTips = catalog.getGeneralTips();
  for (const template of generalTips) {
    if (!excludedIds.has(template.id)) {
      candidates.push({
        id: template.id,
        kind: template.kind,
        category: template.category,
        priority: 40,
        weight: template.weight,
        source: 'GENERAL',
      });
    }
  }

  // Sort candidates: priority DESC, then weight DESC, then id ASC (stable)
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return a.id.localeCompare(b.id); // Deterministic tie-break by ID
  });

  // Apply quotas using deterministic selection
  const selected: CandidateInsight[] = [];
  const selectedIds = new Set<string>();
  const quotas = {
    gate: { min: 0, max: 3, current: 0 },
    hook: { min: 0, max: 3, current: 0 },
    pattern: { min: 0, max: 2, current: 0 },
    tip: { min: 0, max: 6, current: 0 }, // General tips can fill remaining slots
  };

  const maxTotal = 6; // Maximum total insights

  // Select insights deterministically
  for (const candidate of candidates) {
    if (selected.length >= maxTotal) break;
    if (selectedIds.has(candidate.id)) continue; // Skip duplicates

    let quota = quotas.tip; // Default to tips
    if (candidate.kind === 'GATE_FAIL') quota = quotas.gate;
    else if (candidate.kind === 'POSITIVE_HOOK') quota = quotas.hook;
    else if (candidate.kind === 'NEGATIVE_PATTERN') quota = quotas.pattern;

    // Check quota
    if (quota.current >= quota.max && candidate.priority !== 40) {
      // Skip if quota full (except general tips can exceed if needed)
      continue;
    }

    // For same priority/weight, use seeded PRNG for selection (deterministic)
    // But since we sorted, we'll take first candidates deterministically
    // Only use PRNG if we need to break exact ties within same priority/weight bucket
    selected.push(candidate);
    selectedIds.add(candidate.id);
    quota.current++;
  }

  // Ensure minimums if possible (gate/hook should have at least 1-2 if candidates exist)
  // For now, we'll accept whatever we got (quota logic above handles max)

  // Convert to InsightCard output format
  const gateInsights: InsightCard[] = [];
  const positiveInsights: InsightCard[] = [];
  const negativeInsights: InsightCard[] = [];

  for (const candidate of selected) {
    const template = catalog.get(candidate.id);
    if (!template) continue;

    const card: InsightCard = {
      id: template.id,
      kind: template.kind,
      category: template.category,
      title: template.title,
      body: template.body,
      relatedTurnIndex: candidate.evidence?.turnIndex,
    };

    if (candidate.kind === 'GATE_FAIL') {
      gateInsights.push(card);
    } else if (candidate.kind === 'POSITIVE_HOOK') {
      positiveInsights.push(card);
    } else if (candidate.kind === 'NEGATIVE_PATTERN') {
      negativeInsights.push(card);
    } else {
      // General tips go to appropriate category (for now, add to positive if empty)
      if (positiveInsights.length < 3) {
        positiveInsights.push(card);
      } else if (negativeInsights.length < 2) {
        negativeInsights.push(card);
      } else {
        gateInsights.push(card); // Fallback
      }
    }
  }

  return {
    gateInsights,
    positiveInsights,
    negativeInsights,
    traitDeltas: {}, // Will be filled by trait adjuster
    meta: {
      seed,
      excludedIds: Array.from(excludedIds) as string[],
      pickedIds: selected.map((c) => c.id),
      version: 'v2',
    },
  };
}

