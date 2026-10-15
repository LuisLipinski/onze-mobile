import { usePathname, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { mainTabDestination, type MainTab } from '../lib/main-navigation';

export type { MainTab } from '../lib/main-navigation';

const ITEMS: { key: MainTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'groups', label: 'Grupos', icon: '⚽' },
  { key: 'settings', label: 'Configurações', icon: '⚙' },
];

export function BottomNavigation({ active }: { active: MainTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <XStack
      accessibilityRole="tablist"
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderTopWidth={1}
      flexShrink={0}
      minHeight={64 + bottomPadding}
      paddingBottom={bottomPadding}
      paddingLeft={insets.left + 8}
      paddingRight={insets.right + 8}
      paddingTop="$2"
    >
      {ITEMS.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              const destination = mainTabDestination(pathname, item.key);
              if (destination) router.dismissTo(destination);
            }}
            style={{ flex: 1 }}
          >
            <YStack alignItems="center" gap="$1" justifyContent="center" minHeight={56}>
              <Text
                color={selected ? '$onzeGreen' : '$onzeMuted'}
                fontSize={item.key === 'groups' ? 20 : 24}
                fontWeight="800"
              >
                {item.icon}
              </Text>
              <Text
                color={selected ? '$onzeGreen' : '$onzeMuted'}
                fontSize={11}
                fontWeight={selected ? '800' : '600'}
              >
                {item.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
