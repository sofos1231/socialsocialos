const fs = require('fs');
const path = require('path');

const readJSON = (p) => {
  try {
    return JSON.parse(fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '{}');
  } catch (e) {
    throw new Error(`Failed to parse JSON at ${p}: ${e.message}`);
  }
};

const writeJSON = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const slugify = (s) => String(s)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const loadConfig = () => {
  // When running from tools/agent directory, go up to socialsocial root
  const root = path.resolve(__dirname, '..');
  const cfgPath = path.join(root, 'agent.config.json');
  
  console.log('Debug paths:', {
    __dirname,
    root,
    cfgPath,
    exists: require('fs').existsSync(cfgPath)
  });
  
  const cfg = readJSON(cfgPath);
  console.log('Config loaded:', cfg);
  
  if (!cfg.registryPath || !cfg.practiceRoot || !cfg.assetsFolder) {
    throw new Error('agent.config.json missing required fields');
  }
  return { root, ...cfg };
};

const mergeRegistryCategory = (registry, cat) => {
  if (!registry || typeof registry !== 'object') registry = { categories: [] };
  if (!Array.isArray(registry.categories)) registry.categories = [];
  const idx = registry.categories.findIndex((c) => c.slug === cat.slug || c.id === cat.slug);
  if (idx >= 0) registry.categories[idx] = cat;
  else registry.categories.push(cat);
  registry.categories.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  return registry;
};

module.exports = { readJSON, writeJSON, ensureDir, slugify, loadConfig, mergeRegistryCategory };


