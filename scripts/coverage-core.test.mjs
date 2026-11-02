import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { collectCoverage, coveragePlan } from './coverage-core.mjs';

test('measures both branch paths across workers and keeps unimported TSX at zero', async () => {
  const root = mkdtempSync(join(tmpdir(), 'onze-coverage-'));
  try {
    mkdirSync(join(root, 'app'));
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'raw'));
    const source = join(root, 'src/rule.ts');
    const untested = join(root, 'app/card.tsx');
    writeFileSync(
      source,
      `export interface Account { score: number }\nexport function classify(score: number) {\n  if (score > 0) return 'positive';\n  return 'other';\n}\n`,
    );
    writeFileSync(
      untested,
      `export default function Card({ready}: {ready: boolean}) {\n  return ready ? <Text>Ready</Text> : <Text>Wait</Text>;\n}\n`,
    );
    writeFileSync(join(root, 'src/ignored.d.ts'), 'declare const unused: string;');
    const plan = coveragePlan(root);
    assert.equal(Object.keys(plan.baseline).length, 2);
    const manifestPath = join(root, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(plan.sources));
    function execute(score, fail = false) {
      return spawnSync(
        process.execPath,
        [
          '--import',
          new URL('./coverage-register.mjs', import.meta.url).href,
          '--input-type=module',
          '-e',
          `import { classify } from ${JSON.stringify(pathToFileURL(source).href)}; classify(${score}); process.exitCode = ${fail ? 1 : 0};`,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            ONZE_COVERAGE_MANIFEST: manifestPath,
            ONZE_COVERAGE_RAW: join(root, 'raw'),
          },
        },
      );
    }
    const first = execute(1);
    assert.equal(first.status, 0, first.stderr);
    const partial = await collectCoverage(plan, join(root, 'raw'));
    assert.ok(Object.values(plan.baseline[source].s).every((count) => count === 0));
    assert.equal(partial.map.fileCoverageFor(source).toSummary().branches.pct, 50);
    assert.equal(partial.map.fileCoverageFor(untested).toSummary().branches.total, 2);
    assert.equal(partial.map.fileCoverageFor(untested).toSummary().lines.covered, 0);
    assert.equal(partial.map.fileCoverageFor(source).getLineCoverage()[1], undefined);
    const second = execute(-1, true);
    assert.equal(second.status, 1, second.stderr);
    const combined = await collectCoverage(plan, join(root, 'raw'));
    assert.equal(combined.map.fileCoverageFor(source).toSummary().branches.pct, 100);
    assert.equal(combined.map.fileCoverageFor(untested).toSummary().branches.covered, 0);
    assert.equal(combined.map.getCoverageSummary().branches.total, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Node and Jest share counters, preserve untested sources and invalidate the unmetered cache', async () => {
  const root = mkdtempSync(join(tmpdir(), 'onze-shared-coverage-'));
  try {
    mkdirSync(join(root, 'app'));
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, 'raw'));
    const source = join(root, 'src/rule.ts');
    const untouched = join(root, 'app/untested.tsx');
    writeFileSync(
      source,
      `export function classify(value: number) {\n  if (value > 0) return 'positive';\n  return 'other';\n}\n`,
    );
    writeFileSync(untouched, `export const Untested = () => <Text>Untested</Text>;\n`);
    writeFileSync(
      join(root, 'component.test.ts'),
      `const { classify } = require('./src/rule');\ntest('opposite branch in Jest', () => expect(classify(0)).toBe('other'));\n`,
    );
    const config = {
      rootDir: root,
      testMatch: ['**/component.test.ts'],
      testEnvironment: resolve('tests/coverage-environment.cjs'),
      transform: { '\\.[jt]sx?$': resolve('tests/transformer.cjs') },
      cacheDirectory: join(root, 'cache'),
    };
    const args = [
      resolve('node_modules/jest/bin/jest.js'),
      '--runInBand',
      '--config',
      JSON.stringify(config),
    ];
    const warm = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(warm.status, 0, warm.stderr);
    const plan = coveragePlan(root);
    const manifest = join(root, 'manifest.json');
    writeFileSync(manifest, JSON.stringify(plan.sources));
    const env = {
      ...process.env,
      ONZE_COVERAGE_MANIFEST: manifest,
      ONZE_COVERAGE_RAW: join(root, 'raw'),
    };
    const unit = spawnSync(
      process.execPath,
      [
        '--import',
        new URL('./coverage-register.mjs', import.meta.url).href,
        '--input-type=module',
        '-e',
        `import { classify } from ${JSON.stringify(pathToFileURL(source).href)}; classify(1);`,
      ],
      { encoding: 'utf8', env },
    );
    assert.equal(unit.status, 0, unit.stderr);
    const before = await collectCoverage(plan, join(root, 'raw'));
    assert.equal(before.map.fileCoverageFor(source).toSummary().branches.pct, 50);
    const measured = spawnSync(process.execPath, args, { encoding: 'utf8', env });
    assert.equal(measured.status, 0, measured.stderr);
    const component = await collectCoverage(plan, join(root, 'raw'), 'component-');
    const combined = await collectCoverage(plan, join(root, 'raw'));
    assert.equal(component.map.fileCoverageFor(source).toSummary().branches.pct, 50);
    assert.equal(combined.map.fileCoverageFor(source).toSummary().branches.pct, 100);
    assert.equal(
      combined.map.getCoverageSummary().branches.total,
      before.map.getCoverageSummary().branches.total,
    );
    assert.equal(combined.map.fileCoverageFor(untouched).toSummary().lines.covered, 0);
    assert.ok(Object.values(plan.baseline[source].s).every((count) => count === 0));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
