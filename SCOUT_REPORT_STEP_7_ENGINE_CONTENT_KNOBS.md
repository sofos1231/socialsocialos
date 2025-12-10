# SCOUT REPORT — STEP 7 "ENGINE CONTENT + KNOBS" DASHBOARD

**Date:** 2025-01-15  
**Mode:** SCOUT ONLY (Read-Only Exploration)  
**Target:** Prompt Builder + AI Scoring + Dynamics Profiles Dashboard

---

## 1. FILE MAP — SCORING / DYNAMICS / PROMPTS

### A. AI Scoring & Traits Files

#### **`backend/src/modules/ai/ai-scoring.service.ts`**
- **Main Functions:**
  - `scoreSession()` - Main entry point, produces per-message scores and premium analysis
  - `buildBaseScore()` - Computes base score, rarity, micro feedback, tags, multipliers
  - `computeLengthScore()` - Scores based on message length (hard-coded thresholds)
  - `computePunctuationScore()` - Bonus for questions/exclamations (hard-coded multipliers)
  - `computePositionBonus()` - Bonus for later messages (hard-coded values)
  - `applyDifficultyAdjustments()` - Applies difficulty config to scores (strictness, ambiguity, emotional penalty, cleverness bonus, recovery difficulty, fail threshold)
  - `buildMicroFeedback()` - Generates feedback strings based on score ranges (hard-coded thresholds)
  - `buildTags()` - Generates tags based on score and text patterns
  - `computeXpMultiplier()` - Maps rarity to XP multiplier (hard-coded: S+=1.8, S=1.5, A=1.25, B=1.0, C=0.8)
  - `computeCoinsMultiplier()` - Maps rarity to coins multiplier (hard-coded: S+=1.7, S=1.4, A=1.2, B=1.0, C=0.7)
  - `buildPremiumAnalysis()` - Generates deep session analysis for premium users
- **Used By:** `PracticeService`, `SessionsService`
- **Key Hard-Coded Values:**
  - Length thresholds: 0=10, <5=35, <15=55, <40=75, <80=82, >=80=70
  - Punctuation: question bonus = 2 per ?, max 10; exclamation = 3 per !, max 12
  - Position bonus: index 0=0, 1=2, 2=4, 3+=5
  - Rarity thresholds: S+>=92, S>=84, A>=72, B>=58, C<58
  - Difficulty multipliers: strictness (0.5-1.0), ambiguity penalty (up to 15), emotional penalty (up to 20), cleverness bonus (up to 10), recovery penalty (up to 30%)

#### **`backend/src/modules/ai/ai-core-scoring.service.ts`**
- **Main Functions:**
  - `scoreSession()` - Core Option B engine, deterministic trait scoring
  - `evaluateMessage()` - Evaluates individual messages into traits
  - `distributeScoreIntoTraits()` - Distributes base score into 6 traits (confidence, clarity, humor, tensionControl, emotionalWarmth, dominance)
  - `computeCoreMetrics()` - Aggregates traits and computes charismaIndex
- **Used By:** `AiScoringService` (not directly, but similar pattern)
- **Key Hard-Coded Values:**
  - CharismaIndex weights: confidence=0.3, clarity=0.25, emotionalWarmth=0.2, humor=0.15, tensionControl=0.1
  - Trait adjustments: questions +10 tensionControl, emojis +20 humor, "maybe/i guess" -15 confidence/-10 dominance, "let's" +15 dominance, warm words +15 emotionalWarmth
  - Filler words list: ['like', 'um', 'uh', 'you know', 'kinda', 'sort of']

#### **`backend/src/modules/traits/traits.service.ts`**
- **Main Functions:**
  - `computeSessionTraitSnapshot()` - Computes trait snapshot from session messages
  - `updateLongTermScores()` - Updates long-term trait scores using exponential moving average
  - `persistTraitHistoryAndUpdateScores()` - Persists trait history and updates user scores
- **Used By:** `SessionsService` (on session end)
- **Key Hard-Coded Values:**
  - Alpha (EMA factor) = 0.3 for all traits

#### **`backend/src/modules/sessions/scoring.ts`**
- **Purpose:** Legacy scoring utilities (if exists)
- **Status:** Needs verification

---

### B. Dynamics & Persona Behavior Files

#### **`backend/src/modules/missions-admin/mission-config-v1.schema.ts`**
- **Main Types:**
  - `MissionConfigV1Dynamics` - Interface for dynamics config (pace, emojiDensity, flirtiveness, hostility, dryness, vulnerability, escalationSpeed, randomness)
  - `MissionConfigV1Difficulty` - Interface for difficulty config (strictness, ambiguityTolerance, emotionalPenalty, bonusForCleverness, failThreshold, recoveryDifficulty)
  - `MissionConfigV1Openings` - Interface for openings config (style, energy, curiosity, personaInitMood, openerTemplateKey)
  - `MissionConfigV1ResponseArchitecture` - Interface for response architecture (reflection, validation, emotionalMirroring, pushPullFactor, riskTaking, clarity, reasoningDepth, personaConsistency)
- **Used By:** All services that read/write MissionConfigV1
- **Storage:** Stored in `PracticeMissionTemplate.aiContract.missionConfigV1` (JSON)

