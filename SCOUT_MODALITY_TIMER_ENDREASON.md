# SocialGym Mission Modality + Timer + End-Reason Instrumentation — Proof-Based Scout Report

**Date:** 2025-01-XX  
**Scope:** Evidence-based audit for mission modality (CHAT vs REAL_LIFE), timer rules, STT routing, end-reason instrumentation  
**Status:** SCOUT ONLY — NO CODE CHANGES

---

## 1) Mission Kind/Modality — Current State

### Finding 1.1: STT Screen Exists (Separate from Chat)

**File:** `socialsocial/src/screens/VoicePracticeScreen.tsx`

**Lines 46-184:** Complete STT screen implementation
```typescript
export default function VoicePracticeScreen({ navigation }: Props) {
  const [topic, setTopic] = useState('First date opener – voice');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<VoicePracticeResponse | null>(null);

  const runMission = async () => {
    const payload: VoicePracticeRequest = {
      topic,
      transcript: trimmed,
    };
    const res = await createVoicePracticeSession(token, payload);
    // ... scoring happens server-side
  };
```

**Why it matters:** STT screen exists but is **separate** from chat. User pastes transcript manually (line 147: "Paste the speech-to-text output here…"). No real-time STT integration yet.

---

### Finding 1.2: STT Screen Navigation Wiring

**File:** `socialsocial/src/navigation/index.tsx`

**Lines 45-48:** STT screen registered in PracticeStack
```typescript
<PracticeStack.Screen
  name="VoicePracticeSession"
  component={VoicePracticeScreen}
/>
```

**File:** `socialsocial/src/navigation/types.ts`

**Lines 75-77:** Route params
```typescript
VoicePracticeSession: {
  topic: string;
};
```

**Why it matters:** STT screen is accessible via `navigation.navigate('VoicePracticeSession', { topic: '...' })`, but **not automatically routed** from mission start. It's a separate flow.

---

### Finding 1.3: No "Toggle to Chat" Mechanism

**File:** `socialsocial/src/screens/VoicePracticeScreen.tsx`

**Evidence:** No navigation to `PracticeSession` from `VoicePracticeScreen`. Screen only has:
- `handleViewStats()` → navigates to StatsTab
- `handleBackToMissions()` → navigates to PracticeHub

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Lines 190-201:** Mic button exists but not wired
```typescript
const handleMicPress = () => {
  if (isRecording) {
    setIsRecording(false);
    return;
  }
  setIsRecording(true);
  Alert.alert(
    'Voice input',
    'Speech-to-text is not wired yet. For now, type your message manually.',
    [{ text: 'OK', onPress: () => setIsRecording(false) }],
  );
};
```

**Why it matters:** Chat screen has mic button UI (lines 552-556) but shows alert. No toggle between STT and chat modes exists.

---

### Finding 1.4: Voice Support Flag Exists (But Not Used for Routing)

**File:** `backend/prisma/schema.prisma`

**Line 192:** Template has `isVoiceSupported` field
```prisma
isVoiceSupported Boolean @default(true)
```

**File:** `backend/src/modules/missions-admin/dto/admin-mission.dto.ts`

**Line 149:** DTO accepts `isVoiceSupported`
```typescript
@IsOptional()
@IsBoolean()
isVoiceSupported?: boolean;
```

**Why it matters:** `isVoiceSupported` exists in DB but **not used for routing**. Mission Road always navigates to `PracticeSession` (chat), never checks this flag.

---

### Finding 1.5: Voice Endpoint Exists (Separate from Chat)

**File:** `socialsocial/src/api/practice.ts`

**Lines 27-38:** Voice endpoint call
```typescript
export async function createVoicePracticeSession(
  token: string,
  payload: VoicePracticeRequest,
): Promise<VoicePracticeResponse> {
  const res = await apiClient.post('/practice/voice', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}
```

**File:** `backend/src/modules/practice/practice.controller.ts`

**Evidence:** **NO `/practice/voice` endpoint found in controller.** Only `POST /practice/session` exists (line 20).

