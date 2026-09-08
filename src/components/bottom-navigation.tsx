import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

export type MainTab = 'home' | 'groups' | 'settings';

const ITEMS: Array<{ key: MainTab; label: string; icon: string; route: '/home' | '/groups' | '/settings' }> = [
  { key: 'home', label: 'Home', icon: '⌂', route: '/home' },
  { key: 'groups', label: 'Grupos', icon: '⚽', route: '/groups' },
  { key: 'settings', label: 'Configurações', icon: '⚙', route: '/settings' },
];

export function BottomNavigation({ active }: { active: MainTab }) {
  const router = useRouter();

  return (
    <XStack
      backgroundColor="$onzeSurface"
      borderColor="$onzeBorder"
      borderTopWidth={1}
      minHeight={72}
      paddingBottom="$2"
      paddingHorizontal="$2"
      paddingTop="$2"
    >
      {ITEMS.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              if (!selected) router.replace(item.route);
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
