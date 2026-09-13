import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { Text, YStack } from 'tamagui';

import {
  getGlobalLoadingSnapshot,
  subscribeToGlobalLoading,
} from '../lib/global-loading';

const SHOW_DELAY_MS = 180;
const SLOW_OPERATION_THRESHOLD_MS = 8_000;

export function GlobalLoadingOverlay() {
  const loading = useSyncExternalStore(
    subscribeToGlobalLoading,
    getGlobalLoadingSnapshot,
    getGlobalLoadingSnapshot,
  );
  const [shouldShow, setShouldShow] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!loading.visible) {
      setShouldShow(false);
      return;
    }

    const timeoutId = setTimeout(() => setShouldShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, [loading.visible]);

  useEffect(() => {
    if (!loading.visible || loading.startedAt == null) {
      setIsSlow(false);
      return;
    }

    const elapsed = Date.now() - loading.startedAt;
    const remaining = Math.max(0, SLOW_OPERATION_THRESHOLD_MS - elapsed);
    const timeoutId = setTimeout(() => setIsSlow(true), remaining);
    return () => clearTimeout(timeoutId);
  }, [loading.startedAt, loading.visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={loading.visible && shouldShow}
    >
      <View
        accessibilityLabel={loading.title}
        accessibilityLiveRegion="polite"
        accessibilityRole="progressbar"
        accessibilityViewIsModal
        style={styles.backdrop}
      >
        <YStack
          alignItems="center"
          backgroundColor="$onzeSurface"
          borderColor="$onzeBorder"
          borderRadius="$6"
          borderWidth={1}
          gap="$3"
          maxWidth={360}
          padding="$6"
          width="86%"
        >
          <ActivityIndicator accessibilityLabel="Carregando" color="#148A4A" size="large" />
          <Text color="$onzeInk" fontSize={20} fontWeight="800" textAlign="center">
            {loading.title}
          </Text>
          <Text color="$onzeMuted" fontSize={14} lineHeight={20} textAlign="center">
            {isSlow ? loading.slowMessage : loading.message}
          </Text>
        </YStack>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 35, 26, 0.48)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});
