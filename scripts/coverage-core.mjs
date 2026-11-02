import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import instrument from 'istanbul-lib-instrument';
import coverage from 'istanbul-lib-coverage';
import sourceMaps from 'istanbul-lib-source-maps';

export function productionFiles(root) {
  function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return /\.(ts|tsx)$/.test(path) && !/\.(d|test|spec)\.tsx?$/.test(path) ? [path] : [];
    });
  }
  return ['app', 'src'].flatMap((directory) => walk(resolve(root, directory))).sort();
}

// Transpile once, then instrument the emitted JS. Source maps remove type-only
// declarations and map every executable counter back to the original TS/TSX.
export function coveragePlan(root) {
  const sources = {};
  const baseline = {};
  for (const path of productionFiles(root)) {
    const result = ts.transpileModule(readFileSync(path, 'utf8'), {
      fileName: path,
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        sourceMap: true,
        inlineSources: true,
        isolatedModules: true,
      },
    });
    const errors =
      result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) ?? [];
    if (errors.length)
      throw new Error(
        ts.formatDiagnosticsWithColorAndContext(errors, {
          getCanonicalFileName: (file) => file,
          getCurrentDirectory: () => root,
          getNewLine: () => '\n',
        }),
      );
    const meter = instrument.createInstrumenter({ esModules: true, produceSourceMap: true });
    const source = meter.instrumentSync(result.outputText, path, JSON.parse(result.sourceMapText));
    sources[pathToFileURL(path).href] = source;
    baseline[path] = meter.lastFileCoverage();
  }
  return { sources, baseline };
}

export async function collectCoverage(plan, directory, prefix = '') {
  const map = coverage.createCoverageMap(structuredClone(plan.baseline));
  const files = readdirSync(directory).filter(
    (file) => file.startsWith(prefix) && file.endsWith('.json'),
  );
  if (!files.length) throw new Error('No coverage worker data was written');
  for (const file of files) map.merge(JSON.parse(readFileSync(join(directory, file), 'utf8')));
  if (!map.files().some((file) => map.fileCoverageFor(file).toSummary().statements.covered > 0)) {
    throw new Error('No production statement was measured; refusing to publish an empty baseline');
  }
  const store = sourceMaps.createSourceMapStore();
  const remapped = await store.transformCoverage(map);
  return { map: remapped, sourceFinder: store.sourceFinder.bind(store) };
}
