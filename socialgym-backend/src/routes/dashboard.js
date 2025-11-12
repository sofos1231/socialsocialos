import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!uuidRegex.test(userId)) {
    return res.status(400).json({ error: 'Invalid userId (must be UUID)' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS sessions_count,
         ROUND(AVG(score::numeric / NULLIF(score_max,0) * 100), 1) AS avg_score_pct
       FROM practice_sessions
       WHERE user_id = $1;`,
      [userId]
    );
    const row = rows[0] || { sessions_count: 0, avg_score_pct: null };
    const sessions_count = row.sessions_count ?? 0;
    const avg_score_pct =
      row.avg_score_pct === null || row.avg_score_pct === undefined
        ? 0
        : Number(row.avg_score_pct);
    return res.json({ sessions_count, avg_score_pct });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GET /v1/dashboard/:userId error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


