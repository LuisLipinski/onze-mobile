type Permission = { status: string; canAskAgain: boolean };

type PermissionAccess = {
  prepare: () => Promise<void>;
  read: () => Promise<Permission>;
  request: () => Promise<Permission>;
  wasHandled: () => Promise<boolean>;
  markHandled: () => Promise<void>;
};

/** Share the OS prompt across screens and respect the user's first refusal. */
export function createNotificationPermission(access: PermissionAccess) {
  let pending: Promise<boolean> | undefined;
  let handled = false;

  return function ensurePermission(): Promise<boolean> {
    if (pending) return pending;
    pending = (async () => {
      await access.prepare();
      const current = await access.read();
      // Always read again: the user may have enabled access in Android settings.
      if (current.status === 'granted') {
        if (!handled && !(await access.wasHandled())) await access.markHandled();
        handled = true;
        return true;
      }
      if (!['undetermined', 'denied'].includes(current.status)
          || !current.canAskAgain || handled || await access.wasHandled()) return false;

      // Expo Android can report "denied" before the first request. Persist the
      // decision before opening the activity so restarts/resume cannot re-ask.
      handled = true;
      await access.markHandled();
      return (await access.request()).status === 'granted';
    })().finally(() => { pending = undefined; });
    return pending;
  };
}
