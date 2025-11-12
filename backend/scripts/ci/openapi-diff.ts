/*
 Pragmatic OpenAPI drift checker (backend vs UAF subset)
 - Compares overlapping paths/methods and required top-level fields in requestBody and response schemas
*/
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

function fail(msg: string): never { console.error(`[OPENAPI-DRIFT] ${msg}`); process.exit(1) }
function ok(msg: string) { console.log(`[OK] ${msg}`) }

const backendRoot = process.cwd()
const uafRoot = path.resolve(backendRoot, '..', '..', 'ultimate app factory', 'app-foundry')

const backendSpec = YAML.parse(fs.readFileSync(path.join(backendRoot, 'openapi.yaml'), 'utf8'))
const uafSpecs = ['missions.yaml','wallet.yaml','stats.yaml','subscriptions.yaml','auth.yaml']
  .map(f => path.join(uafRoot, 'packages', 'contracts', 'openapi', f))
  .filter(p => fs.existsSync(p))
  .map(p => YAML.parse(fs.readFileSync(p, 'utf8')))

const backendPaths = backendSpec.paths || {}
const uafPaths = Object.assign({}, ...uafSpecs.map(s => s.paths || {}))

const overlaps: Array<{ path: string, method: string }> = []
for (const p of Object.keys(uafPaths)) {
  if (backendPaths[p]) {
    for (const m of Object.keys(uafPaths[p])) {
      if (backendPaths[p][m]) overlaps.push({ path: p, method: m })
    }
  }
}

const diffs: string[] = []

function reqRequired(op: any): string[] {
  const schema = op?.requestBody?.content?.['application/json']?.schema
  if (!schema) return []
  return Array.isArray(schema.required) ? schema.required : []
}

function respProps(op: any, code = '200'): string[] {
  const schema = op?.responses?.[code]?.content?.['application/json']?.schema
  if (!schema || !schema.properties) return []
  return Object.keys(schema.properties)
}

for (const o of overlaps) {
  const b = backendPaths[o.path][o.method]
  const u = uafPaths[o.path][o.method]
  // required request fields
  const bReq = new Set(reqRequired(b))
  const uReq = new Set(reqRequired(u))
  for (const r of uReq) if (!bReq.has(r)) diffs.push(`${o.method.toUpperCase()} ${o.path}: missing required request field '${r}'`)
  // response property names
  const bProps = new Set(respProps(b))
  const uProps = new Set(respProps(u))
  for (const p of uProps) if (!bProps.has(p)) diffs.push(`${o.method.toUpperCase()} ${o.path}: missing response property '${p}'`)
}

if (diffs.length) fail(diffs.join('\n'))
ok('Backend OpenAPI matches UAF subset for overlapping routes')

