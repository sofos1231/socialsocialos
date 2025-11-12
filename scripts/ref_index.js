#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function findRefRoot() {
  const env = process.env.REF_ROOT;
  if (env && fs.existsSync(env)) return env;
  const local = path.resolve('./reference');
  if (fs.existsSync(local)) return local;
  const up = path.resolve('../reference');
  if (fs.existsSync(up)) return up;
  console.error('ERROR: reference folder not found. Set REF_ROOT=../reference (or absolute path).');
  process.exit(2);
}

const REF_ROOT = findRefRoot();
const IDX_DIR = path.resolve('./reference_index');
if (!fs.existsSync(IDX_DIR)) {
  console.error('ERROR: reference_index missing in current project');
  process.exit(3);
}

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(p));
    else files.push(p);
  }
  return files;
}

const all = walk(REF_ROOT);
const manifestPath = path.join(IDX_DIR, 'MANIFEST.yaml');
const chunkmapPath = path.join(IDX_DIR, 'CHUNKMAP.ndjson');

let manifest = "# Auto-generated manifest\n";
let chunks = "# ndjson lines follow\n";

for (const fp of all) {
  const rel = path.relative(process.cwd(), fp).replace(/\\/g, '/');
  const txt = fs.readFileSync(fp, 'utf8');
  const lines = txt.split('\n').length;
  manifest += `- file: ${rel}\n  bytes: ${Buffer.byteLength(txt, 'utf8')}\n  lines: ${lines}\n  tags: []\n`;
  chunks += JSON.stringify({ file: rel, chunks: [{ start: 1, end: lines }] }) + '\n';
}

fs.writeFileSync(manifestPath, manifest);
fs.writeFileSync(chunkmapPath, chunks);
console.log(`Indexed ${all.length} files from ${REF_ROOT}`);