**Why it matters:** FE calls `/practice/voice` but backend endpoint is **missing**. This is a broken/unimplemented feature.

---

## 2) Timer System Reality

### Finding 2.1: Backend — timeLimitSec Field Exists

**File:** `backend/prisma/schema.prisma`

**Line 183:** Template has `timeLimitSec` field
```prisma
timeLimitSec Int @default(30) // per user message
```

**File:** `backend/src/modules/practice/practice.service.ts`

**Line 357:** Template loading includes `timeLimitSec`
```typescript
select: {
  id: true,
  difficulty: true,
  goalType: true,
  maxMessages: true,
  timeLimitSec: true,  // <-- loaded but not used
  wordLimit: true,
  aiContract: true,
  aiStyle: true,
},
```

**Why it matters:** `timeLimitSec` is loaded from template but **never used** in mission state computation or deadline tracking.

---

### Finding 2.2: Backend — No Timer Logic Implemented

**File:** `backend/src/modules/practice/practice.service.ts`

**Lines 205-256:** `computeMissionState()` function
```typescript
function computeMissionState(
  messageScores: number[],
  policy: Required<MissionStatePayload>['policy'],
): MissionStatePayload {
  // ... computes status, progress, mood
  // NO timer/deadline logic
  // NO timeout failure
  // NO per-message deadline tracking
}
```

**Evidence:** No deadline fields, no timeout checks, no timer expiration logic anywhere in `PracticeService` or `SessionsService`.

**Why it matters:** Timer system is **completely missing** from backend. `timeLimitSec` is stored but never enforced.

---

### Finding 2.3: Frontend — No Countdown UI

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Evidence:** No timer countdown component, no deadline tracking, no timeout handling. Only `setTimeout` for scroll animations (line 130).

**File:** `socialsocial/components/MissionScreen.js` (old component)

**Lines 36, 61-72:** Has timer countdown (but this component is not used)
```javascript
const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes

useEffect(() => {
  const timer = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) {
        clearInterval(timer);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

**Why it matters:** Old `MissionScreen.js` has timer UI, but current `PracticeScreen.tsx` does not. Timer UI is **missing** in active codebase.

---

### Finding 2.4: Frontend — No Per-Message Timer Handling

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Evidence:** `sendMessage()` function (lines 289-360) has no timer reset, no deadline tracking, no timeout checks.

**Why it matters:** Even if backend enforced timers, FE has no UI to show countdown or handle timeouts.

---

## 3) Minimal Contract Additions Needed

### A) Mission Modality Policy

**Proposed Location:** Resolved session payload (not template `aiContract`)

**Reasoning:**
- Modality is runtime decision (user can switch)
- Template `aiContract` is static mission rules
- Session `payload` already stores runtime config (FreePlay config, etc.)

**Exact JSON Shape:**
```typescript
// In PracticeSession.payload (or new resolvedConfig field)
{
  modality: {
    missionKind: "CHAT" | "REAL_LIFE",
    defaultInputMode: "TEXT" | "STT",
    allowSwitchToChat: boolean,
    scene: {
      backgroundKey: string,      // e.g., "bar_night", "cafe_day"
      ambianceKey: string,        // e.g., "loud", "quiet", "intimate"
      locationTag: string         // e.g., "BAR", "CAFE", "COLD_APPROACH"
    },
    timerPolicy: {
      enabled: boolean,
      secondsPerTurn: number,     // from template.timeLimitSec or override
      graceSeconds: number,        // e.g., 5
      strikesOnTimeout: number    // e.g., 1 (how many strikes per timeout)
    }
  }
}
```

**Where to Store:**
- **Template level:** Add `modalityConfig` JSON field to `PracticeMissionTemplate` (optional, defaults)
- **Session level:** Resolve in `PracticeService.runPracticeSession()` and store in `session.payload.modality`

**File Evidence:**
- `backend/src/modules/sessions/sessions.service.ts` lines 225-229: `payload` construction
- `backend/src/modules/practice/practice.service.ts` lines 484-491: `extraPayload` construction

---

### B) End Reason Instrumentation

**Proposed Location:** `MissionStatePayload` interface

**File:** `backend/src/modules/practice/practice.service.ts`

**Lines 37-57:** Current `MissionStatePayload` interface
```typescript
export interface MissionStatePayload {
  status: MissionStateStatus;
  progressPct: number;
  averageScore: number;
  totalMessages: number;
  remainingMessages?: number;
  mood?: MissionMood;
  policy?: { ... };
  disqualified?: boolean;
  disqualify?: DisqualifyResult | null;
}
```

**Exact Additions:**
```typescript
export interface MissionStatePayload {
  // ... existing fields ...
  
