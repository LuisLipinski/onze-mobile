type Permission = { status: string; canAskAgain: boolean };

type PermissionAccess = {
  prepare: () => Promise<void>;
  read: () => Promise<Permission>;
  request: () => Promise<Permission>;
};

/** Share the OS prompt across screens and respect the user's first refusal. */
export function createNotificationPermission(access: PermissionAccess) {
  let pending: Promise<boolean> | undefined;
  let requested = false;

  return function ensurePermission(): Promise<boolean> {
    if (pending) return pending;
    pending = (async () => {
      await access.prepare();
      const current = await access.read();
      // Always read again: the user may have enabled access in Android settings.
      if (current.status === 'granted') return true;
      if (current.status !== 'undetermined' || !current.canAskAgain || requested) return false;

      // Mark before opening the activity; AppState resume can re-enter here.
      requested = true;
      return (await access.request()).status === 'granted';
    })().finally(() => { pending = undefined; });
    return pending;
  };
}
