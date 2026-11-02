const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const expo = require('jest-expo/jest-preset');
const babel = require('babel-jest').createTransformer(expo.transform['\\.[jt]sx?$'][1]);
let manifest;

function instrumented(filename) {
  if (!process.env.ONZE_COVERAGE_MANIFEST) return undefined;
  manifest ??= JSON.parse(readFileSync(process.env.ONZE_COVERAGE_MANIFEST, 'utf8'));
  return manifest[pathToFileURL(filename).href];
}

// Reuse the exact counters prepared for Node. Babel only adapts the resulting
// module to Jest; it must not add a second, incompatible instrumentation pass.
module.exports = {
  canInstrument: true,
  process(source, filename, options) {
    if (options.instrument) throw new Error('Use npm run test:coverage for unified coverage');
    return babel.process(instrumented(filename) ?? source, filename, {
      ...options,
      instrument: false,
    });
  },
  getCacheKey(source, filename, options) {
    const measured = instrumented(filename);
    const key = babel.getCacheKey(source, filename, { ...options, instrument: false });
    return createHash('sha256')
      .update(key)
      .update(measured ?? 'unmetered')
      .digest('hex');
  },
};
