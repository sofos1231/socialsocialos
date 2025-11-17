// src/routes/dashboard.js
import { Router } from 'express';
import { getMiniStats } from '../services/dashboardService.js';
import { authMiddleware } from '../utils/authMiddleware.js';

const router = Router();

// GET /v1/dashboard/mini  →  { sessionsCount, averageScore }
router.get('/mini', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id; // set by authMiddleware from JWT
    const stats = await getMiniStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
