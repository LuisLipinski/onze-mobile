import { readFileSync } from 'node:fs';

let sources;
export function initialize({ manifestPath }) {
  sources = JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export async function load(url, context, nextLoad) {
  if (Object.hasOwn(sources, url)) {
    return { format: 'module', shortCircuit: true, source: sources[url] };
  }
  return nextLoad(url, context);
}