  // NEW:
  endReasonCode?: EndReasonCode | null;  // only set when status !== 'IN_PROGRESS'
  endReasonMeta?: Record<string, any> | null;
}

type EndReasonCode =
  | 'OBJECTIVE_SUCCESS'
  | 'OBJECTIVE_FAIL'
  | 'GATE_FAIL'
  | 'STRIKES_EXCEEDED'
  | 'TIMER_EXPIRED'
  | 'MAX_MESSAGES_REACHED'
  | 'MOOD_COLLAPSE'
  | 'ABORTED_BY_USER'
  | 'DISQUALIFIED';  // existing disqualify → endReasonCode
```

**Where MissionState is Constructed:**

**File:** `backend/src/modules/practice/practice.service.ts`

**Lines 205-256:** `computeMissionState()` function
```typescript
function computeMissionState(
  messageScores: number[],
  policy: Required<MissionStatePayload>['policy'],
): MissionStatePayload {
  // ... existing logic ...
  
  let status: MissionStateStatus = 'IN_PROGRESS';
  if (totalUserMessages >= policy.maxMessages) {
    status = averageScore >= policy.successScore ? 'SUCCESS' : 'FAIL';
    // NEW: set endReasonCode here
    // endReasonCode = averageScore >= policy.successScore 
    //   ? 'OBJECTIVE_SUCCESS' 
    //   : 'OBJECTIVE_FAIL';
    // endReasonMeta = { finalScore: averageScore, threshold: policy.successScore };
  }
  
  return {
    status,
    // ... existing fields ...
    // NEW: endReasonCode, endReasonMeta
  };
}
```

**Lines 505-515:** Disqualify path (already sets status to 'FAIL')
```typescript
const missionState: MissionStatePayload = {
  status: 'FAIL',
  // ... existing fields ...
  disqualified: true,
  disqualify,
  // NEW: endReasonCode: 'DISQUALIFIED',
  // NEW: endReasonMeta: { code: disqualify.code, matchedText: disqualify.matchedText }
};
```

**Why it matters:** `computeMissionState()` is the **single source of truth** for mission state. All end reasons must be set here.

---

## 4) UI Routing Implications

### Finding 4.1: Mission Road Start Flow

**File:** `socialsocial/src/screens/MissionRoadScreen.tsx`

**Lines 104-120:** Mission start handler
```typescript
const handleStart = async (mission: Mission) => {
  try {
    const res = await startMission(mission.id);
    const templateId = res?.mission?.templateId ?? mission.id;
    
    navigation.navigate('PracticeSession', {  // <-- Always navigates to chat
      missionId: mission.id,
      templateId,
      personaId: mission?.persona?.id,
      title: mission.title ?? 'Practice Mission',
    });
  } catch (err) {
    console.error('Start mission failed:', err);
  }
};
```

**Why it matters:** Mission Road **always** navigates to `PracticeSession` (chat). No modality check.

---

### Finding 4.2: FreePlay Start Flow

**File:** `socialsocial/src/screens/FreePlayConfigScreen.tsx`

**Evidence:** After config, navigates to `PracticeSession` with `freeplay` param (not shown in snippet, but inferred from navigation types).

**File:** `socialsocial/src/navigation/types.ts`

**Lines 52-73:** `PracticeSession` route params
```typescript
PracticeSession:
  | {
      missionId?: string;
      templateId?: string;
      personaId?: string;
      title?: string;
      mode?: FreePlayMode;
      topic?: string;
      freeplay?: FreePlayConfig;
    }
  | undefined;
