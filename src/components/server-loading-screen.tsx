import { ActivityIndicator, SafeAreaView } from 'react-native';
import { Text, YStack } from 'tamagui';

import { ONZE_COLORS } from '../theme/colors';

type ServerLoadingScreenProps = {
  title: string;
  message?: string;
};

export function ServerLoadingScreen({ title, message }: ServerLoadingScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ONZE_COLORS.canvas }}>
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$3"
        padding="$6"
        backgroundColor="$onzeCanvas"
      >
        <ActivityIndicator size="large" color={ONZE_COLORS.green} />
        <Text color="$onzeInk" fontSize={20} fontWeight="800" textAlign="center">
          {title}
        </Text>
        {message ? (
          <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
            {message}
          </Text>
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}
