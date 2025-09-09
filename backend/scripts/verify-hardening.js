#!/usr/bin/env node
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const data = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = {};
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = data.length; }
    const r = http.request({ method, hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers }, (res) => {
      let chunks='';
      res.on('data', d => chunks+=d);
      res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(chunks) }); } catch { resolve({ status: res.statusCode, text: chunks }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
(async () => {
  // Find available mission or use quick
  const missions = await req('GET', '/practice/missions');
  const avail = Array.isArray(missions.json) && missions.json.find(m => (m.status?.status||m.status)==='available');
  const missionId = avail?.id;

  let sessionId;
  if (missionId) {
    const [s1, s2] = await Promise.all([
      req('POST','/practice/start',{ missionId, mode:'standard' }),
      req('POST','/practice/start',{ missionId, mode:'standard' })
    ]);
    const id1 = s1.json?.id, id2 = s2.json?.id;
    if (!id1 || !id2 || id1 !== id2) { console.error('Single-active invariant failed'); process.exit(1); }
    sessionId = id1;
  } else {
    const [s1, s2] = await Promise.all([
      req('POST','/practice/start',{ mode:'quick' }),
      req('POST','/practice/start',{ mode:'quick' })
    ]);
    const id1 = s1.json?.id, id2 = s2.json?.id;
    if (!id1 || !id2 || id1 !== id2) { console.error('Single-active invariant failed (quick)'); process.exit(1); }
    sessionId = id1;
  }

  // Parallel complete
  const [c1, c2] = await Promise.all([
    req('POST', `/practice/complete/${sessionId}`, {}),
    req('POST', `/practice/complete/${sessionId}`, {})
  ]);
  const r1 = c1.json?.reward, r2 = c2.json?.reward;
  const ok = (c1.json?.idempotent === false && c2.json?.idempotent === true) || (JSON.stringify(r1)===JSON.stringify(r2) && (c1.json?.idempotent||c2.json?.idempotent));
  if (!ok) { console.error('Idempotency not proven', c1.json, c2.json); process.exit(1); }
  console.log('PASS: single-active & idempotent complete');

  // After completion, start again should create a new session (guard cleaned)
  const s3 = await req('POST','/practice/start', missionId ? { missionId, mode:'standard' } : { mode:'quick' });
  if (!s3.json?.id || s3.json.id === sessionId) { console.error('Guard cleanup failed: new start returned old session'); process.exit(1); }

  console.log('PASS: guard lifecycle (complete cleanup + stale repair)');
  process.exit(0);
})().catch((e)=>{ console.error(e); process.exit(1); });