```

**Why it matters:** FreePlay also navigates to `PracticeSession`. No modality routing.

---

### Finding 4.3: Minimal Routing Plan

**Proposed Changes:**

**1. Mission Road Start (`MissionRoadScreen.tsx` line 111):**
```typescript
// After startMission() call, check modality
const modality = res?.mission?.modalityConfig ?? { missionKind: 'CHAT' };

if (modality.missionKind === 'REAL_LIFE') {
  navigation.navigate('RealLifeSession', {  // NEW screen
    templateId,
    personaId: mission?.persona?.id,
    title: mission.title,
    modalityConfig: modality,
  });
} else {
  navigation.navigate('PracticeSession', {  // existing
    // ... existing params
  });
}
```

**2. FreePlay Config (`FreePlayConfigScreen.tsx`):**
```typescript
// After config, check if user selected REAL_LIFE
if (selectedModality === 'REAL_LIFE') {
  navigation.navigate('RealLifeSession', { freeplay: config });
} else {
  navigation.navigate('PracticeSession', { freeplay: config });
}
```

**3. New Screen Route:**
```typescript
// socialsocial/src/navigation/index.tsx
<PracticeStack.Screen
  name="RealLifeSession"
  component={RealLifeSessionScreen}  // NEW component
/>
```

**4. Toggle Mechanism (in RealLifeSessionScreen):**
```typescript
// If allowSwitchToChat === true, show button:
<TouchableOpacity onPress={() => {
  navigation.navigate('PracticeSession', {
    ...route.params,
    switchedFromRealLife: true,
  });
}}>
  <Text>Switch to Chat</Text>
</TouchableOpacity>
```

**Why it matters:** Minimal changes: add one new screen route, check modality in two places (Mission Road + FreePlay), add toggle button if allowed.

---

## 5) Mission Ending UX Hooks (Animation Mapping)

### Finding 5.1: Current End Handling

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Lines 235-240:** `finalizeMission()` function
```typescript
const finalizeMission = (rewards: SessionRewards, state: MissionStatePayload) => {
  setSessionRewards(rewards);
  setMissionState(state);
  setIsMissionComplete(true);
  setActiveSessionId(null);
};
```

**Lines 328-330:** End detection
```typescript
if (rewards && serverState?.status && isEnded(serverState.status)) {
  finalizeMission(rewards, serverState);
}
```

**Why it matters:** FE receives `missionState.status` ('SUCCESS' | 'FAIL') but has no `endReasonCode` to map to animations.

---

### Finding 5.2: Animation Mapping Location

**Proposed File:** `socialsocial/src/config/missionAnimations.ts` (NEW)

**Exact Mapping:**
```typescript
export type EndReasonCode =
  | 'OBJECTIVE_SUCCESS'
  | 'OBJECTIVE_FAIL'
  | 'GATE_FAIL'
  | 'STRIKES_EXCEEDED'
  | 'TIMER_EXPIRED'
  | 'MAX_MESSAGES_REACHED'
  | 'MOOD_COLLAPSE'
  | 'ABORTED_BY_USER'
  | 'DISQUALIFIED';

export const END_REASON_ANIMATION_MAP: Record<EndReasonCode, string> = {
  OBJECTIVE_SUCCESS: 'celebration',
  OBJECTIVE_FAIL: 'sad_face',
  GATE_FAIL: 'gate_closed',
  STRIKES_EXCEEDED: 'strike_out',
  TIMER_EXPIRED: 'clock_timeout',
  MAX_MESSAGES_REACHED: 'message_limit',
  MOOD_COLLAPSE: 'mood_crash',
  ABORTED_BY_USER: 'user_exit',
  DISQUALIFIED: 'blocked',
};

