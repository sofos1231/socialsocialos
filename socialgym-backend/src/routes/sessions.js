import { Router } from 'express';
import pool from '../db/pool.js';
import { normalizeSession } from '../utils/xmlHandler.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const normalized = normalizeSession(req.body);
    const { userId, category, score, duration, feedback, missionId } =
      normalized;

    const result = await pool.query(
      `INSERT INTO practice_sessions
        (user_id, category, score, score_max, duration_minutes, feedback, mission_id)
       VALUES ($1,$2,$3,100,$4,$5,$6)
       RETURNING id, created_at;`,
      [userId, category, score, duration, feedback, missionId]
    );

    const row = result.rows[0];
    return res.status(201).json({
      sessionId: row.id,
      createdAt: row.created_at
    });
  } catch (err) {
    if (err && err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    // Postgres FK violation
    if (err && err.code === '23503') {
      return res.status(400).json({ error: 'Unknown userId (FK violation)' });
    }
    // eslint-disable-next-line no-console
    console.error('POST /v1/sessions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


