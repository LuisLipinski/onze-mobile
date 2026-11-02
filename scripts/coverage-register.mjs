import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';

const manifestPath = process.env.ONZE_COVERAGE_MANIFEST;
const directory = process.env.ONZE_COVERAGE_RAW;
if (!manifestPath || !directory) throw new Error('Run coverage through npm run test:coverage');

register('./coverage-loader.mjs', import.meta.url, { data: { manifestPath } });
process.once('exit', () => {
  writeFileSync(
    join(directory, `${process.pid}.json`),
    JSON.stringify(globalThis.__coverage__ ?? {}),
  );
});
