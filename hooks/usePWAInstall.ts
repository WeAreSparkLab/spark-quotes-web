// hooks/usePWAInstall.ts
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari standalone flag
      (navigator as any).standalone === true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onBIP = (e: Event) => {
      // Stop the browser from auto-showing the prompt
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBIP as any);
    window.addEventListener('appinstalled', onInstalled);

    if (isStandalone) setInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP as any);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone]);

  const canInstall = Platform.OS === 'web' && !installed && !isStandalone && !!deferred;

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice; // 'accepted' | 'dismissed'
    // Either way, you must clear the saved event after one use.
    setDeferred(null);
  }, [deferred]);

  return { canInstall, install, installed, isStandalone };
}
