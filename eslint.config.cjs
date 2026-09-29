const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['.expo/**', 'android/**', 'ios/**', 'dist/**', 'assets/**']),
  expoConfig,
  {
    // Existing screens predate the React Compiler rules. Keep the core Hooks rules active
    // while the render/effect patterns are migrated in focused changes.
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly' } },
  },
]);
