import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      onzeCanvas: '#F4F7F5',
      onzeSurface: '#FFFFFF',
      onzeInk: '#10231A',
      onzeMuted: '#65756D',
      onzeBorder: '#DDE6E1',
      onzeGreen: '#148A4A',
      onzeGreenPress: '#0F6D3B',
      onzeDanger: '#B42318',
    },
  },
});

export default tamaguiConfig;

export type TamaguiAppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends TamaguiAppConfig {}
}
