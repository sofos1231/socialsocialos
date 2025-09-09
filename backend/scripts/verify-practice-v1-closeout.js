#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const TMP = path.join(process.cwd(), 'tmp');
fs.mkdirSync(TMP, { recursive: true });

function req(method, route, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(route, BASE);
    const data = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const headers = {};
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = data.length; }
    if (token) { headers['Authorization'] = `Bearer ${token}`; }
    const r = http.request({ method, hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, headers }, (res) => {
      let chunks = '';
      res.on('data', (d) => (chunks += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, text: chunks }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  let pass = true;
  function save(name, obj) { fs.writeFileSync(path.join(TMP, name), JSON.stringify(obj, null, 2)); }

  // Auth proof
  const login = await req('POST', '/auth/login', { email: 'test@example.com' });
  if (login.status !== 200 || !login.json?.token) { console.error('Login failed', login); process.exit(1); }
  save('login.json', login.json);
  const token = login.json.token;

  const hub401 = await req('GET', '/practice/hub');
  save('hub_401.json', hub401);
  if (hub401.status !== 401) { console.error('Expected 401 hub without token'); pass = false; }
  const hub200 = await req('GET', '/practice/hub', undefined, token);
  save('hub_200.json', hub200.json);
  if (hub200.status !== 200) { console.error('Expected 200 hub with token'); pass = false; }

  // Missions; find a locked mission
  const missions = await req('GET', '/practice/missions', undefined, token);
  save('missions_for_closeout.json', missions.json);
  const locked = Array.isArray(missions.json) && missions.json.find(m => m.status?.status === 'locked');
  if (locked) {
    const lockStart = await req('POST', '/practice/start', { missionId: locked.id, mode: 'standard' }, token);
    save('start_locked_403.json', lockStart);
    if (lockStart.status !== 403) { console.error('Expected 403 for locked mission start'); pass = false; }
  }

  // Submit events
  const avail = Array.isArray(missions.json) && missions.json.find(m => m.status?.status === 'available');
  let sid;
  if (avail) {
    const s = await req('POST', '/practice/start', { missionId: avail.id, mode: 'standard' }, token);
    sid = s.json?.id;
  } else {
    const s = await req('POST', '/practice/start', { mode: 'quick' }, token);
    sid = s.json?.id;
  }
  if (!sid) { console.error('Start failed'); process.exit(1); }
  const submit = await req('POST', `/practice/submit/${sid}`, {}, token);
  save('submit_events.json', submit.json);
  if (submit.status !== 200 || !Array.isArray(submit.json?.events)) { console.error('Submit events missing'); pass = false; }

  // Quick complete (expect xp=5)
  const sq = await req('POST', '/practice/start', { mode: 'quick' }, token);
  const sidq = sq.json?.id;
  const cq1 = await req('POST', `/practice/complete/${sidq}`, {}, token);
  save('quick_complete.json', cq1.json);
  if (cq1.json?.reward?.xp !== 5) { console.error('Quick XP not 5'); pass = false; }

  // Shadow complete (expect xp=0)
  const ss = await req('POST', '/practice/start', { mode: 'shadow' }, token);
  const sids = ss.json?.id;
  const cs1 = await req('POST', `/practice/complete/${sids}`, {}, token);
  save('shadow_complete.json', cs1.json);
  if (cs1.json?.reward?.xp !== 0) { console.error('Shadow XP not 0'); pass = false; }

  if (!pass) process.exit(1);
  console.log('PASS practice v1 closeout');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
