const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { readJSON } = require('../utils');

const ajv = new Ajv({ allErrors: true, useDefaults: true });
addFormats(ajv);
const schema = readJSON(path.join(process.cwd(), 'socialsocial', 'tools/agent/schema/practice.schema.json'));
const validate = ajv.compile(schema);

const valid = readJSON(path.join(process.cwd(), 'socialsocial', 'tools/agent/tests/fixtures/valid.json'));
const invalid = readJSON(path.join(process.cwd(), 'socialsocial', 'tools/agent/tests/fixtures/invalid.json'));

const ok = validate(valid);
if (!ok) { console.error(validate.errors); process.exit(1); }

const ok2 = validate(invalid);
if (ok2) { console.error('Invalid payload unexpectedly passed'); process.exit(1); }

console.log('schema ok');


