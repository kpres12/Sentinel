// Contract Test Template (Jest + Ajv)
// Purpose: validate domain pack fixtures against canonical schemas and prevent breaking changes.
// How to use:
// 1) Place canonical JSON Schemas in `schemas/json/` with stable $id values.
// 2) Place sample fixtures under `domain-packs/<pack>/fixtures/<kind>/*.json` where kind ∈
//    [detection, track, mission_intent, task_assignment, vehicle_telemetry, action_ack].
// 3) In CI, run with NODE_ENV=test and (optionally) SUMMIT_API_URL to enable live smoke checks.
// 4) Add deps: `pnpm add -D ajv ajv-formats`.

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_DIR = process.env.SCHEMA_DIR || path.resolve(process.cwd(), 'schemas/json');
const PACKS_ROOT = process.env.PACKS_ROOT || path.resolve(process.cwd(), 'domain-packs');

// Map fixture kind -> schema $id (adjust if your $ids differ)
const SCHEMA_ID_MAP: Record<string, string> = {
  detection: 'urn:bigmt:schemas:detection:1-0-0',
  track: 'urn:bigmt:schemas:track:1-0-0',
  mission_intent: 'urn:bigmt:schemas:mission_intent:1-0-0',
  task_assignment: 'urn:bigmt:schemas:task_assignment:1-0-0',
  vehicle_telemetry: 'urn:bigmt:schemas:vehicle_telemetry:1-0-0',
  action_ack: 'urn:bigmt:schemas:action_ack:1-0-0'
};

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop() as string;
    for (const entry of fs.readdirSync(d)) {
      const p = path.join(d, entry);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) stack.push(p);
      else if (entry.endsWith('.json')) out.push(p);
    }
  }
  return out;
}

function loadSchemas(ajv: Ajv, schemaDir: string) {
  if (!fs.existsSync(schemaDir)) throw new Error(`Schema dir not found: ${schemaDir}`);
  const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const schema = readJson(path.join(schemaDir, f));
    ajv.addSchema(schema);
  }
}

describe('Contracts: Domain fixtures conform to canonical schemas', () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  loadSchemas(ajv, SCHEMA_DIR);

  const packs = fs.existsSync(PACKS_ROOT)
    ? fs.readdirSync(PACKS_ROOT).filter((p) => fs.statSync(path.join(PACKS_ROOT, p)).isDirectory())
    : [];

  if (packs.length === 0) {
    test('No domain packs found — template runs', () => {
      expect(true).toBe(true);
    });
    return;
  }

  for (const pack of packs) {
    const packRoot = path.join(PACKS_ROOT, pack);
    const fixturesRoot = path.join(packRoot, 'fixtures');
    const kinds = Object.keys(SCHEMA_ID_MAP);

    describe(`Pack: ${pack}`, () => {
      for (const kind of kinds) {
        const dir = path.join(fixturesRoot, kind);
        const files = listJsonFiles(dir);
        const schemaId = SCHEMA_ID_MAP[kind];
        const validate = ajv.getSchema(schemaId);

        test(`${kind} — schema registered`, () => {
          expect(validate).toBeTruthy();
        });

        if (!files.length) {
          test.skip(`${kind} — no fixtures`, () => {});
          continue;
        }

        for (const file of files) {
          test(`${kind} fixture: ${path.relative(packRoot, file)}`, () => {
            const data = readJson(file);
            const ok = validate ? validate(data) : false;
            if (!ok) {
              const errors = (validate && validate.errors) || [];
              const msg = ajv.errorsText(errors, { dataVar: kind });
              throw new Error(`Schema validation failed: ${msg}`);
            }
          });
        }
      }
    });
  }
});

// Optional live smoke check (disabled by default)
// To enable, set SUMMIT_API_URL and add a simple endpoint that returns a canonical object for validation.
// import fetch from 'node-fetch';
// describe('Live Summit.OS smoke', () => {
//   const base = process.env.SUMMIT_API_URL;
//   const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv); loadSchemas(ajv, SCHEMA_DIR);
//   const validate = ajv.getSchema('urn:bigmt:schemas:vehicle_telemetry:1-0-0');
//   const itOrSkip = base ? it : it.skip;
//   itOrSkip('GET /telemetry/sample conforms to schema', async () => {
//     const resp = await fetch(`${base}/telemetry/sample`);
//     const data = await resp.json();
//     const ok = validate ? validate(data) : false;
//     if (!ok) throw new Error(ajv.errorsText(validate?.errors || []));
//   });
// });
