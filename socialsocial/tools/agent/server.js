#!/usr/bin/env node
const http = require('http');
const generate = require('./generate');

const server = http.createServer(async (req, res) => {
  // CORS for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // Generate endpoint
  if (!(req.method === 'POST' && req.url === '/generate')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Use POST /generate' }));
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    try {
      const data = body ? JSON.parse(body) : {};
      const result = await generate(data);
      const code = result.ok === false ? 400 : 200;
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, code: 'SERVER_ERROR', message: e.message }));
    }
  });
});

const PORT = process.env.PORT || 7777;
server.listen(PORT, () => console.log(`Agent server listening on http://localhost:${PORT}`));


