import type { ComponentType } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ONZE_COLORS } from '../theme/colors';

type ServerLoadingScreenProps = {
  title: string;
  message?: string;
};

// The root GlobalLoadingOverlay owns the loading indicator and its message.
export const ServerLoadingScreen: ComponentType<ServerLoadingScreenProps> = () => (
  <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }} />
);
