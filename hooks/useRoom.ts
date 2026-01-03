import { useState, useEffect, useCallback } from 'react';
import { genlayerRead } from '@/lib/genlayer';
import { Room, VoteMap } from '@/types/room';
import { GAME_CONFIG } from '@/lib/config';

export function useRoom(contractAddress: string, roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [votes, setVotes] = useState<VoteMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId) {
      setRoom(null);
      setVotes({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [roomData, votesData] = await Promise.all([
        genlayerRead(contractAddress, "get_room", [roomId]),
        genlayerRead(contractAddress, "get_votes", [roomId]),
      ]);

      setRoom(roomData && Object.keys(roomData).length ? roomData : null);
      setVotes(votesData || {});
    } catch (e) {
      setError(e);
      console.error('loadRoom error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, roomId]);

  // Initial load
  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Polling (every 5s) if room exists and not resolved
  useEffect(() => {
    if (!room || room.resolved) return;

    const interval = setInterval(loadRoom, GAME_CONFIG.POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [room, loadRoom]);

  return { room, votes, loadRoom, isLoading, error };
}
