#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { readJSON, writeJSON, ensureDir, slugify, loadConfig, mergeRegistryCategory } = require('./utils');

const ajv = new Ajv({ allErrors: true, useDefaults: true });
addFormats(ajv);
const schema = readJSON(path.join(process.cwd(), 'socialsocial', 'tools/agent/schema/practice.schema.json'));
const validate = ajv.compile(schema);

function toSession(m) {
  const id = m.id ? slugify(m.id) : slugify(m.title);
  return {
    id,
    title: m.title,
    subtitle: m.subtitle || '',
    coverImage: m.coverImage || '🎯',
    tags: Array.isArray(m.tags) ? m.tags : [],
    xp: typeof m.xp === 'number' ? m.xp : (typeof m.xpReward === 'number' ? m.xpReward : 0),
    time: m.time || m.estDuration || '',
    progress: typeof m.progress === 'number' ? m.progress : 0,
    status: m.status || 'unlocked',
    type: m.type,
    difficulty: m.difficulty
  };
}

async function generate(input) {
  if (!validate(input)) {
    const details = validate.errors;
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Schema validation failed', details };
  }
  const cfg = loadConfig();
  const slug = slugify(input.category.slug || input.category.name);
  const practiceRootAbs = path.join(cfg.root, cfg.practiceRoot);
  const assetsRootAbs = path.join(cfg.root, cfg.assetsFolder);
  const registryAbs = path.join(cfg.root, cfg.registryPath);
  ensureDir(practiceRootAbs);
  ensureDir(assetsRootAbs);

  const missionsSorted = [...input.missions].sort((a, b) => a.order - b.order);
  const sessions = missionsSorted.map(toSession);

  const registryCategory = {
    id: slug,
    slug,
    title: input.category.name,
    subtitle: input.category.subtitle || '',
    icon: input.category.icon,
    sessions
  };

  const snapshotPath = path.join(practiceRootAbs, slug, 'category.json');
  writeJSON(snapshotPath, { category: input.category, missions: input.missions });

  const current = readJSON(registryAbs);
  const merged = mergeRegistryCategory(current.categories ? current : { categories: [] }, registryCategory);
  writeJSON(registryAbs, merged);

  return {
    ok: true,
    slug,
    filesWritten: [
      path.relative(cfg.root, snapshotPath).replace(/\\/g, '/'),
      path.relative(cfg.root, registryAbs).replace(/\\/g, '/')
    ],
    registryUpdated: true
  };
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node socialsocial/tools/agent/generate.js path/to/payload.json');
    process.exit(1);
  }
  const abs = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const payload = readJSON(abs);
  const result = await generate(payload);
  if (result.ok === false) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  module.exports = generate;
}


