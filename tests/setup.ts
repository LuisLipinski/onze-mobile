import { resetNavigation } from './support/router';
import '@testing-library/react-native';
import { resetNetwork, verifyNetwork } from './support/network';
import { vault } from './support/secure-store';

process.env.TAMAGUI_TARGET = 'native';
jest.mock('expo-router', () => jest.requireActual('./support/router'));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-secure-store', () => ({
  ...jest.requireActual('expo-secure-store'),
  ...jest.requireActual('./support/secure-store'),
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  ...jest.requireActual('./support/date-picker'),
}));

beforeEach(() => {
  resetNavigation();
  vault.clear();
  resetNetwork();
});
afterEach(() => {
  verifyNetwork();
  jest.useRealTimers();
});
