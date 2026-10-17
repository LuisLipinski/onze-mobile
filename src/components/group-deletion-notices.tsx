import * as Notifications from 'expo-notifications';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { acknowledgeGroupDeletionNotice, GroupDeletionNotice, listGroupDeletionNotices } from '../lib/api';
import { getAccessToken } from '../lib/auth-storage';
import { cancelGroupNotifications } from '../lib/notifications';
import { ConfirmActionModal } from './confirm-action-modal';

export function GroupDeletionNotices() {
  const router = useRouter();
  const pathname = usePathname();
  const [notices, setNotices] = useState<GroupDeletionNotice[]>([]);
  const [acknowledging, setAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const fetching = useRef(false);
  const acknowledgingRef = useRef(false);
  const generation = useRef(0);
  const notice = notices[0];
  const invalidateRequests = useCallback(() => { generation.current++; }, []);

  const refresh = useCallback(async () => {
    if (fetching.current || acknowledgingRef.current) return;
    fetching.current = true;
    const currentGeneration = ++generation.current;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const unread = await listGroupDeletionNotices(token);
      if (!active.current || currentGeneration !== generation.current || await getAccessToken() !== token) return;
      setNotices(unread);
      for (const item of unread) void cancelGroupNotifications(item.groupId).catch(() => undefined);
    } catch {
      // Offline or expired sessions keep notices on the server for the next visit.
    } finally {
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    active.current = true;
    void refresh();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.content.data?.notificationType === 'GROUP_DELETED') void refresh();
    });
    return () => {
      active.current = false;
      invalidateRequests();
      appStateSubscription.remove();
      notificationSubscription.remove();
    };
  }, [refresh, invalidateRequests]);

  useEffect(() => {
    if (pathname === '/home' || pathname === '/groups') void refresh();
  }, [pathname, refresh]);

  async function acknowledge() {
    if (!notice || acknowledgingRef.current) return;
    acknowledgingRef.current = true;
    generation.current++;
    setAcknowledging(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { router.replace('/'); return; }
      await acknowledgeGroupDeletionNotice(token, notice.id);
      if (!active.current || await getAccessToken() !== token) return;
      setNotices((current) => current.filter((item) => item.id !== notice.id));
      router.replace('/groups');
    } catch {
      if (active.current) setError('Não foi possível concluir. Tente novamente.');
    } finally {
      acknowledgingRef.current = false;
      if (active.current) setAcknowledging(false);
    }
  }

  return (
    <ConfirmActionModal
      visible={Boolean(notice)}
      title="Grupo excluído"
      message={`O grupo “${notice?.groupName ?? ''}” foi excluído pelo administrador principal e não está mais disponível.${error ? `\n\n${error}` : ''}`}
      confirmLabel="Ver meus grupos"
      cancelLabel={null}
      loading={acknowledging}
      loadingLabel="Concluindo..."
      onConfirm={() => void acknowledge()}
      onCancel={() => void acknowledge()}
    />
  );
}