// Context-specific animations (modality-aware)
export function getAnimationForEndReason(
  endReasonCode: EndReasonCode | null,
  modality?: { missionKind?: string; scene?: { locationTag?: string } },
): string {
  if (!endReasonCode) return 'default';
  
  const base = END_REASON_ANIMATION_MAP[endReasonCode];
  
  // Modality-specific overrides
  if (modality?.missionKind === 'REAL_LIFE') {
    if (endReasonCode === 'TIMER_EXPIRED' && modality.scene?.locationTag === 'BAR') {
      return 'walk_away_bar';
    }
    if (endReasonCode === 'OBJECTIVE_FAIL' && modality.scene?.locationTag === 'WHATSAPP') {
      return 'whatsapp_blocked';
    }
  }
  
  return base;
}
```

**Usage in PracticeScreen:**
```typescript
// After finalizeMission()
const animationKey = getAnimationForEndReason(
  missionState.endReasonCode ?? null,
  route.params?.freeplay?.modality,
);
// Trigger animation based on animationKey
```

**Why it matters:** Single file maps all end reasons to animation keys. Modality-aware overrides for context-specific animations.

---

## 6) Deliverable Format

### What Exists Now (Proof Snippets)

**1. STT Screen:**
- ✅ `socialsocial/src/screens/VoicePracticeScreen.tsx` (lines 46-184)
- ✅ Navigation route: `VoicePracticeSession` (lines 45-48 in `navigation/index.tsx`)
- ❌ **NOT wired to mission start** — separate flow

**2. Voice Support Flag:**
- ✅ `backend/prisma/schema.prisma` line 192: `isVoiceSupported Boolean @default(true)`
- ❌ **NOT used for routing** — always goes to chat

**3. Timer Field:**
- ✅ `backend/prisma/schema.prisma` line 183: `timeLimitSec Int @default(30)`
- ✅ Loaded in `PracticeService` line 357
- ❌ **NOT enforced** — no deadline logic, no timeout checks

**4. Mission State:**
- ✅ `backend/src/modules/practice/practice.service.ts` lines 205-256: `computeMissionState()`
- ✅ Sets `status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL'`
- ❌ **NO endReasonCode** — only status, no reason

**5. Mic Button:**
- ✅ `socialsocial/src/screens/PracticeScreen.tsx` lines 190-201: `handleMicPress()`
- ❌ **NOT wired** — shows alert "Speech-to-text is not wired yet"

**6. Voice Endpoint:**
- ✅ FE calls `/practice/voice` (`socialsocial/src/api/practice.ts` line 31)
- ❌ **Backend endpoint MISSING** — no controller route found

---

### What's Missing

1. **Mission Modality Concept:**
   - No `missionKind` field (CHAT vs REAL_LIFE)
   - No `defaultInputMode` field (TEXT vs STT)
   - No `allowSwitchToChat` flag
   - No `scene` config (background, ambiance, location)

2. **Timer Enforcement:**
   - No deadline tracking per message
   - No timeout failure logic
   - No countdown UI
   - No grace period handling
   - No strikes on timeout

3. **End Reason Instrumentation:**
   - No `endReasonCode` in `MissionStatePayload`
   - No `endReasonMeta` JSON field
   - No mapping from status to reason codes

4. **STT Integration:**
   - No real-time STT (user pastes transcript manually)
   - No toggle between STT and chat modes
   - No STT screen routing from mission start

5. **Backend Voice Endpoint:**
   - FE calls `/practice/voice` but endpoint doesn't exist
   - `VoicePracticeScreen` works but uses separate flow

---

### Minimal Contract Changes (Exact JSON Shapes)

**A) Mission Modality Policy (in session payload):**
```json
{
  "modality": {
    "missionKind": "CHAT" | "REAL_LIFE",
    "defaultInputMode": "TEXT" | "STT",
    "allowSwitchToChat": true | false,
    "scene": {
      "backgroundKey": "bar_night",
      "ambianceKey": "loud",
      "locationTag": "BAR"
    },
    "timerPolicy": {
      "enabled": true,
      "secondsPerTurn": 30,
      "graceSeconds": 5,
      "strikesOnTimeout": 1
    }
  }
}
```