#### **`backend/src/modules/ai-engine/registries/dynamics-profiles.registry.ts`**
- **Main Exports:**
  - `AI_DYNAMICS_PROFILES` - Registry of 9 predefined dynamics profiles (FAST_PACED, SLOW_BUILD, HIGH_FLIRT, LOW_FLIRT, DRY_HUMOR, WARM_VULNERABLE, NEUTRAL, CHALLENGING, PLAYFUL)
  - `getDynamicsProfile()` - Get profile by key
- **Status:** **DESIGN-TIME ONLY** - Not used at runtime, only for UI reference
- **Note:** Actual dynamics come from `MissionConfigV1.dynamics` stored in mission template

#### **`backend/src/modules/ai-engine/registries/difficulty-profiles.registry.ts`**
- **Main Exports:**
  - `AI_DIFFICULTY_PROFILES` - Registry of 6 predefined difficulty profiles (LENIENT, STRICT, BALANCED, HARSH, FORGIVING, PRECISE)
  - `getDifficultyProfile()` - Get profile by key
  - `getDefaultDifficultyProfileForLevel()` - Maps MissionDifficulty enum to profile key
- **Status:** **DESIGN-TIME ONLY** - Not used at runtime
- **Note:** Actual difficulty comes from `MissionConfigV1.difficulty` stored in mission template

#### **`backend/src/modules/ai-engine/registries/response-architecture-profiles.registry.ts`**
- **Main Exports:**
  - `RESPONSE_ARCHITECTURE_PROFILES` - Registry of 9 predefined response architecture profiles (REFLECTIVE, VALIDATING, EMOTIONAL, PUSHPULL, RISKY, CLEAR, DEEP, CONSISTENT, BALANCED)
  - `getResponseArchitectureProfile()` - Get profile by key
- **Status:** **DESIGN-TIME ONLY** - Not used at runtime
- **Note:** Actual response architecture comes from `MissionConfigV1.responseArchitecture` stored in mission template

#### **`backend/src/modules/ai/providers/ai-chat.service.ts`**
- **Main Functions:**
  - `buildDynamicsBlock()` - Converts dynamics numbers into prompt instructions (hard-coded thresholds: pace >=70 fast, <=30 slow; emojiDensity >=60 heavy, <=20 minimal; flirtiveness >=70 high, <=25 low; hostility >=60 high, <=15 low; dryness >=70 dry, <=20 warm; vulnerability >=70 high, <=25 low; escalationSpeed >=70 fast, <=30 slow; randomness >=60 high, <=30 low)
- **Used By:** Called when building system prompts for AI chat
- **Key Hard-Coded Values:**
  - All dynamics thresholds are hard-coded in `buildDynamicsBlock()` method

#### **`backend/src/modules/ai-engine/micro-dynamics.service.ts`**
- **Purpose:** Micro-dynamics adjustments during conversation
- **Status:** Needs verification

---

### C. Prompt Content Files

#### **`backend/src/modules/insights/catalog/insight-catalog.v1.ts`**
- **Main Class:** `InsightCatalog`
- **Main Methods:**
  - `get()` - Get template by ID
  - `getByKind()` - Get templates by kind (GATE_FAIL, POSITIVE_HOOK, NEGATIVE_PATTERN, GENERAL_TIP)
  - `getGateInsights()` - Get gate insights for a gate key
  - `getHookInsights()` - Get positive hook insights
  - `getPatternInsights()` - Get negative pattern insights
  - `getGeneralTips()` - Get general tips
- **Content:** ~67 hard-coded insight templates
  - 15 Gate Fail insights
  - 30 Positive Hook insights
  - 20 Negative Pattern insights
  - 10 General Tips
- **Storage:** In-memory Map, initialized in constructor
- **Used By:** `insight-selector.ts` (via `getInsightCatalog()`)

#### **`backend/src/modules/insights/engine/insight-selector.ts`**
- **Main Function:**
  - `selectInsightsV2()` - Deterministic insight selector with quotas and variety enforcement
- **Key Hard-Coded Values:**
  - Priority weights: Gate=100, Hook=80, Pattern=60, Tip=40
  - Quotas: Gate 2-3, Hook 2-3, Pattern 1-2, Tip 1-2 (fallback)
- **Used By:** `insights.engine.ts`

#### **`backend/src/modules/ai-engine/registries/opening-templates.registry.ts`**
- **Main Exports:**
  - `OPENING_TEMPLATES` - Registry of 8 opening templates (CASUAL_GREETING, PLAYFUL_HOOK, DIRECT_QUESTION, MYSTERIOUS_TEASE, WARM_COMPLIMENT, CURIOUS_OBSERVATION, BOLD_STATEMENT, SHY_APPROACH)
  - `getOpeningTemplate()` - Get template by key
  - `getOpeningTemplateForStyle()` - Get template compatible with style
- **Storage:** Hard-coded registry
- **Used By:** `OpeningsService`

#### **`backend/src/modules/ai-engine/openings.service.ts`**
- **Main Class:** `OpeningsService`
- **Main Methods:**
  - `generateOpening()` - Generates opening message based on style, dynamics, difficulty, openings config
  - `selectOpeningTemplate()` - Selects template based on aiStyleKey and openings.style
  - `buildOpeningText()` - Builds opening text by injecting dynamics and difficulty into template
- **Used By:** `PracticeService` (when starting a mission)

#### **`backend/src/modules/prompts/prompts.service.ts`**
- **Main Class:** `PromptsService`
- **Main Methods:**
  - `matchAndTriggerHooksForSession()` - Matches enabled hooks for a session and creates triggers
