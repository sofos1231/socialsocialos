#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TMP = path.join(process.cwd(), 'tmp');
fs.mkdirSync(TMP, { recursive: true });

function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = {};
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = data.length;
    }
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + (u.search || ''),
      headers,
    };
    const r = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try {
          const json = chunks ? JSON.parse(chunks) : null;
          resolve({ status: res.statusCode, json, text: chunks });
        } catch (e) {
          resolve({ status: res.statusCode, text: chunks });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  let pass = true;
  const summary = { lockedReasons: new Set(), cooldownExample: null, idempotentReplay: false, metricsDbIsString: false, metricsApiIsObject: false };

  // Ensure cooldown coverage by setting last completion for interview_intro
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const m = await prisma.mission.findUnique({ where: { key: 'interview_intro' } });
    if (m) {
      const now = new Date().toISOString();
      await prisma.userProgress.upsert({
        where: { userId: (await prisma.user.findFirst())?.id || 'test' },
        update: { lastCompletionByMission: JSON.stringify({ [m.id]: now }) },
        create: { userId: (await prisma.user.findFirst())?.id || 'test', lastCompletionByMission: JSON.stringify({ [m.id]: now }), completedMissions: JSON.stringify([]) },
      });
    }
    await prisma.$disconnect();
  } catch (e) {
    // ignore; will rely on seed
  }

  // 1) Health
  const health = await req('GET', `${BASE}/health`);
  fs.writeFileSync(path.join(TMP, 'health.json'), JSON.stringify(health.json, null, 2));
  if (health.status !== 200 || !health.json || !health.json.ok) { console.error('Health failed'); pass = false; }

  // 2) Hub
  const hub = await req('GET', `${BASE}/practice/hub`);
  fs.writeFileSync(path.join(TMP, 'hub.json'), JSON.stringify(hub.json, null, 2));
  if (hub.status !== 200 || !hub.json || !hub.json.user) { console.error('Hub failed'); pass = false; }

  // 3) Missions
  const missions = await req('GET', `${BASE}/practice/missions`);
  fs.writeFileSync(path.join(TMP, 'missions.json'), JSON.stringify(missions.json, null, 2));
  if (missions.status !== 200 || !Array.isArray(missions.json)) { console.error('Missions failed'); pass = false; }
  if (Array.isArray(missions.json)) {
    for (const m of missions.json) {
      const reason = m.status?.reason || m.lockedReason;
      if (reason) summary.lockedReasons.add(reason);
      if ((m.status?.reason === 'cooldown' || m.lockedReason === 'cooldown') && (m.status?.availableAt || m.availableAt)) {
        summary.cooldownExample = { id: m.id, availableAt: m.status?.availableAt || m.availableAt };
      }
    }
  }

  // 4) Start session (prefer available mission)
  let availableId = null;
  if (Array.isArray(missions.json)) {
    const avail = missions.json.find((m) => (m.status?.status || m.status) === 'available');
    availableId = avail?.id || null;
  }
  let startRes;
  if (availableId) {
    startRes = await req('POST', `${BASE}/practice/start`, { missionId: availableId, mode: 'standard' });
  } else {
    startRes = await req('POST', `${BASE}/practice/start`, { mode: 'quick' });
  }
  fs.writeFileSync(path.join(TMP, 'start.json'), JSON.stringify(startRes.json, null, 2));
  const sid = startRes.json?.id || startRes.json?.sessionId || null;
  if (!sid) { console.error('No session id from start'); pass = false; }

  // 5) Complete twice (send empty JSON body to satisfy content-type)
  const c1 = await req('POST', `${BASE}/practice/complete/${sid}`, {});
  fs.writeFileSync(path.join(TMP, 'complete1.json'), JSON.stringify(c1.json ?? c1.text, null, 2));
  const c2 = await req('POST', `${BASE}/practice/complete/${sid}`, {});
  fs.writeFileSync(path.join(TMP, 'complete2.json'), JSON.stringify(c2.json ?? c2.text, null, 2));
  if (c2.json?.idempotent === true) summary.idempotentReplay = true;
  const r1 = c1.json?.reward, r2 = c2.json?.reward;
  if (!summary.idempotentReplay && r1 && r2 && JSON.stringify(r1) === JSON.stringify(r2)) summary.idempotentReplay = true;

  // 6) Metrics proof: DB vs API
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const sess = await prisma.practiceSession.findUnique({ where: { id: sid } });
    const dbMetrics = sess?.metrics;
    fs.writeFileSync(path.join(TMP, 'db_metrics.txt'), String(dbMetrics).slice(0, 200));
    if (typeof dbMetrics === 'string') summary.metricsDbIsString = true;
    await prisma.$disconnect();
  } catch (e) {
    console.error('DB metrics read failed', e.message);
    pass = false;
  }
  const apiMetrics = c2.json?._debug?.metricsPreview ?? null;
  fs.writeFileSync(path.join(TMP, 'api_metrics.json'), JSON.stringify(apiMetrics ?? { note: 'metrics not exposed in this response' }, null, 2));
  if (apiMetrics && typeof apiMetrics === 'object') summary.metricsApiIsObject = true;

  const reasons = Array.from(summary.lockedReasons);
  const need = ['level','premium','prereq','cooldown'];
  const haveAllReasons = need.every((r) => reasons.includes(r));
  if (!haveAllReasons) { console.error('Missing locked reasons', { reasons }); pass = false; }
  if (!summary.cooldownExample) { console.error('No cooldown example with availableAt'); pass = false; }
  if (!summary.idempotentReplay) { console.error('Idempotent replay not proven'); pass = false; }
  if (!(summary.metricsDbIsString && summary.metricsApiIsObject)) { console.error('Metrics types not proven'); pass = false; }

  const out = {
    healthOk: health.status === 200 && health.json?.ok === true,
    haveAllReasons,
    reasons,
    cooldownExample: summary.cooldownExample,
    idempotentReplay: summary.idempotentReplay,
    metricsDbIsString: summary.metricsDbIsString,
    metricsApiIsObject: summary.metricsApiIsObject,
  };
  fs.writeFileSync(path.join(TMP, 'summary.json'), JSON.stringify(out, null, 2));
  console.log('SUMMARY');
  console.log(JSON.stringify(out, null, 2));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