**B) End Reason (in MissionStatePayload):**
```json
{
  "status": "SUCCESS" | "FAIL" | "IN_PROGRESS",
  "endReasonCode": "OBJECTIVE_SUCCESS" | "OBJECTIVE_FAIL" | "GATE_FAIL" | "STRIKES_EXCEEDED" | "TIMER_EXPIRED" | "MAX_MESSAGES_REACHED" | "MOOD_COLLAPSE" | "ABORTED_BY_USER" | "DISQUALIFIED" | null,
  "endReasonMeta": {
    "finalScore": 85,
    "threshold": 70,
    "gateCode": "EARNED_COMFORT",
    "secondsLate": 12,
    "strikeCount": 3
  } | null
}
```

**Storage Location:**
- Modality: `PracticeSession.payload.modality` (resolved at session start)
- End reason: `MissionStatePayload.endReasonCode` + `endReasonMeta` (computed in `computeMissionState()`)

---

### Minimal Navigation/Routing Plan

**Changes Required:**

1. **Add modality check in Mission Road start** (`MissionRoadScreen.tsx` line 111):
   - After `startMission()`, check `res.mission.modalityConfig.missionKind`
   - If `REAL_LIFE` → navigate to `RealLifeSession`
   - If `CHAT` → navigate to `PracticeSession` (existing)

2. **Add modality check in FreePlay config** (`FreePlayConfigScreen.tsx`):
   - After config, check user-selected modality
   - Route to appropriate screen

3. **Add new screen route** (`navigation/index.tsx`):
   - `RealLifeSession` component (STT-focused UI)

4. **Add toggle button** (in `RealLifeSessionScreen`):
   - If `allowSwitchToChat === true`, show "Switch to Chat" button
   - Navigate to `PracticeSession` with same params

5. **Mission info dropdown** (works in both screens):
   - Same component, same data source
   - No changes needed

**Files Impacted:**
- `socialsocial/src/screens/MissionRoadScreen.tsx` (1 change)
- `socialsocial/src/screens/FreePlayConfigScreen.tsx` (1 change)
- `socialsocial/src/navigation/index.tsx` (1 new route)
- `socialsocial/src/screens/RealLifeSessionScreen.tsx` (NEW file)

---

### Risks / Contradictions

**Risk 1: Modality vs Dynamics/Style/Difficulty**

**Contradiction:** REAL_LIFE modality might conflict with certain dynamics/styles.

**Example:**
- REAL_LIFE + COLD_APPROACH dynamics → makes sense (bar scenario)
- REAL_LIFE + WARM style → might be contradictory (warm is chat-friendly, not real-life)

**Mitigation:**
- Validate modality + dynamics + style combinations in mission creation
- Reject invalid combos (e.g., REAL_LIFE + WARM = error)
- Pre-defined valid combinations

**Risk 2: Timer Policy vs Difficulty**

**Contradiction:** Timer might not scale with difficulty.

**Example:**
- EASY difficulty + 15s timer → too hard
- ELITE difficulty + 60s timer → too easy

**Mitigation:**
- Default timer policy based on difficulty:
  - EASY: 30s (or disabled)
  - MEDIUM: 25s
  - HARD: 20s
  - ELITE: 15s
- Allow per-mission override

**Risk 3: End Reason vs Existing Status**

**Contradiction:** `endReasonCode` duplicates information in `status`.

**Example:**
- `status: 'FAIL'` + `endReasonCode: 'TIMER_EXPIRED'` → redundant?

**Mitigation:**
- `status` is binary (SUCCESS/FAIL/IN_PROGRESS)
- `endReasonCode` is specific (WHY it failed/succeeded)
- Both are needed: status for logic, reason for UX

**Risk 4: STT vs Chat Mode Switching**