- **Used By:** `SessionsService` (on session end)
- **Key Logic:**
  - Evaluates hook conditions (trait levels, mood state, hook/pattern counts)
  - Enforces cooldown and max triggers per session
  - Stores triggers in `PromptHookTrigger` table

#### **`backend/src/modules/prompts/prompts.types.ts`**
- **Main Types:**
  - `PromptHookPayload` - Hook definition structure
  - `PromptHookConditions` - Condition structure (requiredTraits, forbiddenTraits, requiredMoodRange, requiredCounts, segmentFilters)
  - `TraitCondition` - Trait condition (trait, level: VERY_LOW/LOW/MEDIUM/HIGH/VERY_HIGH, operator)
  - `MoodCondition` - Mood condition (moodState, moodPercent range)
- **Storage:** Hooks stored in `PromptHook` table (conditions in `conditionsJson`, text in `textTemplate`)

#### **`backend/prisma/schema.prisma`**
- **Models:**
  - `PromptHook` - Stores hook definitions (id, name, type, textTemplate, conditionsJson, category, tags, priority, isEnabled, metaJson)
  - `PromptHookTrigger` - Stores hook trigger events (id, hookId, sessionId, userId, triggeredAt, matchedContext)
- **Relations:** Hook → Triggers (one-to-many)

---

### D. MissionConfigV1 Storage & Linking

#### **Where MissionConfigV1 is Stored:**
- **Table:** `PracticeMissionTemplate.aiContract` (JSON field)
- **Structure:** `{ missionConfigV1: { version: 1, dynamics: {...}, objective: {...}, difficulty: {...}, style: {...}, statePolicy: {...}, openings?: {...}, responseArchitecture?: {...}, aiRuntimeProfile?: {...} } }`

#### **How Missions Link to Engine Behavior:**
1. **Dynamics:** `MissionConfigV1.dynamics` → Used by `ai-chat.service.ts` to build dynamics block in prompts
2. **Difficulty:** `MissionConfigV1.difficulty` → Used by `ai-scoring.service.ts` to adjust scores
3. **Openings:** `MissionConfigV1.openings` → Used by `OpeningsService` to generate opening messages
4. **Response Architecture:** `MissionConfigV1.responseArchitecture` → Used by `ai-chat.service.ts` to build response architecture block
5. **Style:** `MissionConfigV1.style.aiStyleKey` → Maps to `AiStyle` table, used for prompt building
6. **Scoring:** Currently **GLOBAL** - no per-mission scoring profile, all missions use same scoring logic with difficulty adjustments

#### **How Categories Link to Engine Behavior:**
- **Currently:** Categories do NOT have default dynamics/scoring profiles
- **Future:** Could add `defaultScoringProfileCode`, `defaultDynamicsProfileCode` to `MissionCategory`

---

## 2. KNOBS TABLE — WHAT IS HARD-CODED TODAY

### SCORING_KNOBS

| Name | File + Line | What It Controls | Current Value |
|------|-------------|------------------|---------------|
| **Length Score Thresholds** | `ai-scoring.service.ts:156-166` | Base score based on message length | 0=10, <5=35, <15=55, <40=75, <80=82, >=80=70 |
| **Question Bonus** | `ai-scoring.service.ts:177` | Bonus per question mark | 2 per ?, max 10 |
| **Exclamation Bonus** | `ai-scoring.service.ts:178` | Bonus per exclamation mark | 3 per !, max 12 |
| **Position Bonus** | `ai-scoring.service.ts:186-191` | Bonus for later messages | index 0=0, 1=2, 2=4, 3+=5 |
| **Rarity Thresholds** | `ai-scoring.service.ts:193-199` | Score → rarity mapping | S+>=92, S>=84, A>=72, B>=58, C<58 |
| **XP Multipliers** | `ai-scoring.service.ts:246-260` | Rarity → XP multiplier | S+=1.8, S=1.5, A=1.25, B=1.0, C=0.8 |
| **Coins Multipliers** | `ai-scoring.service.ts:262-276` | Rarity → coins multiplier | S+=1.7, S=1.4, A=1.2, B=1.0, C=0.7 |
| **Strictness Multiplier Range** | `ai-scoring.service.ts:315` | How strictness affects score | 1.0 (lenient) to 0.5 (strict) |
| **Ambiguity Penalty Max** | `ai-scoring.service.ts:326` | Max penalty for ambiguity | Up to 15 points |
| **Emotional Penalty Max** | `ai-scoring.service.ts:340` | Max penalty for emotional missteps | Up to 20 points |
| **Cleverness Bonus Max** | `ai-scoring.service.ts:353` | Max bonus for cleverness | Up to 10 points |
| **Recovery Penalty Max** | `ai-scoring.service.ts:365` | Max penalty for recovery difficulty | Up to 30% reduction |
| **Fail Threshold Penalty Max** | `ai-scoring.service.ts:377` | Additional penalty below fail threshold | Up to 10 points |
| **CharismaIndex Weights** | `ai-core-scoring.service.ts:210-216` | Trait weights for charisma index | confidence=0.3, clarity=0.25, emotionalWarmth=0.2, humor=0.15, tensionControl=0.1 |
| **Trait Adjustments** | `ai-core-scoring.service.ts:134-161` | Pattern-based trait adjustments | Questions +10 tensionControl, emojis +20 humor, "maybe" -15 confidence, "let's" +15 dominance, warm words +15 emotionalWarmth |
| **Filler Words List** | `ai-core-scoring.service.ts:183` | Words counted as fillers | ['like', 'um', 'uh', 'you know', 'kinda', 'sort of'] |
| **Trait EMA Alpha** | `traits.service.ts:155` | Exponential moving average factor | 0.3 for all traits |
| **Insight Priority Weights** | `insight-selector.ts:51-100` | Priority for insight selection | Gate=100, Hook=80, Pattern=60, Tip=40 |
| **Insight Quotas** | `insight-selector.ts:123-221` | Number of insights per kind | Gate 2-3, Hook 2-3, Pattern 1-2, Tip 1-2 |

