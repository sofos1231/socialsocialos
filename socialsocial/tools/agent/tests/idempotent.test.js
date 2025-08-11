const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const registryPath = path.join(process.cwd(), 'socialsocial/data/practiceRegistry.json');
const payload = path.join(process.cwd(), 'socialsocial/tools/agent/tests/fixtures/valid.json');

execFileSync('node', ['socialsocial/tools/agent/generate.js', payload], { stdio: 'inherit' });
const before = fs.readFileSync(registryPath, 'utf8');
execFileSync('node', ['socialsocial/tools/agent/generate.js', payload], { stdio: 'inherit' });
const after = fs.readFileSync(registryPath, 'utf8');

if (before !== after) {
  console.error('Idempotency failed: registry changed on second run');
  process.exit(1);
}
console.log('idempotent ok');