**Contradiction:** Switching modes mid-session might break state.

**Example:**
- User starts in STT mode, sends 2 voice messages
- Switches to chat, sends 1 text message
- Backend expects consistent input mode?

**Mitigation:**
- Store current input mode in session payload
- Backend accepts both TEXT and STT transcripts
- No state breakage (transcript is just messages)

---

### Open Questions (Blocking Design Decisions)

**Q1: Should modality be template-level or session-level?**

**Current Evidence:**
- Template has `isVoiceSupported` (boolean, template-level)
- FreePlay config is session-level (user chooses)

**Decision Needed:**
- **Option A:** Modality in template (`PracticeMissionTemplate.modalityConfig` JSON)
  - Pros: Mission Road missions have fixed modality
  - Cons: Can't switch mid-session
- **Option B:** Modality in session (`PracticeSession.payload.modality`)
  - Pros: User can choose (FreePlay), can switch
  - Cons: Mission Road missions need default from template

**Recommendation:** **Hybrid** — Template has default, session can override. Store resolved modality in session payload.

---

**Q2: Should timer be per-message or per-session?**

**Current Evidence:**
- `timeLimitSec` comment says "per user message" (schema line 183)
- No implementation exists

**Decision Needed:**
- **Option A:** Per-message timer (reset after each message)
  - Pros: Realistic (like real conversations)
  - Cons: Complex UI (countdown resets)
- **Option B:** Per-session timer (total time limit)
  - Pros: Simpler UI
  - Cons: Less realistic

**Recommendation:** **Per-message** (matches comment). Each message has its own deadline.

---

**Q3: Should STT be real-time or paste-transcript?**

**Current Evidence:**
- `VoicePracticeScreen` uses paste-transcript (line 147)
- `PracticeScreen` mic button shows alert (line 198)

**Decision Needed:**
- **Option A:** Real-time STT (mic → speech-to-text → send)
  - Pros: Realistic, better UX
  - Cons: Requires STT library integration (Expo Speech, etc.)
- **Option B:** Paste-transcript (current)
  - Pros: Simple, works now
  - Cons: Not realistic, manual step

**Recommendation:** **Phase 1: Paste-transcript** (keep current). **Phase 2: Real-time STT** (add later).

---

**Q4: Should endReasonCode be required when status !== IN_PROGRESS?**

**Current Evidence:**
- `status` can be SUCCESS/FAIL without reason
- No validation exists

**Decision Needed:**
- **Option A:** Required (enforce in `computeMissionState()`)
  - Pros: Always know why mission ended
  - Cons: Must handle all cases
- **Option B:** Optional (backward compatible)
  - Pros: Gradual migration
  - Cons: Some missions might not have reason

**Recommendation:** **Optional for Phase 1** (backward compatible). **Required for Phase 2** (after all end paths are instrumented).

---

**Q5: Where should scene config (background, ambiance) live?**

**Current Evidence:**
- FreePlay has `place` (TINDER, WHATSAPP, BAR, etc.) — `FreePlayConfigScreen.tsx` lines 38-45
- No background/ambiance concepts exist

**Decision Needed:**
- **Option A:** In modality config (as proposed)
  - Pros: All modality-related config in one place
  - Cons: Scene is visual, not behavioral
- **Option B:** Separate `sceneConfig` field
  - Pros: Separation of concerns
  - Cons: More fields to manage

**Recommendation:** **In modality config** (simpler, all related). Scene affects both UI (background) and AI behavior (ambiance → dynamics).

---

## Stop Condition

✅ **Proven:**
- STT screen exists but is separate from chat (not wired to mission start)
- Timer field exists but is not enforced (no deadline logic)
- Mission state has status but no endReasonCode
- Mic button exists but not wired (shows alert)

✅ **Specified:**
- Exact minimal contract for modality policy (JSON shape)
- Exact minimal contract for end reason (JSON shape)
- Storage locations (session payload, MissionStatePayload)
- Insertion points (computeMissionState, session payload construction)

**END OF REPORT**