### DYNAMICS_KNOBS

| Name | File + Line | What It Controls | Current Value |
|------|-------------|------------------|---------------|
| **Pace Thresholds** | `ai-chat.service.ts:624-636` | When to apply fast/slow pace instructions | >=70 fast, <=30 slow |
| **Emoji Density Thresholds** | `ai-chat.service.ts:639-647` | When to apply heavy/minimal emoji instructions | >=60 heavy (2-3 per msg), <=20 minimal |
| **Flirtiveness Thresholds** | `ai-chat.service.ts:650-662` | When to apply high/low flirt instructions | >=70 high, <=25 low |
| **Hostility Thresholds** | `ai-chat.service.ts:665-675` | When to apply high/low pushback instructions | >=60 high, <=15 low |
| **Dryness Thresholds** | `ai-chat.service.ts:678-688` | When to apply dry/warm humor instructions | >=70 dry, <=20 warm |
| **Vulnerability Thresholds** | `ai-chat.service.ts:691-700` | When to apply high/low vulnerability instructions | >=70 high, <=25 low |
| **Escalation Speed Thresholds** | `ai-chat.service.ts:701-711` | When to apply fast/slow escalation instructions | >=70 fast, <=30 slow |
| **Randomness Thresholds** | `ai-chat.service.ts:712-722` | When to apply high/low randomness instructions | >=60 high, <=30 low |

**Note:** Dynamics values themselves (0-100) are stored in `MissionConfigV1.dynamics`, but the **thresholds** that convert numbers to prompt instructions are hard-coded.

### PROMPT_CONTENT_GROUPS

| Group | File + Line | What It's Used For | Count |
|-------|-------------|-------------------|-------|
| **Insight Templates** | `insight-catalog.v1.ts:74-424` | Post-session insights (gate fails, positive hooks, negative patterns, general tips) | ~67 templates |
| **Opening Templates** | `opening-templates.registry.ts:31-123` | Initial AI persona messages | 8 templates |
| **Micro Feedback Messages** | `ai-scoring.service.ts:201-222` | Per-message micro feedback based on score | 6 messages (score ranges) |
| **Premium Analysis Templates** | `ai-scoring.service.ts:399-706` | Deep session analysis for premium users | Multiple paragraphs with hard-coded structure |
| **Prompt Hooks** | `PromptHook` table | Real-time feedback hooks triggered during sessions | Stored in DB, conditions in JSON |

---

## 3. PROPOSED DATA MODEL — PROMPTS / SCORING / DYNAMICS

### A. Prompt Content Layer

