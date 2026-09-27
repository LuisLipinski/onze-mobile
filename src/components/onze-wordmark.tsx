import { Text, YStack } from 'tamagui';

type OnzeWordmarkProps = {
  align?: 'flex-start' | 'center';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  suffix?: string;
  subtitle?: boolean;
};

const FONT_SIZES = {
  xs: 11,
  sm: 18,
  md: 24,
  lg: 44,
} as const;

export function OnzeWordmark({
  align = 'flex-start',
  size = 'sm',
  suffix,
  subtitle = false,
}: OnzeWordmarkProps) {
  return (
    <YStack alignItems={align} gap={subtitle ? '$2' : 0}>
      <Text
        color="$onzeGreen"
        fontSize={FONT_SIZES[size]}
        fontWeight="900"
        letterSpacing={size === 'lg' ? 2 : 0}
      >
        ONZE{suffix ? ` • ${suffix}` : ''}
      </Text>
      {subtitle ? (
        <Text color="$onzeMuted" fontSize={16} fontWeight="600">
          Organizador de Pelada
        </Text>
      ) : null}
    </YStack>
  );
}
