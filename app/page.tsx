"use client";

import { useState, useEffect } from "react";
import { genlayerWrite, genlayerRead, ensureGenLayerChain } from "@/lib/genlayer";
import { mapToUserFriendlyError, UserFriendlyError } from "@/lib/errors";
import { LeaderboardMap } from "@/types/room";
import { useRoom } from "@/hooks/useRoom";
import { useCountdown } from "@/hooks/useCountdown";
import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateRoom } from "@/components/CreateRoom";
import { RoomState } from "@/components/RoomState";
import { VotingPanel } from "@/components/VotingPanel";
import { Leaderboard } from "@/components/Leaderboard";
import { ErrorDisplay } from "@/components/ErrorDisplay";

const CONTRACT_ADDRESS = "0xBf8D00b0F61B1FE4Ad532fFf982633d8b67E0429";

export default function Page() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMap>({});

  const { room, votes, loadRoom } = useRoom(CONTRACT_ADDRESS, currentRoomId);
  const { isExpired } = useCountdown(room?.created_at || null);

  // Load leaderboard on mount (silent errors to avoid startup noise)
  useEffect(() => {
    loadLeaderboard().catch((e) => {
      console.warn("Initial leaderboard load failed (expected if no data yet):", e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleError(source: string, err: any) {
    const friendlyError = mapToUserFriendlyError(source, err);
    setError(friendlyError);
    console.error(`[${source}]`, err);
  }

  async function connectWallet() {
    setError(null);
    try {
      await ensureGenLayerChain();
      setStatus("Connected to GenLayer StudioNet");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      handleError("connectWallet", e);
    }
  }

  async function createRoom(roomId: string, prompt: string) {
    setError(null);

    if (!roomId.trim()) {
      setError({
        title: "Room ID Required",
        message: "Please enter a Room ID.",
        action: "Enter a Room ID to continue.",
      });
      return;
    }
    if (!prompt.trim()) {
      setError({
        title: "Prompt Required",
        message: "Please enter a prompt question.",
        action: "Enter a question to continue.",
      });
      return;
    }

    try {
      setStatus("Creating room... Please sign the transaction.");
      await genlayerWrite(CONTRACT_ADDRESS, "create_room", [roomId, prompt]);

      setStatus("Room created! Loading state...");
      await loadRoom();
      await loadLeaderboard();
      setStatus(null);
    } catch (e) {
      handleError("createRoom", e);
      setStatus(null);
    }
  }

  async function submitVote(vote: "yes" | "no") {
    setError(null);

    if (!room) {
      setError({
        title: "No Room Loaded",
        message: "Please load or create a room first.",
      });
      return;
    }

    try {
      setStatus(`Submitting "${vote.toUpperCase()}" vote... Please sign the transaction.`);
      await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [currentRoomId, vote]);

      setStatus("Vote submitted! Refreshing...");
      await loadRoom();
      await loadLeaderboard();
      setStatus(null);
    } catch (e) {
      handleError("submitVote", e);
      setStatus(null);
    }
  }

  async function resolveRoom() {
    setError(null);

    if (!room) {
      setError({
        title: "No Room Loaded",
        message: "Please load or create a room first.",
      });
      return;
    }

    try {
      setStatus("Resolving room via AI consensus... Please sign the transaction.");
      await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [currentRoomId]);

      setStatus("Room resolved! Refreshing...");
      await loadRoom();
      await loadLeaderboard();
      setStatus(null);
    } catch (e) {
      handleError("resolveRoom", e);
      setStatus(null);
    }
  }

  async function loadLeaderboard() {
    try {
      const lb = await genlayerRead(CONTRACT_ADDRESS, "get_leaderboard", []);
      setLeaderboard(lb || {});
    } catch (e) {
      // Silently handle leaderboard errors - they're not critical
      console.warn("Leaderboard load failed:", e);
      setLeaderboard({});
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Consensus Countdown
        </h1>
        <p className="text-gray-600">
          Players propose subjective statements. Validators decide consensus.
        </p>
      </header>

      <ConnectWallet onConnect={connectWallet} />

      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900">{status}</p>
        </div>
      )}

      {error && (
        <ErrorDisplay error={error} onDismiss={() => setError(null)} />
      )}

      <CreateRoom
        onCreateRoom={createRoom}
        onRoomIdChange={setCurrentRoomId}
      />

      {room && (
        <>
          <RoomState room={room} />
          <VotingPanel
            votes={votes}
            isExpired={isExpired}
            isResolved={room.resolved}
            onVote={submitVote}
            onResolve={resolveRoom}
          />
        </>
      )}

      <Leaderboard
        leaderboard={leaderboard}
        onRefresh={loadLeaderboard}
      />
    </main>
  );
}
