import dotenv from 'dotenv';
import express from 'express';
import xmlparser from 'express-xml-bodyparser';
import sessionsRouter from './src/routes/sessions.js';
import dashboardRouter from './src/routes/dashboard.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(
  xmlparser({
    explicitArray: false
  })
);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/v1/sessions', sessionsRouter);
app.use('/v1/dashboard', dashboardRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});

export default app;


