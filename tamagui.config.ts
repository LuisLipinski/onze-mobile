import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

import { ONZE_COLORS } from './src/theme/colors';

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
  tokens: {
    ...defaultConfig.tokens,
    color: {
      onzeCanvas: ONZE_COLORS.canvas,
      onzeSurface: ONZE_COLORS.surface,
      onzeInk: ONZE_COLORS.ink,
      onzeMuted: ONZE_COLORS.muted,
      onzeBorder: ONZE_COLORS.border,
      onzeGreen: ONZE_COLORS.green,
      onzeGreenPress: ONZE_COLORS.greenPress,
      onzeDanger: ONZE_COLORS.danger,
      onzeDangerBg: ONZE_COLORS.dangerBg,
      onzeDangerBorder: ONZE_COLORS.dangerBorder,
      onzeSuccessBg: ONZE_COLORS.successBg,
      onzeSuccessSoft: ONZE_COLORS.successSoft,
      onzeSuccessBorder: ONZE_COLORS.successBorder,
      onzeWarning: ONZE_COLORS.warning,
      onzeWarningBg: ONZE_COLORS.warningBg,
      onzeWarningSoft: ONZE_COLORS.warningSoft,
      onzeWarningText: ONZE_COLORS.warningText,
      onzeWarningBorder: ONZE_COLORS.warningBorder,
      onzeInfoBg: ONZE_COLORS.infoBg,
      onzeSwitchTrack: ONZE_COLORS.switchTrack,
    },
  },
});

export default tamaguiConfig;

export type TamaguiAppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends TamaguiAppConfig {}
}
