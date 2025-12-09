// backend/src/modules/insights/catalog/insight-catalog.v1.ts
// Step 5.2: Insight catalog registry with stable IDs

import { InsightTemplate, InsightKind } from '../insights.types';

/**
 * Insight catalog - registry of all available insight templates
 * MVP size: ~67 templates total
 */
export class InsightCatalog {
  private templates: Map<string, InsightTemplate> = new Map();

  constructor() {
    this.initializeCatalog();
  }

  /**
   * Get template by ID
   */
  get(id: string): InsightTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all templates of a specific kind
   */
  getByKind(kind: InsightKind): InsightTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.kind === kind);
  }

  /**
   * Get gate insights for a specific gate key
   */
  getGateInsights(gateKey: string): InsightTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.kind === 'GATE_FAIL' && t.requires?.gateKey === gateKey,
    );
  }

  /**
   * Get positive hook insights for a category or hook key
   */
  getHookInsights(category?: string, hookKey?: string): InsightTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.kind === 'POSITIVE_HOOK' &&
        (!category || t.category === category) &&
        (!hookKey || t.requires?.hookKey === hookKey),
    );
  }

  /**
   * Get negative pattern insights for a category or pattern key
   */
  getPatternInsights(category?: string, patternKey?: string): InsightTemplate[] {
    return Array.from(this.templates.values()).filter(
      (t) =>
        t.kind === 'NEGATIVE_PATTERN' &&
        (!category || t.category === category) &&
        (!patternKey || t.requires?.patternKey === patternKey),
    );
  }

  /**
   * Get general tips fallback pool
   */
  getGeneralTips(): InsightTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.kind === 'GENERAL_TIP');
  }

  /**
   * Initialize catalog with MVP templates
   */
  private initializeCatalog(): void {
    // Gate Fail Insights (15 templates)
    this.addGateInsights();

    // Positive Hook Insights (30 templates)
    this.addPositiveHookInsights();

    // Negative Pattern Insights (20 templates)
    this.addNegativePatternInsights();

    // General Tips (10 templates)
    this.addGeneralTips();
  }

  private addGateInsights(): void {
    const gates: InsightTemplate[] = [
      // GATE_MIN_MESSAGES
      {
        id: 'gate_min_messages_too_short',
        kind: 'GATE_FAIL',
        category: 'engagement',
        weight: 100,
        cooldownMissions: 5,
        title: 'Keep the Conversation Going',
        body: "You didn't send enough messages to complete this mission. Try to engage more deeply and ask follow-up questions.",
        requires: { gateKey: 'GATE_MIN_MESSAGES' },
      },
      {
        id: 'gate_min_messages_engagement',
        kind: 'GATE_FAIL',
        category: 'engagement',
        weight: 80,
        cooldownMissions: 4,
        title: 'Build Momentum',
        body: 'Longer conversations help you practice more. Aim for at least 3-4 substantial messages per mission.',
        requires: { gateKey: 'GATE_MIN_MESSAGES' },
      },
      // GATE_SUCCESS_THRESHOLD
      {
        id: 'gate_success_threshold_below',
        kind: 'GATE_FAIL',
        category: 'performance',
        weight: 100,
        cooldownMissions: 5,
        title: 'Raise Your Average Score',
        body: "Your average message score was below the success threshold. Focus on clarity, warmth, and avoiding common pitfalls.",
        requires: { gateKey: 'GATE_SUCCESS_THRESHOLD' },
      },
      {
        id: 'gate_success_threshold_practice',
        kind: 'GATE_FAIL',
        category: 'performance',
        weight: 90,
        cooldownMissions: 4,
        title: 'Keep Practicing',
        body: 'You have the basics down. Keep practicing to consistently hit higher scores.',
        requires: { gateKey: 'GATE_SUCCESS_THRESHOLD' },
      },
      // GATE_FAIL_FLOOR
      {
        id: 'gate_fail_floor_too_low',
        kind: 'GATE_FAIL',
        category: 'performance',
        weight: 100,
        cooldownMissions: 5,
        title: 'Score Too Low',
        body: "Your messages scored below the minimum threshold. Review the mission objectives and try to improve your approach.",
        requires: { gateKey: 'GATE_FAIL_FLOOR' },
      },
      // GATE_DISQUALIFIED
      {
        id: 'gate_disqualified_violation',
        kind: 'GATE_FAIL',
        category: 'conduct',
        weight: 100,
        cooldownMissions: 3,
        title: 'Mission Rules Violated',
        body: 'This mission was disqualified due to rule violations. Please review the mission guidelines and try again.',
        requires: { gateKey: 'GATE_DISQUALIFIED' },
      },
      // GATE_OBJECTIVE_PROGRESS
      {
        id: 'gate_objective_progress_insufficient',
        kind: 'GATE_FAIL',
        category: 'objectives',
        weight: 90,
        cooldownMissions: 4,
        title: 'Mission Objective Not Met',
        body: "You didn't make sufficient progress toward the mission objective. Focus on the specific goals outlined in the mission brief.",
        requires: { gateKey: 'GATE_OBJECTIVE_PROGRESS' },
      },
    ];

    gates.forEach((gate) => this.templates.set(gate.id, gate));
  }

  private addPositiveHookInsights(): void {
    const hooks: InsightTemplate[] = [
      // Confidence hooks
      {
        id: 'hook_confidence_strong',
        kind: 'POSITIVE_HOOK',
        category: 'confidence',
        weight: 80,
        cooldownMissions: 4,
        title: 'Strong Confidence',
        body: 'Your messages showed strong confidence. Keep asserting yourself while staying respectful.',
        requires: { hookKey: 'HIGH_CONFIDENCE' },
      },
      {
        id: 'hook_confidence_assured',
        kind: 'POSITIVE_HOOK',
        category: 'confidence',
        weight: 75,
        cooldownMissions: 3,
        title: 'Assured Presence',
        body: 'You came across as assured and self-possessed. This is a great foundation for social interactions.',
        requires: { hookKey: 'HIGH_CONFIDENCE' },
      },
      // Clarity hooks
      {
        id: 'hook_clarity_crystal_clear',
        kind: 'POSITIVE_HOOK',
        category: 'clarity',
        weight: 85,
        cooldownMissions: 4,
        title: 'Crystal Clear Communication',
        body: 'Your messages were clear and easy to understand. This helps build trust and connection.',
        requires: { hookKey: 'HIGH_CLARITY' },
      },
      {
        id: 'hook_clarity_articulate',
        kind: 'POSITIVE_HOOK',
        category: 'clarity',
        weight: 80,
        cooldownMissions: 3,
        title: 'Articulate Expression',
        body: 'You expressed your thoughts articulately. Clear communication is key to meaningful conversations.',
        requires: { hookKey: 'HIGH_CLARITY' },
      },
      // Humor hooks
      {
        id: 'hook_humor_well_placed',
        kind: 'POSITIVE_HOOK',
        category: 'humor',
        weight: 90,
        cooldownMissions: 4,
        title: 'Well-Placed Humor',
        body: 'Your humor was well-timed and appropriate. Humor creates connection and makes conversations memorable.',
        requires: { hookKey: 'GOOD_HUMOR' },
      },
      {
        id: 'hook_humor_lighthearted',
        kind: 'POSITIVE_HOOK',
        category: 'humor',
        weight: 85,
        cooldownMissions: 3,
        title: 'Lighthearted Touch',
        body: 'You added a lighthearted touch that made the conversation more enjoyable. Keep it natural and authentic.',
        requires: { hookKey: 'GOOD_HUMOR' },
      },
      // Warmth hooks
      {
        id: 'hook_warmth_genuine',
        kind: 'POSITIVE_HOOK',
        category: 'emotionalWarmth',
        weight: 90,
        cooldownMissions: 4,
        title: 'Genuine Warmth',
        body: 'Your messages showed genuine emotional warmth. This creates a welcoming atmosphere for deeper connection.',
        requires: { hookKey: 'HIGH_WARMTH' },
      },
      {
        id: 'hook_warmth_empathy',
        kind: 'POSITIVE_HOOK',
        category: 'emotionalWarmth',
        weight: 85,
        cooldownMissions: 3,
        title: 'Empathetic Connection',
        body: 'You demonstrated empathy and emotional intelligence. This builds trust and rapport.',
        requires: { hookKey: 'HIGH_WARMTH' },
      },
      // Tension control hooks
      {
        id: 'hook_tension_balanced',
        kind: 'POSITIVE_HOOK',
        category: 'tensionControl',
        weight: 85,
        cooldownMissions: 4,
        title: 'Balanced Tension',
        body: 'You maintained good tension control. Not too intense, not too casual—just right for engaging conversation.',
        requires: { hookKey: 'BALANCED_TENSION' },
      },
      // General positive hooks (no specific hookKey requirement)
      {
        id: 'hook_general_engaged',
        kind: 'POSITIVE_HOOK',
        category: 'engagement',
        weight: 70,
        cooldownMissions: 3,
        title: 'Actively Engaged',
        body: 'You stayed actively engaged throughout the conversation. Consistent engagement shows interest and respect.',
      },
      {
        id: 'hook_general_responsive',
        kind: 'POSITIVE_HOOK',
        category: 'engagement',
        weight: 65,
        cooldownMissions: 3,
        title: 'Responsive and Present',
        body: 'You were responsive and present in the conversation. Being in the moment makes interactions more meaningful.',
      },
    ];

    hooks.forEach((hook) => this.templates.set(hook.id, hook));
  }

  private addNegativePatternInsights(): void {
    const patterns: InsightTemplate[] = [
      // Neediness patterns
      {
        id: 'pattern_neediness_detected',
        kind: 'NEGATIVE_PATTERN',
        category: 'confidence',
        weight: 90,
        cooldownMissions: 5,
        title: 'Avoid Neediness',
        body: 'Your messages showed signs of neediness. Try to be more independent and self-assured in your interactions.',
        requires: { patternKey: 'neediness' },
      },
      {
        id: 'pattern_neediness_improve',
        kind: 'NEGATIVE_PATTERN',
        category: 'confidence',
        weight: 85,
        cooldownMissions: 4,
        title: 'Build Independence',
        body: 'Focus on building your own value and interests. Neediness comes from over-relying on others for validation.',
        requires: { patternKey: 'neediness' },
      },
      // Overexplaining patterns
      {
        id: 'pattern_overexplaining_detected',
        kind: 'NEGATIVE_PATTERN',
        category: 'clarity',
        weight: 85,
        cooldownMissions: 4,
        title: 'Less is More',
        body: 'You tended to overexplain. Try to be more concise and let some things go unsaid.',
        requires: { patternKey: 'overexplaining' },
      },
      {
        id: 'pattern_overexplaining_conciseness',
        kind: 'NEGATIVE_PATTERN',
        category: 'clarity',
        weight: 80,
        cooldownMissions: 3,
        title: 'Practice Conciseness',
        body: 'Work on being more concise. Trust that the other person understands without spelling everything out.',
        requires: { patternKey: 'overexplaining' },
      },
      // Apologizing patterns
      {
        id: 'pattern_apologizing_excessive',
        kind: 'NEGATIVE_PATTERN',
        category: 'confidence',
        weight: 90,
        cooldownMissions: 5,
        title: 'Reduce Excessive Apologizing',
        body: 'You apologized more than necessary. Save apologies for when you actually make mistakes.',
        requires: { patternKey: 'excessive_apologizing' },
      },
      // Seeking validation patterns
      {
        id: 'pattern_validation_seeking',
        kind: 'NEGATIVE_PATTERN',
        category: 'confidence',
        weight: 85,
        cooldownMissions: 4,
        title: 'Stop Seeking Validation',
        body: 'Avoid asking for validation or approval. Be confident in your own choices and opinions.',
        requires: { patternKey: 'validation_seeking' },
      },
      // Defensive patterns
      {
        id: 'pattern_defensive_response',
        kind: 'NEGATIVE_PATTERN',
        category: 'tensionControl',
        weight: 85,
        cooldownMissions: 4,
        title: 'Stay Open, Not Defensive',
        body: 'Try to stay open to feedback instead of getting defensive. Defensiveness closes off conversation.',
        requires: { patternKey: 'defensiveness' },
      },
    ];

    patterns.forEach((pattern) => this.templates.set(pattern.id, pattern));
  }

  private addGeneralTips(): void {
    const tips: InsightTemplate[] = [
      {
        id: 'tip_listen_more',
        kind: 'GENERAL_TIP',
        category: 'engagement',
        weight: 60,
        cooldownMissions: 3,
        title: 'Listen More, Talk Less',
        body: 'Great conversations are built on genuine listening. Make sure to ask questions and show interest in what the other person says.',
      },
      {
        id: 'tip_authenticity',
        kind: 'GENERAL_TIP',
        category: 'engagement',
        weight: 65,
        cooldownMissions: 3,
        title: 'Be Authentic',
        body: 'Authenticity beats perfection. Be yourself and let your personality shine through naturally.',
      },
      {
        id: 'tip_storytelling',
        kind: 'GENERAL_TIP',
        category: 'clarity',
        weight: 60,
        cooldownMissions: 3,
        title: 'Tell Stories',
        body: 'Stories make conversations memorable. Share experiences and anecdotes to create connection.',
      },
      {
        id: 'tip_confidence_practice',
        kind: 'GENERAL_TIP',
        category: 'confidence',
        weight: 65,
        cooldownMissions: 3,
        title: 'Practice Confidence',
        body: 'Confidence comes from practice. Keep putting yourself out there and learning from each interaction.',
      },
      {
        id: 'tip_balance',
        kind: 'GENERAL_TIP',
        category: 'tensionControl',
        weight: 60,
        cooldownMissions: 3,
        title: 'Find Your Balance',
        body: 'Every conversation needs balance—between serious and light, talking and listening, intensity and ease.',
      },
    ];

    tips.forEach((tip) => this.templates.set(tip.id, tip));
  }
}

/**
 * Singleton catalog instance
 */
let catalogInstance: InsightCatalog | null = null;

export function getInsightCatalog(): InsightCatalog {
  if (!catalogInstance) {
    catalogInstance = new InsightCatalog();
  }
  return catalogInstance;
}