#### **Entity: `PromptTemplate`**
```typescript
{
  id: string; // cuid
  code: string; // unique, e.g. "MICRO_FEEDBACK_S_PLUS"
  name: string; // "S+ Micro Feedback"
  kind: 'MICRO_FEEDBACK' | 'INSIGHT' | 'OPENING' | 'HOOK' | 'PREMIUM_ANALYSIS';
  layer: 'OPENINGS' | 'MID_CONVO' | 'RECOVERY' | 'INSIGHTS' | 'MICRO';
  textTemplate: string; // Supports {{variables}}
  variables: string[]; // ['score', 'trait', 'rarity']
  tags: string[]; // ['confidence', 'humor', 'high_performance']
  traitTags: string[]; // Which traits this relates to
  polarity: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  rarity?: 'S+' | 'S' | 'A' | 'B' | 'C'; // For micro feedback
  contextTags: string[]; // ['gate_fail', 'recovery', 'improvement']
  active: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### **Entity: `PromptPack`**
```typescript
{
  id: string; // cuid
  code: string; // unique, e.g. "DEFAULT_MICRO_FEEDBACK_V1"
  name: string; // "Default Micro Feedback Pack"
  description: string;
  layer: 'OPENINGS' | 'MID_CONVO' | 'RECOVERY' | 'INSIGHTS' | 'MICRO';
  templateIds: string[]; // References to PromptTemplate.id
  defaultTemplateId?: string; // For single-template packs
  active: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### **Entity: `HookTemplate`** (extends PromptTemplate)
```typescript
{
  // All PromptTemplate fields plus:
  conditions: {
    requiredTraits: TraitCondition[];
    forbiddenTraits: TraitCondition[];
    requiredMoodRange?: MoodCondition;
    requiredCounts?: CountCondition;
    segmentFilters?: SegmentFilters;
  };
  priority: number; // 1-100
  cooldownSeconds?: number;
  maxTriggersPerSession?: number;
}
```

#### **Entity: `InsightTemplate`** (extends PromptTemplate)
```typescript
{
  // All PromptTemplate fields plus:
  insightKind: 'GATE_FAIL' | 'POSITIVE_HOOK' | 'NEGATIVE_PATTERN' | 'GENERAL_TIP';
  weight: number; // For weighted selection
  cooldownMissions: number; // 3-5 typical
  requires?: {
    gateKey?: string;
    hookKey?: string;
    patternKey?: string;
  };
}
```

**How It Will Be Referenced:**
- `MissionConfigV1.openings.openerTemplateKey` → References `PromptTemplate.code` or `PromptPack.code`
- `MissionConfigV1.responseArchitecture.templatePackCode` → References `PromptPack.code`
- Scoring service → References `PromptPack.code` for micro feedback
- Insights engine → References `PromptPack.code` for insight templates
- Hooks service → References `HookTemplate` directly from DB

---

### B. Scoring Profiles

#### **Entity: `ScoringProfile`**
```typescript
{
  id: string; // cuid
  code: string; // unique, e.g. "DEFAULT_DATING_V1", "STRICT_COACHING_V2"
  name: string; // "Default Dating Profile"
  description: string;
  
  // Trait weights (for charismaIndex calculation)
  traitWeights: {
    confidence: number; // 0-1, sum should be ~1.0
    clarity: number;
    humor: number;
    tensionControl: number;
    emotionalWarmth: number;
    dominance: number;
  };
  
  // Base scoring thresholds
  lengthThresholds: {
    empty: number; // 0 chars
    veryShort: number; // <5 chars
    short: number; // <15 chars
    medium: number; // <40 chars
    long: number; // <80 chars
    veryLong: number; // >=80 chars
  };
  
  // Punctuation bonuses
  punctuationBonuses: {
    questionPerMark: number; // 2
    questionMax: number; // 10
    exclamationPerMark: number; // 3
    exclamationMax: number; // 12
  };
  
  // Position bonuses
  positionBonuses: number[]; // [0, 2, 4, 5] for indices 0, 1, 2, 3+
  
  // Rarity thresholds
  rarityThresholds: {
    sPlus: number; // 92
    s: number; // 84
    a: number; // 72
    b: number; // 58
    c: number; // <58
  };
  
  // Multipliers
  xpMultipliers: {
    sPlus: number; // 1.8
    s: number; // 1.5
    a: number; // 1.25
    b: number; // 1.0
    c: number; // 0.8
  };
  
  coinsMultipliers: {
    sPlus: number; // 1.7
    s: number; // 1.4
    a: number; // 1.2
    b: number; // 1.0
    c: number; // 0.7
  };
  
  // Pattern-based trait adjustments
  traitAdjustments: {
    questionMarkBonus: { trait: string; value: number }; // tensionControl +10
    emojiBonus: { trait: string; value: number }; // humor +20
    softLanguagePenalty: { trait: string; value: number }; // confidence -15
    leadingLanguageBonus: { trait: string; value: number }; // dominance +15
    warmWordsBonus: { trait: string; value: number }; // emotionalWarmth +15
  };
  
  // Filler words
  fillerWords: string[]; // ['like', 'um', 'uh', ...]
  
  // Flags
  strictMode: boolean; // If true, apply stricter validation
  softCoachingMode: boolean; // If true, more lenient feedback
  
  active: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**How Mission Selects ScoringProfile:**
- `PracticeMissionTemplate.scoringProfileCode` → References `ScoringProfile.code`
- If not set, fallback to category default: `MissionCategory.defaultScoringProfileCode`
- If category default not set, use global default: `"DEFAULT_DATING_V1"`

**How Scoring Service Reads Profile:**
- `AiScoringService.scoreSession()` loads `ScoringProfile` by code
- Uses profile values instead of hard-coded constants
- Formula logic stays in code, numbers come from DB

---

### C. Dynamics Profiles

#### **Entity: `DynamicsProfile`**
```typescript
{
  id: string; // cuid
  code: string; // unique, e.g. "FAST_PACED_V1", "SLOW_BUILD_V2"
  name: string; // "Fast Paced"
  description: string;
  
  // Dynamics values (0-100)
  pace: number;
  emojiDensity: number;
  flirtiveness: number;
  hostility: number;
  dryness: number;
  vulnerability: number;
  escalationSpeed: number;
  randomness: number;
  
  // Optional: Prompt instruction templates (if we want to customize the prompt text)
  instructionTemplates?: {
    pace?: string; // Custom instruction text
    emojiDensity?: string;
    // ... etc
  };
  
  active: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**How Mission Attaches DynamicsProfile:**
- `PracticeMissionTemplate.dynamicsProfileCode` → References `DynamicsProfile.code`
- If not set, fallback to category default: `MissionCategory.defaultDynamicsProfileCode`
- If category default not set, use global default: `"NEUTRAL_V1"`

**How Dynamics Are Applied:**
- `AiChatService.buildDynamicsBlock()` loads `DynamicsProfile` by code
- Uses profile values instead of reading from `MissionConfigV1.dynamics`
- Thresholds for converting numbers to prompt instructions stay in code (or could be in profile too)

**Supporting Global Defaults Per Category:**
- `MissionCategory.defaultDynamicsProfileCode` → References `DynamicsProfile.code`
- `MissionCategory.defaultScoringProfileCode` → References `ScoringProfile.code`
- Missions inherit category defaults if not explicitly set

---

### D. Linking to Missions and Categories

#### **PracticeMissionTemplate Extensions:**
```typescript
{
  // Existing fields...
  
  // New fields:
  scoringProfileCode?: string; // References ScoringProfile.code
  dynamicsProfileCode?: string; // References DynamicsProfile.code
  promptPackCodes?: string[]; // References PromptPack.code (for openings, micro feedback, insights)
  
  // Legacy support:
  // If scoringProfileCode is null, read from MissionConfigV1.difficulty (backward compat)
  // If dynamicsProfileCode is null, read from MissionConfigV1.dynamics (backward compat)
}
```

#### **MissionCategory Extensions:**
```typescript
{
  // Existing fields...
  
  // New fields:
  defaultScoringProfileCode?: string; // References ScoringProfile.code
  defaultDynamicsProfileCode?: string; // References DynamicsProfile.code
  defaultPromptPackCodes?: string[]; // References PromptPack.code
}
```

**Resolution Logic:**
1. Mission explicitly sets `scoringProfileCode` → use it
2. Mission doesn't set it → use `category.defaultScoringProfileCode`
3. Category doesn't set it → use global default `"DEFAULT_DATING_V1"`
4. Same logic for `dynamicsProfileCode` and `promptPackCodes`

---

## 4. DASHBOARD #2 UX SPEC

### Tab 1: "Prompt Packs & Templates"

#### **Layout:**
- **Left Panel:** List of PromptPacks (grouped by layer: OPENINGS, MID_CONVO, RECOVERY, INSIGHTS, MICRO)
- **Right Panel:** Editor for selected pack or template

#### **Prompt Pack List:**
- Table columns: Name, Layer, Template Count, Active, Actions (Edit, Duplicate, Delete)
- Filters: Layer dropdown, Active toggle, Search by name
- Actions: "Create New Pack" button

#### **Prompt Pack Editor:**
- Fields:
  - Code (read-only after creation)
  - Name
  - Description
  - Layer (dropdown)
  - Template Selection (multi-select from available templates)
  - Default Template (dropdown from selected templates)
  - Active toggle
- Actions: Save, Cancel, Preview (shows sample output)

#### **Template List (within Pack):**
- Table columns: Name, Kind, Tags, Polarity, Rarity, Active
- Filters: Kind dropdown, Trait tags (multi-select), Polarity dropdown, Context tags (multi-select)
- Actions: "Add Template" button, "Edit" button per row

#### **Template Editor:**
- Fields:
  - Code (read-only after creation)
  - Name
  - Kind (dropdown: MICRO_FEEDBACK, INSIGHT, OPENING, HOOK, PREMIUM_ANALYSIS)
  - Layer (dropdown)
  - Text Template (textarea with variable hints: {{score}}, {{trait}}, etc.)
  - Variables (multi-select or tags input)
  - Tags (multi-select)
  - Trait Tags (multi-select: confidence, clarity, humor, etc.)
  - Polarity (dropdown: POSITIVE, NEGATIVE, NEUTRAL)
  - Rarity (dropdown, only for MICRO_FEEDBACK)
  - Context Tags (multi-select)
  - Active toggle
- For HOOK templates, additional fields:
  - Conditions editor (trait conditions, mood conditions, etc.)
  - Priority (1-100 slider)
  - Cooldown Seconds (number input)
  - Max Triggers Per Session (number input)
- Actions: Save, Cancel, Preview, Test (for hooks, test against sample session)

---

### Tab 2: "Scoring Profiles"

#### **Layout:**
- **Left Panel:** List of ScoringProfiles
- **Right Panel:** Editor for selected profile

#### **Scoring Profile List:**
- Table columns: Name, Code, Active, Missions Using (count), Actions (Edit, Duplicate, Delete)
- Filters: Active toggle, Search by name
- Actions: "Create New Profile" button

#### **Scoring Profile Editor:**
- **Section 1: Basic Info**
  - Code (read-only after creation)
  - Name
  - Description
  - Active toggle

- **Section 2: Trait Weights**
  - Sliders for each trait (confidence, clarity, humor, tensionControl, emotionalWarmth, dominance)
  - Sum indicator (should be ~1.0, warning if not)
  - "Normalize" button (auto-adjusts to sum to 1.0)

- **Section 3: Length Thresholds**
  - Number inputs for each threshold (empty, veryShort, short, medium, long, veryLong)

- **Section 4: Punctuation Bonuses**
  - Number inputs: questionPerMark, questionMax, exclamationPerMark, exclamationMax

- **Section 5: Position Bonuses**
  - Number inputs for each position index (0, 1, 2, 3+)

- **Section 6: Rarity Thresholds**
  - Number inputs: sPlus, s, a, b, c

- **Section 7: Multipliers**
  - XP Multipliers: number inputs for each rarity
  - Coins Multipliers: number inputs for each rarity

- **Section 8: Trait Adjustments**
  - Table with rows for each adjustment:
    - Pattern (dropdown: questionMark, emoji, softLanguage, leadingLanguage, warmWords)
    - Trait (dropdown)
    - Value (number input, can be negative)

- **Section 9: Filler Words**
  - Tags input (add/remove words)

- **Section 10: Flags**
  - Checkboxes: strictMode, softCoachingMode

- **Section 11: Missions Using This Profile**
  - Table showing missions that reference this profile
  - Columns: Mission Name, Category, Active

- **Actions:** Save, Cancel, Preview (shows sample score calculation), Test (test against sample messages)

---

### Tab 3: "Dynamics Profiles"

#### **Layout:**
- **Left Panel:** List of DynamicsProfiles
- **Right Panel:** Editor for selected profile

#### **Dynamics Profile List:**
- Table columns: Name, Code, Active, Missions Using (count), Categories Using (count), Actions (Edit, Duplicate, Delete)
- Filters: Active toggle, Search by name
- Actions: "Create New Profile" button

#### **Dynamics Profile Editor:**
- **Section 1: Basic Info**
  - Code (read-only after creation)
  - Name
  - Description
  - Active toggle

- **Section 2: Dynamics Sliders**
  - Sliders for each dynamics field (0-100):
    - Pace
    - Emoji Density
    - Flirtiveness
    - Hostility
    - Dryness
    - Vulnerability
    - Escalation Speed
    - Randomness
  - Preview summary below sliders: "This profile = fast, flirty, high emoji, low randomness"

- **Section 3: Prompt Instruction Templates (Optional)**
  - Textarea for each dynamics field (custom instruction text)
  - "Use Default" checkbox per field

- **Section 4: Missions Using This Profile**
  - Table showing missions that reference this profile
  - Columns: Mission Name, Category, Active

- **Section 5: Categories Using This Profile**
  - Table showing categories that use this as default
  - Columns: Category Name, Active

- **Actions:** Save, Cancel, Preview (shows how prompt instructions would look), Test (test in sample conversation)

---

### Tab 4: "Mission Attachments"

#### **Layout:**
- **Left Panel:** Mission list (filterable by category)
- **Right Panel:** Attachment editor for selected mission

#### **Mission List:**
- Table columns: Mission Name, Category, Scoring Profile, Dynamics Profile, Prompt Packs, Actions (Edit)
- Filters: Category dropdown, Has Profile (dropdown: All, With Profile, Without Profile)
- Search: By mission name

#### **Mission Attachment Editor:**
- **Section 1: Mission Info**
  - Mission Name (read-only)
  - Category (read-only)

- **Section 2: Scoring Profile**
  - Dropdown: Select from ScoringProfiles
  - "Inherit from Category" checkbox (if checked, uses category default)
  - "Preview" button (shows profile details)

- **Section 3: Dynamics Profile**
  - Dropdown: Select from DynamicsProfiles
  - "Inherit from Category" checkbox
  - "Preview" button

- **Section 4: Prompt Packs**
  - Multi-select: Select from PromptPacks (grouped by layer)
  - "Inherit from Category" checkbox
  - For each selected pack, show:
    - Pack name
    - Layer
    - Template count
    - "View Templates" link

- **Section 5: Current Values (Read-Only)**
  - Shows what will be used (after inheritance resolution)
  - "Effective Scoring Profile: DEFAULT_DATING_V1 (from category)"
  - "Effective Dynamics Profile: NEUTRAL_V1 (explicitly set)"
  - "Effective Prompt Packs: [DEFAULT_MICRO_FEEDBACK_V1, DEFAULT_OPENINGS_V1]"

- **Actions:** Save, Cancel, Reset to Category Defaults

---

## 5. RISK & COMPATIBILITY ANALYSIS

### A. Backwards Compatibility

#### **Existing Missions with Hard-Coded Dynamics:**
- **Current State:** All missions have `MissionConfigV1.dynamics` with raw numbers (0-100)
- **Migration Path:**
  1. **Phase 1:** Introduce profiles, but keep reading `MissionConfigV1.dynamics` as fallback
  2. **Phase 2:** Create default profiles matching current hard-coded values
  3. **Phase 3:** Gradually migrate missions to use `dynamicsProfileCode`
  4. **Phase 4:** Eventually deprecate direct `MissionConfigV1.dynamics` (but keep for overrides)

#### **Existing Missions with Hard-Coded Scoring:**
- **Current State:** All missions use global scoring logic with difficulty adjustments
- **Migration Path:**
  1. **Phase 1:** Introduce `ScoringProfile`, but keep using current logic if profile not set
  2. **Phase 2:** Create default profile matching current hard-coded values
  3. **Phase 3:** Set `scoringProfileCode = "DEFAULT_DATING_V1"` for all existing missions
  4. **Phase 4:** Remove hard-coded values from code (read from profile always)

#### **Existing Prompt Content:**
- **Current State:** Insights, micro feedback, openings are hard-coded in TypeScript files
- **Migration Path:**
  1. **Phase 1:** Create `PromptTemplate` entries for all existing content
  2. **Phase 2:** Create `PromptPack` entries grouping templates
  3. **Phase 3:** Update code to read from DB instead of hard-coded
  4. **Phase 4:** Remove hard-coded content from code

---

### B. Migration Path (Step-by-Step)

#### **Step 1: Introduce Profiles (Backward Compatible)**
- Add `ScoringProfile`, `DynamicsProfile`, `PromptTemplate`, `PromptPack` tables
- Add `scoringProfileCode`, `dynamicsProfileCode`, `promptPackCodes` to `PracticeMissionTemplate`
- Add `defaultScoringProfileCode`, `defaultDynamicsProfileCode`, `defaultPromptPackCodes` to `MissionCategory`
- **Code:** Read profiles if set, otherwise fallback to current hard-coded logic
- **Result:** No breaking changes, existing missions continue to work

#### **Step 2: Seed Default Profiles**
- Create `DEFAULT_DATING_V1` scoring profile (matches current hard-coded values)
- Create `NEUTRAL_V1` dynamics profile (matches current default dynamics)
- Create prompt packs for existing content (micro feedback, insights, openings)
- **Result:** Profiles exist but not yet used

#### **Step 3: Migrate a Few Missions**
- Select 2-3 test missions
- Set their `scoringProfileCode`, `dynamicsProfileCode`, `promptPackCodes`
- Verify they work correctly
- **Result:** Proof of concept works

#### **Step 4: Gradual Migration**
- Migrate missions category by category
- Set category defaults first, then migrate missions
- **Result:** Most missions use profiles

#### **Step 5: Deprecate Hard-Coded Values**
- Remove hard-coded constants from code
- Always read from profiles (with fallback to defaults)
- **Result:** All missions use profiles, code is cleaner

---

### C. Safety & Guardrails

#### **Preventing Broken Scoring:**
1. **Validation Rules:**
   - Trait weights must sum to ~1.0 (warning if not, "Normalize" button)
   - Rarity thresholds must be descending (S+ > S > A > B > C)
   - Multipliers must be positive
   - Length thresholds must be ascending

2. **Bounds:**
   - All numeric fields have min/max bounds (0-100 for dynamics, 0-1 for weights, etc.)
   - Sliders in UI enforce bounds

3. **Preview Mode:**
   - "Preview" button shows sample score calculation
   - "Test" button runs scoring on sample messages
   - Shows warnings if profile seems broken (e.g., all weights = 0)

4. **Read-Only Mode:**
   - Option to mark profile as "locked" (read-only)
   - Only admins can edit locked profiles

#### **Preventing Insane Dynamics:**
1. **Validation Rules:**
   - All dynamics values must be 0-100
   - Preview shows human-readable summary ("fast, flirty, high emoji, low randomness")
   - Warning if all dynamics are extreme (e.g., all >80 or all <20)

2. **Bounds:**
   - Sliders enforce 0-100 range
   - Can't save out-of-bounds values

3. **Preview Mode:**
   - "Preview" shows how prompt instructions would look
   - "Test" shows sample conversation with these dynamics

4. **Template Validation:**
   - Prompt templates must have valid variable syntax
   - Test button validates template against sample data

#### **Admin Permissions:**
- Only users with `ADMIN` role can access Dashboard #2
- Audit log: Track who changed what profile when
- Version history: Keep old versions of profiles (soft delete)

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Database Schema (Week 1)
1. Create Prisma schema for:
   - `ScoringProfile`
   - `DynamicsProfile`
   - `PromptTemplate`
   - `PromptPack`
2. Add fields to `PracticeMissionTemplate`:
   - `scoringProfileCode`
   - `dynamicsProfileCode`
   - `promptPackCodes` (JSON array)
3. Add fields to `MissionCategory`:
   - `defaultScoringProfileCode`
   - `defaultDynamicsProfileCode`
   - `defaultPromptPackCodes` (JSON array)
4. Create migration
5. Run `prisma generate`

### Phase 2: Backend Services (Week 2)
1. Create `ScoringProfileService`:
   - CRUD operations
   - Load profile by code
   - Validation logic
2. Create `DynamicsProfileService`:
   - CRUD operations
   - Load profile by code
3. Create `PromptTemplateService`:
   - CRUD operations
   - Load templates by pack code
4. Update `AiScoringService`:
   - Load `ScoringProfile` if `scoringProfileCode` is set
   - Use profile values instead of hard-coded constants
   - Fallback to current logic if profile not set
5. Update `AiChatService`:
   - Load `DynamicsProfile` if `dynamicsProfileCode` is set
   - Use profile values instead of reading from `MissionConfigV1.dynamics`
   - Fallback to `MissionConfigV1.dynamics` if profile not set

### Phase 3: Seed Default Profiles (Week 2)
1. Create seed script to populate:
   - `DEFAULT_DATING_V1` scoring profile (matches current values)
   - `NEUTRAL_V1` dynamics profile (matches current default)
   - Prompt templates for existing micro feedback messages
   - Prompt templates for existing insight templates
   - Prompt templates for existing opening templates
   - Prompt packs grouping templates
2. Run seed script

### Phase 4: Admin API Endpoints (Week 3)
1. Create `ScoringProfilesController`:
   - `GET /v1/admin/scoring-profiles` - List all
   - `GET /v1/admin/scoring-profiles/:code` - Get one
   - `POST /v1/admin/scoring-profiles` - Create
   - `PUT /v1/admin/scoring-profiles/:code` - Update
   - `DELETE /v1/admin/scoring-profiles/:code` - Delete
2. Create `DynamicsProfilesController`:
   - Same CRUD endpoints
3. Create `PromptTemplatesController`:
   - Same CRUD endpoints
4. Create `PromptPacksController`:
   - Same CRUD endpoints
5. Update `MissionsAdminController`:
   - Add endpoints to get/set mission profile codes
   - Add endpoints to get/set category default profile codes

### Phase 5: Dashboard #2 UI (Week 4)
1. Add new tab "Engine Content + Knobs" to `dev-dashboard.html`
2. Implement "Prompt Packs & Templates" tab:
   - Pack list
   - Pack editor
   - Template list
   - Template editor
3. Implement "Scoring Profiles" tab:
   - Profile list
   - Profile editor with all sections
4. Implement "Dynamics Profiles" tab:
   - Profile list
   - Profile editor with sliders
5. Implement "Mission Attachments" tab:
   - Mission list
   - Attachment editor

### Phase 6: Testing & Migration (Week 5)
1. Test with 2-3 sample missions
2. Verify backward compatibility (missions without profiles still work)
3. Migrate one category to use profiles
4. Monitor for issues
5. Gradually migrate remaining categories

### Phase 7: Cleanup (Week 6)
1. Remove hard-coded constants from code (replace with profile reads)
2. Update documentation
3. Mark old hard-coded content as deprecated
4. Eventually remove deprecated code (future phase)

---

**END OF SCOUT REPORT**

