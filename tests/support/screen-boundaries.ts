import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { resetGlobalLoadingForTests } from '../../src/lib/global-loading';

type Listener = (event: Record<string, unknown>) => void;
const appStateListeners = new Set<(state: AppStateStatus) => void>();
export function emitAppState(state: AppStateStatus) {
  AppState.currentState = state;
  appStateListeners.forEach((listener) => listener(state));
}
export class ScreenEventSource {
  static instances: ScreenEventSource[] = [];
  listeners = new Map<string, Listener>();
  close = jest.fn();
  constructor(
    public url: string,
    public options: unknown,
  ) {
    ScreenEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, listener);
  }
  removeAllEventListeners() {
    this.listeners.clear();
  }
  emit(type: string, event: Record<string, unknown> = {}) {
    this.listeners.get(type)?.(event);
  }
}
jest.mock('react-native-sse', () => ({
  __esModule: true,
  default: jest.requireActual('./screen-boundaries').ScreenEventSource,
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidNotificationPriority: { HIGH: 'high' },
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));
beforeEach(() => {
  resetGlobalLoadingForTests();
  ScreenEventSource.instances = [];
  AppState.currentState = 'active';
  appStateListeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.add(listener);
    return {
      remove: () => {
        appStateListeners.delete(listener);
      },
    };
  });
  jest
    .mocked(Notifications.getPermissionsAsync)
    .mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
      granted: false,
      expires: 'never',
    } as Notifications.NotificationPermissionsStatus);
  jest.mocked(Notifications.addNotificationReceivedListener).mockReturnValue({ remove: jest.fn() });
  jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([]);
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
  jest.mocked(captureRef).mockResolvedValue('file:///test-lineup.png');
});
