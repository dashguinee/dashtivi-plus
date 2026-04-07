import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Back online — keep banner visible for 2s then dismiss
      const timer = setTimeout(() => {
        setVisible(false);
        setWasOffline(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!visible) return null;

  return (
    <div
      className={`offline-banner ${isOnline ? 'offline-banner-exit' : 'offline-banner-enter'}`}
    >
      <WifiOff size={14} strokeWidth={2.5} />
      <span>
        {isOnline
          ? 'Back online'
          : "You're offline — some features may not work"}
      </span>
    </div>
  );
}
