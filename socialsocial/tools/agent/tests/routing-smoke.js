const reg = require('../../../data/practiceRegistry.json');
const slug = 'dating-basics';
const cat = (reg.categories || []).find((c) => c.slug === slug || c.id === slug);
if (!cat) { console.error('missing category in registry'); process.exit(1); }
if (!Array.isArray(cat.sessions) || cat.sessions.length === 0) { console.error('no sessions'); process.exit(1); }
console.log('routing ok');


