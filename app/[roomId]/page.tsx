"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { genlayerWrite, genlayerRead, ensureGenLayerChain } from "@/lib/genlayer";
import { mapToUserFriendlyError, UserFriendlyError } from "@/lib/errors";
import { LeaderboardMap } from "@/types/room";
import { useRoom } from "@/hooks/useRoom";
import { useCountdown } from "@/hooks/useCountdown";
import { ConnectWallet } from "@/components/ConnectWallet";
import { RoomState } from "@/components/RoomState";
import { VotingPanel } from "@/components/VotingPanel";
import { Leaderboard } from "@/components/Leaderboard";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ShareLink } from "@/components/ShareLink";

const CONTRACT_ADDRESS = "0x1432B283D358A8684d283D5f633aDd293c2CD99f";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMap>({});
  const [roomNotFound, setRoomNotFound] = useState(false);

  const { room, votes, loadRoom, isLoading: roomLoading } = useRoom(CONTRACT_ADDRESS, roomId);
  const { isExpired } = useCountdown(room?.created_at || null);

  // Check for existing wallet connection on mount
  useEffect(() => {
    async function checkWallet() {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts?.[0]) {
          setWalletAddress(accounts[0]);
        }
      }
    }
    checkWallet();
  }, []);

  // Check if room exists after initial load
  useEffect(() => {
    if (!roomLoading && !room) {
      setRoomNotFound(true);
    } else if (room) {
      setRoomNotFound(false);
    }
  }, [room, roomLoading]);

  // Load leaderboard on mount
  useEffect(() => {
    loadLeaderboard().catch((e) => {
      console.warn("Initial leaderboard load failed:", e);
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
      const accounts = await window.ethereum?.request({
        method: "eth_requestAccounts",
      });
      if (accounts?.[0]) {
        setWalletAddress(accounts[0]);
      }
      setStatus("Connected to GenLayer StudioNet");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      handleError("connectWallet", e);
    }
  }

  async function submitVote(vote: "yes" | "no") {
    setError(null);

    if (!room) {
      setError({
        title: "No Room Loaded",
        message: "Please wait for the room to load.",
      });
      return;
    }

    try {
      setStatus(`Submitting "${vote.toUpperCase()}" vote... Please sign the transaction.`);
      await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [roomId, vote]);

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
        message: "Please wait for the room to load.",
      });
      return;
    }

    try {
      setStatus("Resolving room via AI consensus... Please sign the transaction.");
      await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [roomId]);

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
      const lbObj = lb instanceof Map ? Object.fromEntries(lb) : lb;
      setLeaderboard(lbObj || {});
    } catch (e) {
      console.warn("Leaderboard load failed:", e);
      setLeaderboard({});
    }
  }

  // Room not found state
  if (roomNotFound) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Consensus Countdown
          </h1>
        </header>

        <div className="card bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Room Not Found
          </h3>
          <p className="text-yellow-700 mb-4">
            The room &quot;{roomId}&quot; doesn&apos;t exist or hasn&apos;t been created yet.
          </p>
          <Link
            href="/"
            className="btn bg-yellow-600 text-white hover:bg-yellow-700 inline-block"
          >
            Go to Home
          </Link>
        </div>
      </main>
    );
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

      <ConnectWallet onConnect={connectWallet} address={walletAddress} />

      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900">{status}</p>
        </div>
      )}

      {error && (
        <ErrorDisplay error={error} onDismiss={() => setError(null)} />
      )}

      <ShareLink roomId={roomId} />

      {roomLoading && !room && (
        <div className="card bg-gray-50">
          <p className="text-gray-600">Loading room...</p>
        </div>
      )}

      {room && (
        <>
          <RoomState room={room} />
          <VotingPanel
            votes={votes}
            isExpired={isExpired}
            isResolved={room.resolved}
            walletAddress={walletAddress}
            onVote={submitVote}
            onResolve={resolveRoom}
          />
        </>
      )}

      <div className="text-center">
        <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Home
        </Link>
      </div>

      <Leaderboard
        leaderboard={leaderboard}
        onRefresh={loadLeaderboard}
      />
    </main>
  );
}
