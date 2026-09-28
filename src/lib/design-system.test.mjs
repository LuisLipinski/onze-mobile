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

const productCopyFiles = [...filesIn('app'), ...filesIn('src')]
  .filter((file) => /\.(?:ts|tsx)$/.test(file));

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

test('protege menus e ações da área reservada pelo sistema operacional', () => {
  for (const file of interfaceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('<SafeAreaView')) continue;

    assert.match(
      source,
      /from 'react-native-safe-area-context'/,
      `${file} deve usar a implementação multiplataforma de área segura`,
    );
    assert.doesNotMatch(
      source,
      /import \{[^}]*\bSafeAreaView\b[^}]*\} from 'react-native'/,
      file,
    );
  }

  const rootLayout = fs.readFileSync('app/_layout.tsx', 'utf8');
  assert.match(rootLayout, /<SafeAreaProvider\b/);

  const bottomNavigation = fs.readFileSync('src/components/bottom-navigation.tsx', 'utf8');
  assert.match(bottomNavigation, /useSafeAreaInsets\(\)/);
  assert.match(bottomNavigation, /paddingBottom=\{bottomPadding\}/);

  for (const file of [
    'app/group.tsx',
    'src/components/start-live-match-modal.tsx',
    'src/components/goal-event-modal.tsx',
    'src/components/card-event-modal.tsx',
  ]) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /useSafeAreaInsets\(\)/, file);
    assert.match(source, /paddingBottom=\{insets\.bottom \+ 20\}/, file);
  }
});

test('usa jogo como termo único nos textos do produto', () => {
  for (const file of productCopyFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bpartidas?\b/i, file);
  }
});
