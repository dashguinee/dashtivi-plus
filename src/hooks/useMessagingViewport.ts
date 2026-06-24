import { useEffect, useState } from 'react';

/**
 * useMessagingViewport — tracks the `visualViewport` height so a full-screen
 * chat can shrink when the soft keyboard appears. Ported from voyo-music.
 */
export function useMessagingViewport() {
  const [vh, setVh] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const h = vv.height;
      setVh(h);
      setKeyboardOpen(window.innerHeight - h > 150);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return { vh, keyboardOpen };
}

export default useMessagingViewport;
