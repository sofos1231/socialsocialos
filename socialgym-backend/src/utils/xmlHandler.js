const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function unwrapRoot(object) {
  if (
    object &&
    typeof object === 'object' &&
    !Array.isArray(object) &&
    Object.keys(object).length === 1
  ) {
    const onlyKey = Object.keys(object)[0];
    const inner = object[onlyKey];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return inner;
    }
  }
  return object;
}

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function toNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw badRequest(`Missing required numeric field: ${fieldName}`);
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw badRequest(`Invalid number for ${fieldName}`);
  }
  return n;
}

export function normalizeSession(xmlOrJson) {
  if (!xmlOrJson || typeof xmlOrJson !== 'object') {
    throw badRequest('Invalid request body');
  }

  // unwrap possible XML root element like <PracticeSession>...</PracticeSession>
  const src = unwrapRoot(xmlOrJson);

  const userId = firstDefined(src.userId, src.user_id);
  const category = firstDefined(src.category, src.type);
  const scoreRaw = firstDefined(src.score, src.score_pct, src.scorePercent);
  const durationRaw = firstDefined(
    src.durationMinutes,
    src.duration_minutes,
    src.duration
  );
  const feedback = firstDefined(src.feedback, src.notes) ?? null;
  const missionId = firstDefined(src.missionId, src.mission_id) ?? null;

  if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
    throw badRequest('Invalid or missing userId (must be UUID)');
  }
  if (!category || typeof category !== 'string') {
    throw badRequest('Invalid or missing category');
  }

  const score = toNumber(scoreRaw, 'score');
  const duration = toNumber(durationRaw, 'durationMinutes');

  if (score < 0 || score > 100) {
    throw badRequest('score must be between 0 and 100');
  }
  if (duration <= 0) {
    throw badRequest('durationMinutes must be a positive number');
  }

  return {
    userId,
    category: String(category),
    score,
    duration,
    feedback: feedback === null ? null : String(feedback),
    missionId: missionId === null ? null : String(missionId)
  };
}

export default { normalizeSession };


