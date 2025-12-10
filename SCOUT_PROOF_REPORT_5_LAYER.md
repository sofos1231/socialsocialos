# SocialGym "5-Layer MissionConfig v1" — Proof-Based Scout Report

**Date:** 2025-01-XX  
**Scope:** Evidence-based audit for Phase 1 implementation  
**Status:** SCOUT ONLY — NO CODE CHANGES

---

## 1) Session Lifecycle Proof

### Finding 1.1: FE Code That Sends Chat Messages

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Lines 289-311:** Full payload construction and send
```typescript
const sendMessage = async () => {
  if (!canSend || isPreviewOnly) return;

  const text = input.trim();
  setInput('');

  const userMsg: ChatMsg = { id: makeId(), role: 'USER', content: text };
  const nextMessages: ChatMsg[] = [...messages, userMsg];
  setMessages(nextMessages);
  scrollToBottom();

  const payload: PracticeSessionRequest = {
    topic: topicForBackend,
    sessionId: activeSessionId ?? undefined,
    messages: [{ role: 'USER', content: text }],
    templateId,
    personaId,
  };

  try {
    setIsSending(true);
    const res = (await createPracticeSession(payload)) as PracticeSessionResponse;
```

**Why it matters:** Shows exact payload shape: `topic`, `sessionId` (optional), `messages[]`, `templateId`, `personaId`. No `freeplay` object in this snippet, but DTO supports it.

**File:** `socialsocial/src/api/practice.ts`

**Lines 16-21:** API call wrapper
```typescript
export async function createPracticeSession(
  payload: PracticeSessionRequest,
): Promise<PracticeSessionResponse> {
  const res = await apiClient.post('/practice/session', payload);
  return res.data;
}
```

**Why it matters:** Confirms endpoint is `POST /v1/practice/session` (baseURL is `/v1` from `apiClient.ts` line 10).

---

### Finding 1.2: sessionId Storage and Re-use

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Line 107:** State declaration
```typescript
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
```

**Line 302:** sessionId included in payload
```typescript
sessionId: activeSessionId ?? undefined,
```

**Line 313:** sessionId stored from response
```typescript
if (res?.sessionId) setActiveSessionId(res.sessionId);
```

**Why it matters:** `activeSessionId` is React state, persisted only in memory. On continuation, FE sends `sessionId` in payload. Backend uses it to load existing session.

---

### Finding 1.3: Backend Controller Endpoint + DTO Shape

**File:** `backend/src/modules/practice/practice.controller.ts`

**Lines 20-25:** Controller endpoint
```typescript
@Post('session')
@UseGuards(JwtAuthGuard)
async session(@Req() req: any, @Body() dto: CreatePracticeSessionDto) {
  const userId = req.user?.sub ?? req.user?.id;
  return this.practiceService.runPracticeSession(userId, dto);
}
```

**Why it matters:** Endpoint is `POST /v1/practice/session`, protected by JWT, extracts `userId` from token, passes DTO to service.

**File:** `backend/src/modules/practice/dto/create-practice-session.dto.ts`

**Lines 29-86:** Full DTO definition
```typescript
export class CreatePracticeSessionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  topic!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageInput)
  messages!: PracticeMessageInput[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  personaId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MISSION', 'FREEPLAY'])
  mode?: 'MISSION' | 'FREEPLAY';

  @IsOptional()
  @ValidateNested()
  @Type(() => FreePlayConfig)
  freeplay?: FreePlayConfig;

  @IsOptional()
  @IsString()
  aiStyleKey?: string;
}
```

**Why it matters:** DTO validates all fields. `sessionId` is optional (for continuation). `topic` required only if no `sessionId`. `messages` is array of `{role: 'USER'|'AI', content: string}`.

---

### Finding 1.4: PracticeSession.payload Writing

**File:** `backend/src/modules/sessions/sessions.service.ts`

**Lines 225-243:** Payload construction and assignment
```typescript
const basePayload: Record<string, any> = {
  ...(extraPayload && typeof extraPayload === 'object' ? extraPayload : {}),
  messageScores,
  transcript,
};

const baseSessionData = {
  userId,
  topic,
  score: finalScore,
  xpGained: summary.totalXp,
  coinsGained: summary.totalCoins,
  gemsGained: summary.totalGems,
  messageCount: messageScores.length,
  rarityCounts: summary.rarityCounts as any,
  payload: basePayload as any,
  // ... other fields
};
```

