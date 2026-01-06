import { useState, useEffect } from 'react';
import { GAME_CONFIG } from '@/lib/config';
import { formatTime } from '@/lib/utils';

export function useCountdown(createdAt: number | bigint | null) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!createdAt) {
      setTimeRemaining(0);
      setIsExpired(false);
      return;
    }

    // Convert BigInt to number if needed (from GenLayer SDK)
    const createdAtNum = typeof createdAt === 'bigint' ? Number(createdAt) : createdAt;
    const duration = GAME_CONFIG.DEFAULT_COUNTDOWN_SECONDS;
    const endsAt = createdAtNum + duration;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endsAt - now);
      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, GAME_CONFIG.TIMER_UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [createdAt]);

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
  };
}
