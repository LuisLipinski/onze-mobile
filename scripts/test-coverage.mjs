import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import report from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import coverage from 'istanbul-lib-coverage';
import { collectCoverage, coveragePlan } from './coverage-core.mjs';

const root = process.cwd();
const temporary = resolve('.coverage-runtime');
const output = resolve('coverage');
rmSync(temporary, { recursive: true, force: true });
rmSync(output, { recursive: true, force: true });
mkdirSync(join(temporary, 'raw'), { recursive: true });
mkdirSync(output);

const plan = coveragePlan(root);
const manifestPath = join(temporary, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(plan.sources));
const tests = readdirSync('src/lib')
  .filter((file) => file.endsWith('.test.mjs'))
  .sort();
if (!tests.length) throw new Error('No existing Node tests found');
const run = spawnSync(
  process.execPath,
  [
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--experimental-strip-types',
    '--import',
    pathToFileURL(resolve('scripts/coverage-register.mjs')).href,
    '--test',
    ...tests.map((file) => join('src/lib', file)),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ONZE_COVERAGE_MANIFEST: manifestPath,
      ONZE_COVERAGE_RAW: join(temporary, 'raw'),
    },
  },
);
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;

// Failed tests retain their failing status. Their counters are useful, but the
// report explicitly labels that run as partial instead of presenting success.
const result = await collectCoverage(plan, join(temporary, 'raw'));
const context = report.createContext({
  dir: output,
  coverageMap: result.map,
  sourceFinder: result.sourceFinder,
});
for (const [format, options] of [
  ['html', { subdir: 'html' }],
  ['json', { file: 'coverage-final.json' }],
  ['json-summary', { file: 'coverage-summary.json' }],
  ['lcovonly', { file: 'lcov.info' }],
  ['text-summary', {}],
])
  reports.create(format, options).execute(context);

const inventory = result.map
  .files()
  .sort()
  .map((file) => ({
    path: relative(root, file).replaceAll('\\', '/'),
    ...result.map.fileCoverageFor(file).toSummary().toJSON(),
  }));
const groups = ['app', 'src/components', 'src/lib', 'src/theme'].map((directory) => {
  const paths = result.map.files().filter((file) => file.startsWith(resolve(directory) + sep));
  const group = coverage.createCoverageMap({});
  for (const file of paths) group.addFileCoverage(result.map.fileCoverageFor(file));
  return { directory, files: paths.length, ...group.getCoverageSummary().toJSON() };
});
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const metadata = {
  schemaVersion: 1,
  revision,
  testStatus: run.status === 0 ? 'success' : 'failure',
  scope: 'Node tests; all production TS/TSX in app and src, including unexecuted files',
  total: result.map.getCoverageSummary().toJSON(),
  groups,
  files: inventory,
};
writeFileSync(join(output, 'source-inventory.json'), JSON.stringify(metadata, null, 2) + '\n');

const percentage = (metric) => (metric.total ? `${Number(metric.pct).toFixed(2)}%` : 'N/A');
const summary = [
  '# Mobile: cobertura de codigo',
  '',
  `Testes: \`${metadata.testStatus}\`. Revisao: \`${revision}\`.`,
  'Suite: os testes Node existentes. Inclui todo app/ e src/, sem importar telas nativas no Node.',
  '',
  '| Metrica | Cobertura | Cobertos / total |',
  '|---|---:|---:|',
  ...[
    ['lines', 'Linhas'],
    ['branches', 'Ramificacoes (condicoes)'],
    ['functions', 'Funcoes'],
    ['statements', 'Instrucoes'],
  ].map(([key, label]) => {
    const metric = metadata.total[key];
    return `| ${label} | ${percentage(metric)} | ${metric.covered} / ${metric.total} |`;
  }),
  '',
  '| Area | Arquivos | Linhas | Ramificacoes |',
  '|---|---:|---:|---:|',
  ...groups.map(
    (group) =>
      `| \`${group.directory}\` | ${group.files} | ${percentage(group.lines)} | ${percentage(group.branches)} |`,
  ),
  '',
  'Arquivos nao exercitados entram com contadores zerados. Tipos TypeScript nao contam como codigo executavel.',
  'Ramificacoes cobrem caminhos de if/switch, ternarios e expressoes logicas; nao representam MC/DC.',
  'Os E2E Android externos e a execucao no motor Hermes nao fazem parte desta medicao Node.',
  '',
  '## Arquivos com mais ramificacoes nao cobertas',
  '',
  '| Arquivo | Linhas | Ramificacoes | Nao cobertas |',
  '|---|---:|---:|---:|',
  ...[...inventory]
    .sort((a, b) => b.branches.total - b.branches.covered - (a.branches.total - a.branches.covered))
    .slice(0, 15)
    .map(
      (file) =>
        `| \`${file.path}\` | ${percentage(file.lines)} | ${percentage(file.branches)} | ${file.branches.total - file.branches.covered} |`,
    ),
  '',
].join('\n');
writeFileSync(join(output, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
// Read back the machine report so a report-generation failure cannot go unnoticed.
const measured = JSON.parse(readFileSync(join(output, 'coverage-summary.json'), 'utf8')).total;
if (!measured.lines.total || !measured.branches.total)
  throw new Error('Missing line/branch counters');
