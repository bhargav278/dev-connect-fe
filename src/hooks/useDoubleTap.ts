import { useRef, useState } from 'react';

/**
 * Returns click handler + heartBurst state for double-tap-to-like on images.
 * - Double click/tap within 300ms triggers onDoubleTap (only if not already liked)
 * - heartBurst is true for 700ms then resets — use it to show the heart animation
 */
export function useDoubleTap(isLiked: boolean, onDoubleTap: () => void) {
  const lastTapRef = useRef<number>(0);
  const [heartBurst, setHeartBurst] = useState(false);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) onDoubleTap();
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    }
    lastTapRef.current = now;
  }

  return { handleTap, heartBurst };
}
