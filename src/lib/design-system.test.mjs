import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(fullPath) : [fullPath];
  });
}

const interfaceFiles = [...filesIn('app'), ...filesIn('src/components')]
  .filter((file) => file.endsWith('.tsx'))
  .filter((file) => !file.endsWith(`${path.sep}app-button.tsx`));

test('centraliza botões, confirmações e cores da interface', () => {
  for (const file of interfaceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /import \{[^}]*\bButton\b[^}]*\} from 'tamagui'/, file);
    assert.doesNotMatch(source, /<\/?Button\b/, file);
    assert.doesNotMatch(source, /Alert\.alert/, file);
    assert.doesNotMatch(source, /#[0-9a-f]{6}/i, file);
  }
});

test('mantém o aplicativo no tema claro definido pela marca', () => {
  const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  assert.equal(appConfig.expo.userInterfaceStyle, 'light');
});
