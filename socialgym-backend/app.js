// app.js (ESM)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import dashboardRouter from './src/routes/dashboard.js';
// import other routers here ...
// import authMiddleware if you mount protected routes here …

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean) }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// routes
app.use('/v1/dashboard', dashboardRouter);

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
