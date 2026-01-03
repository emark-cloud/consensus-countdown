"use client";

import { useEffect, useState } from "react";
import {
  genlayerRead,
  genlayerWrite,
  ensureGenLayerChain,
} from "../lib/genlayer";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */
const CONTRACT_ADDRESS = "0xBf8D00b0F61B1FE4Ad532fFf982633d8b67E0429";

/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */
export default function Page() {
  // inputs
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");

  // on-chain state
  const [room, setRoom] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});

  // ui state
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------------
     READ HELPERS
  ------------------------------------------------------- */
  async function loadRoom(id: string) {
    const r = await genlayerRead(CONTRACT_ADDRESS, "get_room", [id]);
    setRoom(r && Object.keys(r).length ? r : null);

    const v = await genlayerRead(CONTRACT_ADDRESS, "get_votes", [id]);
    setVotes(v || {});
  }

  async function loadLeaderboard() {
    const lb = await genlayerRead(CONTRACT_ADDRESS, "get_leaderboard");
    setLeaderboard(lb || {});
  }

  /* -------------------------------------------------------
     ACTIONS (STANDARD WALLET TXs)
  ------------------------------------------------------- */
  async function connectWallet() {
    setError(null);
    try {
      await ensureGenLayerChain();
      setStatus("Wallet connected to GenLayer StudioNet");
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet");
    }
  }

  async function createRoom() {
    setError(null);

    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    try {
      setStatus("Creating room (sign transaction)…");
      await genlayerWrite(CONTRACT_ADDRESS, "create_room", [
        roomId,
        prompt,
      ]);

      setStatus("Room created. Fetching state…");
      await loadRoom(roomId);
    } catch (e: any) {
      setError(e.message || "Create room failed");
      setStatus(null);
    }
  }

  async function submitVote(vote: "yes" | "no") {
    setError(null);

    if (!room) {
      setError("No active room");
      return;
    }

    try {
      setStatus(`Submitting vote (${vote})…`);
      await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [
        roomId,
        vote,
      ]);

      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch (e: any) {
      setError(e.message || "Vote failed");
      setStatus(null);
    }
  }

  async function resolveRoom() {
    setError(null);

    if (!room) {
      setError("No active room");
      return;
    }

    try {
      setStatus("Resolving room (AI + validators)…");
      await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [roomId]);

      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch (e: any) {
      setError(e.message || "Resolve failed");
      setStatus(null);
    }
  }

  /* -------------------------------------------------------
     EFFECTS
  ------------------------------------------------------- */
  useEffect(() => {
    loadLeaderboard().catch(() => {});
  }, []);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 20 }}>
      <h1>Consensus Countdown</h1>
      <p style={{ color: "#555" }}>
        Players propose a statement. Validators decide consensus.
      </p>

      {/* CONNECT */}
      <section>
        <button onClick={connectWallet}>
          Connect Wallet (GenLayer StudioNet)
        </button>
      </section>

      {/* CREATE ROOM */}
      <section style={{ marginTop: 24 }}>
        <h3>Create Room</h3>

        <label>Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ width: "100%" }}
        />

        <label style={{ marginTop: 8 }}>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. Was this performance overrated?"
          style={{ width: "100%" }}
        />

        <button onClick={createRoom} style={{ marginTop: 10 }}>
          Create Room
        </button>
      </section>

      {/* ROOM */}
      <section style={{ marginTop: 30 }}>
        <h3>Room State</h3>
        {room ? (
          <div style={{ background: "#f5f5f5", padding: 12 }}>
            <p><strong>{room.prompt}</strong></p>
            <p>Resolved: {room.resolved ? "Yes" : "No"}</p>
            <p>Outcome: {room.final_outcome || "—"}</p>
          </div>
        ) : (
          <p>No room loaded</p>
        )}
      </section>

      {/* ACTIONS */}
      <section style={{ marginTop: 20 }}>
        <button onClick={() => submitVote("yes")}>YES</button>
        <button onClick={() => submitVote("no")} style={{ marginLeft: 10 }}>
          NO
        </button>
        <button onClick={resolveRoom} style={{ marginLeft: 10 }}>
          Resolve
        </button>
      </section>

      {/* LEADERBOARD */}
      <section style={{ marginTop: 30 }}>
        <h3>Leaderboard</h3>
        <button onClick={loadLeaderboard}>Refresh</button>
        <pre style={{ background: "#fff8f0", padding: 10 }}>
          {JSON.stringify(leaderboard, null, 2)}
        </pre>
      </section>

      {/* STATUS / ERROR */}
      {status && (
        <p style={{ background: "#eef", padding: 10, marginTop: 20 }}>
          {status}
        </p>
      )}
      {error && (
        <p style={{ background: "#fee", padding: 10, marginTop: 20 }}>
          {error}
        </p>
      )}
    </main>
  );
}
