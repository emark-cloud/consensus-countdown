"use client";

import { useState, useEffect } from "react";
import { genlayerWrite, genlayerRead, ensureGenLayerChain, waitForTransactionReceipt } from "@/lib/genlayer";
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
import { ShareLink } from "@/components/ShareLink";

const CONTRACT_ADDRESS = "0x1432B283D358A8684d283D5f633aDd293c2CD99f";

export default function Page() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMap>({});

  const { room, votes, loadRoom } = useRoom(CONTRACT_ADDRESS, currentRoomId);
  const { isExpired } = useCountdown(room?.created_at || null);

  // Check URL for room parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setCurrentRoomId(roomParam);
    }
  }, []);

  // Update URL when room changes
  useEffect(() => {
    if (currentRoomId) {
      const url = new URL(window.location.href);
      url.searchParams.set("room", currentRoomId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [currentRoomId]);

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
      const txHash = await genlayerWrite(CONTRACT_ADDRESS, "create_room", [roomId, prompt]);
      console.log("Transaction hash:", txHash);

      setStatus("Transaction submitted. Waiting for consensus...");

      try {
        // Try to wait for transaction receipt
        await waitForTransactionReceipt(txHash, {
          interval: 2000,
          maxRetries: 30,
        });
      } catch (receiptError) {
        console.warn("Receipt polling failed, will verify via contract state:", receiptError);
      }

      // Verify the room was created by polling contract state
      // GenLayer AI consensus can take 1-2 minutes
      let roomData = null;
      const verifyMaxRetries = 20;
      const verifyInterval = 5000; // 5s between retries to avoid rate limiting

      for (let i = 0; i < verifyMaxRetries; i++) {
        setStatus(`Waiting for AI consensus... (${i + 1}/${verifyMaxRetries})`);

        try {
          roomData = await genlayerRead(CONTRACT_ADDRESS, "get_room", [roomId]);
          console.log(`Verify attempt ${i + 1}:`, roomData);

          // genlayerRead returns a Map, check size for Maps or keys for objects
          const hasData = roomData instanceof Map
            ? roomData.size > 0
            : roomData && Object.keys(roomData).length > 0;

          if (hasData) {
            break; // Room found!
          }
        } catch (readError) {
          console.warn(`Read attempt ${i + 1} failed:`, readError);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, verifyInterval));
      }

      const roomCreated = roomData instanceof Map
        ? roomData.size > 0
        : roomData && Object.keys(roomData).length > 0;

      if (roomCreated) {
        setCurrentRoomId(roomId);
        setStatus("Room created successfully! You can now vote.");
        setTimeout(() => setStatus(null), 2000);
        await loadLeaderboard();
      } else {
        setError({
          title: "Room Creation Timeout",
          message: "The transaction was sent but the room couldn't be verified.",
          action: "Wait a moment and try loading the room manually, or try creating again.",
        });
      }
    } catch (e) {
      console.error("Error creating room:", e);
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
      const txHash = await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [currentRoomId, vote]);

      setStatus("Vote submitted! Waiting for confirmation...");

      // Wait a bit for the transaction to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      setStatus("Refreshing room state...");
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
      const txHash = await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [currentRoomId]);

      setStatus("Resolution submitted! Waiting for AI consensus...");

      // Resolution takes longer (AI + consensus), wait a bit more
      await new Promise(resolve => setTimeout(resolve, 5000));

      setStatus("Refreshing room state...");
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
      // genlayerRead returns Maps, convert to plain object
      const lbObj = lb instanceof Map ? Object.fromEntries(lb) : lb;
      setLeaderboard(lbObj || {});
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

      <CreateRoom onCreateRoom={createRoom} />

      {currentRoomId && (
        <ShareLink roomId={currentRoomId} />
      )}

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
