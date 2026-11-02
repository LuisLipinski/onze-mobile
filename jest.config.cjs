const expo = require('jest-expo/jest-preset');

module.exports = {
  ...expo,
  testEnvironment: '<rootDir>/tests/coverage-environment.cjs',
  transform: { ...expo.transform, '\\.[jt]sx?$': '<rootDir>/tests/transformer.cjs' },
  testMatch: ['<rootDir>/tests/components/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|@tamagui|tamagui))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: 2,
  testTimeout: 10000,
  collectCoverage: false,
};