**Why it matters:** `payload` is JSON field on `PracticeSession`. Contains `messageScores`, `transcript`, plus any `extraPayload` (which includes FreePlay config from `PracticeService` lines 484-491). This is where 5-layer config could be stored.

---

## 2) Prompt Builder Proof

### Finding 2.1: Full buildSystemPrompt() Implementation

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts`

**Lines 205-295:** Complete function
```typescript
private buildSystemPrompt(params: {
  topic: string;
  mission: { id: string; code: string; title: string; description: string | null; aiStyle: AiStyle | null; } | null;
  category: { id: string; code: string; label: string } | null;
  persona: { id: string; code: string; name: string; description?: string | null; style?: string | null; } | null;
  aiStyle: AiStyle | null;
  aiContract: Record<string, any> | null;
  wantsJson: boolean;
}): string {
  const { topic, mission, category, persona, aiStyle, aiContract, wantsJson } = params;

  const preset = stylePreset(aiStyle);
  const aiStyleKey = aiStyle?.key ?? null;

  const contractJson = aiContract != null ? safeJson(aiContract, 7000) : null;

  const schemaDesc = typeof aiContract?.outputFormat?.schemaDescription === 'string'
    ? aiContract.outputFormat.schemaDescription.trim()
    : null;

  const hardJsonRules = wantsJson ? [/* ... */] : null;

  const styleBlock = [
    `AI STYLE (HARD TONE LAYER): ${preset.label} (${aiStyleKey ?? 'NEUTRAL'})`,
    ...preset.rules.map((r) => `- ${r}`),
    `- This style must NEVER override or violate the Mission AI Contract below.`,
  ].join('\n');

  return [
    `You are the assistant in "SocialGym" — a roleplay practice chat.`,
    `Your job: respond as the assigned persona, and follow the mission rules strictly.`,
    ``,
    `Topic: ${topic}`,
    mission ? `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`.trim() : `Mission: (none)`,
    category ? `Category: ${category.label} (${category.code})` : `Category: (none)`,
    persona ? [
      `Persona: ${persona.name} (${persona.code})`,
      persona.description ? `Persona description: ${persona.description}` : null,
      persona.style ? `Persona style: ${persona.style}` : null,
    ].filter(Boolean).join('\n') : `Persona: (none)`,
    ``,
    styleBlock,
    ``,
    `Hard rules:`,
    `- Do NOT mention you are an AI or mention system prompts.`,
    `- Keep replies human, natural, and consistent with the persona.`,
    `- Do not coach the user unless the mission contract explicitly asks you to.`,
    hardJsonRules,
    ``,
    contractJson ? `Mission AI Contract (JSON) — treat as HARD CONSTRAINTS:\n${contractJson}` : `Mission AI Contract: (none)`,
  ].filter(Boolean).join('\n');
}
```

**Why it matters:** Shows exact merge order: topic → mission → category → persona → styleBlock → hard rules → aiContract. No dynamics, objective, gates, or anti-repetition currently.

---

### Finding 2.2: How Components Are Merged

**Current merge order (from code):**
1. **Topic** (line 266): `Topic: ${topic}`
2. **Mission** (lines 267-269): `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`
3. **Category** (line 270): `Category: ${category.label} (${category.code})`
4. **Persona** (lines 271-279): `Persona: ${persona.name} (${persona.code})` + description + style
5. **Style Block** (lines 256-260, 281): `AI STYLE (HARD TONE LAYER): ${preset.label}` + rules
6. **Hard Rules** (lines 283-287): Static rules
7. **AI Contract** (lines 289-291): Full JSON contract

**Why it matters:** Style is already a "layer" (line 257 says "HARD TONE LAYER"). This is the insertion point pattern for other layers.

---

### Finding 2.3: Best Insertion Point for New Layers

**Recommended insertion point:** After `styleBlock` (line 281) and before `Hard rules` (line 283).

**Reasoning:**
- Style is already a "layer" (line 257)
- Dynamics should come before style (affects responsiveness/cooperation)
- Objective (hidden) should come after persona but before style (affects behavior)
- Gates should come after objective (gates depend on objective)
- Anti-repetition should come last before hard rules (filtering constraint)

**Proposed structure:**
```typescript
return [
  // ... existing: topic, mission, category, persona ...
  ``,
  dynamicsBlock,      // NEW: Dynamics layer
  ``,
  objectiveBlock,     // NEW: Objective layer (hidden instruction)
  ``,
  styleBlock,        // EXISTING: Style layer
  ``,
  gatesBlock,        // NEW: Gates layer (current gate states)
  ``,
  antiRepeatBlock,   // NEW: Anti-repetition instructions
  ``,
  `Hard rules:`,     // EXISTING
  // ... rest
];
```

**Why it matters:** This maintains logical flow: context → behavior layers → constraints → hard rules → contract.

---

## 3) Mission Builder Proof

### Finding 3.1: Real Mission Builder Source

**File:** `mission-road-builder-updated.txt` (NOT the bundled HTML)

**Lines 3280-3307:** `saveMission()` function
```javascript
async function saveMission() {
  let mission;
  try {
    mission = getMissionFormValues();
  } catch (e) {
    showToast('warning', 'Missing mission data', e.message);
    return;
  }
  const isUpdate = !!state.selectedMissionId;
  try {
    let res;
    if (isUpdate) {
      res = await api.put(
        API_ROUTES.updateMission(state.selectedMissionId),
        mission
      );
    } else {
      res = await api.post(API_ROUTES.createMission, mission);
      state.selectedMissionId = res.id;
    }
    showToast('ok', isUpdate ? 'Mission updated' : 'Mission created', mission.title);
    await reloadMissions();
    if (res?.id) selectMission(res.id);
  } catch (e) {
    console.error(error);
    showToast('error', 'Mission save failed', e.message);
  }
}
```

**Why it matters:** This is the actual source code (not bundled). Calls `getMissionFormValues()` to build payload, then POSTs to `/v1/admin/missions` or PUTs to `/v1/admin/missions/:id`.

---

### Finding 3.2: Payload Construction

**File:** `mission-road-builder-updated.txt`

**Lines 3090-3277:** `buildAiContractFromForm()` function (partial)
```javascript
function buildAiContractFromForm(mission) {
  const category = findCategory(mission.categoryId);
  const language = ui.aiMetaLanguageInput.value.trim() || 'en';
  const metaMaxTurns = Number(ui.aiMetaMaxTurnsInput.value || 0) || mission.maxMessages || 10;

  // scoring dimensions
  const dims = linesToArray(ui.aiScoringDimensionsTextarea.value).map((line) => {
    const parts = line.split('|');
    const name = (parts[0] || '').trim();
    const weight = Number((parts[1] || '').trim() || 0);
    const description = (parts[2] || '').trim();
    return { name, description, weight: isNaN(weight) ? 0 : weight, goodExamples: [], badExamples: [] };
  });

  // ... more contract building ...

  return {
    objectives: {
      primary: ui.aiObjectivesPrimaryInput.value.trim(),
      secondary: linesToArray(ui.aiObjectivesSecondaryTextarea.value),
      successCriteria: linesToArray(ui.aiObjectivesSuccessTextarea.value),
      failCriteria: linesToArray(ui.aiObjectivesFailTextarea.value),
      hardConstraints: {
        maxTurns: metaMaxTurns,
        maxWordsPerMessage: maxWords,
        bannedMoves: linesToArray(ui.aiConstraintsBannedTextarea.value),
        requiredMoves: linesToArray(ui.aiConstraintsRequiredTextarea.value),
      },
    },
    conversationRules: {
      toneRules: linesToArray(ui.aiRulesToneTextarea.value),
      responseLength: { minSentences: ..., maxSentences: ... },
      challengeLevel: ui.aiRulesChallengeInput.value.trim(),
      escalationRules: linesToArray(ui.aiRulesEscalationTextarea.value),
      energyRules: linesToArray(ui.aiRulesEnergyTextarea.value),
      testingRules: linesToArray(ui.aiRulesTestingTextarea.value),
    },
    scoringGuide: { dimensions: dims, rarityPatterns: rarity, scoreThresholds: {...} },
    realtimeFeedback: { enable: enableRealtime, ... },
    outputFormat: { mode: ui.aiOutputModeSelect.value || 'json', ... },
    safety: { disallowedTopics: ..., mustRefuseIf: ..., refusalStyle: ... },
  };
}
```

**Why it matters:** Shows `aiContract` structure includes `objectives` (primary, secondary, successCriteria, failCriteria), but NOT separate `dynamics`, `gates`, or formal 5-layer structure. This is stored in `PracticeMissionTemplate.aiContract` JSON field.

**Note:** `getMissionFormValues()` function not shown in snippet, but it calls `buildAiContractFromForm()` and combines with basic mission fields (code, title, description, categoryId, personaId, difficulty, etc.).

---

### Finding 3.3: Backend Endpoint and DTO

**File:** `backend/src/modules/missions-admin/missions-admin.controller.ts`

**Lines 75-81:** Create endpoint
```typescript
@Post()
createMission(@Body() dto: CreateMissionDto) {
  return this.missionsAdminService.createMission(dto);
}
```

**File:** `backend/src/modules/missions-admin/dto/admin-mission.dto.ts`

**Lines 40-176:** Full DTO
```typescript
export class CreateMissionDto {
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MaxLength(140) title?: string;
  @IsOptional() @IsString() @MaxLength(140) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() categoryCode?: string;
  @IsOptional() @IsString() personaId?: string;
  @IsOptional() @IsString() personaCode?: string;
  @IsOptional() @IsEnum(MissionGoalType) goalType?: MissionGoalType;
  @IsOptional() @IsEnum(MissionDifficulty) difficulty?: MissionDifficulty;
  @IsOptional() @IsString() @MaxLength(40) aiStyleKey?: string;
  @IsOptional() @IsString() @MaxLength(40) aiStyle?: string; // legacy alias
  @IsOptional() @IsInt() @Min(1) timeLimitSec?: number;
  @IsOptional() @IsInt() @Min(1) maxMessages?: number;
  @IsOptional() @IsInt() @Min(1) wordLimit?: number;
  @IsOptional() @IsInt() @Min(0) laneIndex?: number;
  @IsOptional() @IsInt() @Min(0) orderIndex?: number;
  @IsOptional() @IsBoolean() isVoiceSupported?: boolean;
  @IsOptional() @IsInt() @Min(0) baseXpReward?: number;
  @IsOptional() @IsInt() @Min(0) baseCoinsReward?: number;
  @IsOptional() @IsInt() @Min(0) baseGemsReward?: number;
  @IsOptional() aiContract?: any;  // <-- JSON field, no validation
  @IsOptional() @IsBoolean() active?: boolean;
}
```

**Why it matters:** DTO accepts `aiContract` as `any` (no validation). This is where mission builder stores the full contract. No fields for `dynamicsId`, `objective` (separate model), or `gates` (array). These would need to be added.

---

## 4) Powerups Economy Proof

### Finding 4.1: Wallet Storage and Updates

**File:** `backend/src/modules/sessions/sessions.service.ts`

**Lines 389-398:** Wallet update on session finalization
```typescript
// Update wallet
await tx.userWallet.update({
  where: { userId },
  data: {
    xp: wallet.xp + summary.totalXp,
    lifetimeXp: wallet.lifetimeXp + summary.totalXp,
    coins: wallet.coins + summary.totalCoins,
    gems: wallet.gems + summary.totalGems,
  },
});
```

**Why it matters:** Wallet is updated transactionally when session finalizes. `xp`, `coins`, `gems` are incremented. This is where powerup costs would be deducted.

**File:** `backend/prisma/schema.prisma`

**Lines 304-313:** UserWallet model
```prisma
model UserWallet {
  userId     String   @id
  xp         Int      @default(0)
  level      Int      @default(1)
  coins      Int      @default(0)
  gems       Int      @default(0)
  lifetimeXp Int      @default(0)
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Why it matters:** Wallet stores `gems` (for powerups), `coins`, `xp`. All updates happen server-side in transactions.

---

### Finding 4.2: Existing Powerups Controller/Endpoint

**File:** `backend/src/modules/powerups/powerups.controller.ts`

**Lines 1-15:** Controller definition
```typescript
@Controller('powerups')
@UseGuards(JwtAuthGuard)
export class PowerupsController {
  constructor(private readonly powerupsService: PowerupsService) {}

  @Get('available')
  async getAvailable(@Req() req: any) {
    const userId = req.user.sub ?? req.user.id;
    return this.powerupsService.getAvailableForUser(userId);
  }
}
```

**Why it matters:** **NO POST endpoint exists for using powerups.** Only `GET /v1/powerups/available` exists. Closest module is `PowerupsService` which only has `getAvailableForUser()`.

**File:** `backend/src/modules/powerups/powerups.service.ts`

**Lines 8-19:** Service implementation
```typescript
async getAvailableForUser(userId: string) {
  // Phase 2 refinement later: inventory + catalog
  const types = await this.prisma.powerUpType.findMany({
    where: { active: true },
  });

  const usages = await this.prisma.powerUpUsage.findMany({
    where: { userId },
  });

  return { types, usages };
}
```

**Why it matters:** Service only reads powerup types and usages. No execution logic exists. Powerup execution endpoint must be created.

---

## 5) Output Format

### Summary of Findings

1. **Session Lifecycle:** ✅ Complete
   - FE sends `{topic, sessionId?, messages[], templateId?, personaId?}` to `POST /v1/practice/session`
   - `sessionId` stored in React state, sent on continuation
   - Backend writes `payload` JSON field with `messageScores`, `transcript`, `extraPayload`

2. **Prompt Builder:** ✅ Complete structure, ❌ Missing new layers
   - `buildSystemPrompt()` merges: topic → mission → category → persona → style → hard rules → aiContract
   - Best insertion point: after `styleBlock`, before `Hard rules`
   - No dynamics, objective (hidden), gates, or anti-repetition currently

3. **Mission Builder:** ✅ Source found, ❌ Missing 5-layer fields
   - Source: `mission-road-builder-updated.txt` (not bundled HTML)
   - Calls `POST /v1/admin/missions` with `CreateMissionDto`
   - DTO has `aiContract?: any` (JSON), but no `dynamicsId`, `objective`, or `gates` fields

4. **Powerups Economy:** ✅ Wallet exists, ❌ No execution endpoint
   - Wallet updated in `SessionsService` transactionally
   - `GET /v1/powerups/available` exists
   - **NO POST endpoint for using powerups** — must be created

---

### Unknowns That Block Phase 1 Implementation

1. **Dynamics Model Location:** 
   - **Unknown:** Should `MissionDynamics` be a separate model or a field on `PracticeMissionTemplate`?
   - **Blocking:** Can't add `dynamicsId` to template until decision made
   - **Evidence needed:** Check if dynamics are mission-specific or reusable across missions

2. **Objective Storage:**
   - **Unknown:** Should objective be in `aiContract` JSON or separate `MissionObjective` model?
   - **Blocking:** Can't enforce objective structure without decision
   - **Evidence needed:** Check if objectives are reused or mission-specific

3. **Gate Evaluation Method:**
   - **Unknown:** Should gates be evaluated via AI (like message scoring) or rule-based?
   - **Blocking:** Can't implement `GateEvaluationService` without method
   - **Evidence needed:** Check existing AI evaluation patterns (see `AiScoringService`)

4. **Anti-Repetition Memory Scope:**
   - **Unknown:** Should anti-repetition track per user, per user+persona, or per user+persona+style+dynamics+objective?
   - **Blocking:** Can't design `AntiRepetitionMemory` model without scope
   - **Evidence needed:** Check if same persona/style combo should vary across missions

5. **Powerup Execution Timing:**
   - **Unknown:** Should powerups be executed during session (mid-conversation) or only at session start/end?
   - **Blocking:** Can't design powerup endpoint without timing
   - **Evidence needed:** Check if powerups need to modify in-flight AI responses

6. **Mission Builder Source Location:**
   - **Unknown:** Is `mission-road-builder-updated.txt` the active source, or is there a newer version?
   - **Blocking:** Can't update mission builder UI without knowing source
   - **Evidence needed:** Check if `backend/dashboards_bundle/mission-builder.html` is generated from this source

---

**END OF REPORT**



