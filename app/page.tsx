"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  genlayerRead,
  genlayerWrite,
  ensureGenLayerChain,
} from "../lib/genlayer";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */
const CONTRACT_ADDRESS = "0xBf8D00b0F61B1FE4Ad532fFf982633d8b67E0429";
const POLL_INTERVAL = 2000;

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

  const pollRef = useRef<number | null>(null);

  /* -------------------------------------------------------
     READ HELPERS
  ------------------------------------------------------- */
  async function loadRoom(id: string) {
    const r = await genlayerRead(CONTRACT_ADDRESS, "get_room", [id]);
    setRoom(Object.keys(r).length ? r : null);

    const v = await genlayerRead(CONTRACT_ADDRESS, "get_votes", [id]);
    setVotes(v || {});
  }

  async function loadLeaderboard() {
    const lb = await genlayerRead(CONTRACT_ADDRESS, "get_leaderboard");
    setLeaderboard(lb || {});
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadRoom(id).catch(() => {});
    }, POLL_INTERVAL);
  }

  /* -------------------------------------------------------
     ACTIONS
  ------------------------------------------------------- */
  async function createRoom() {
    setError(null);

    if (!roomId.trim()) {
      setError("Room ID is required.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please write a prompt. Players define the question.");
      return;
    }

    try {
      setStatus("Switching to GenLayer StudioNet...");
      await ensureGenLayerChain();

      setStatus("Creating room...");
      await genlayerWrite(CONTRACT_ADDRESS, "create_room", [roomId, prompt]);

      setStatus("Room submitted. Waiting for chain...");
      startPolling(roomId);
    } catch (err: any) {
      setStatus(null);
      setError(err.message || "Failed to create room.");
    }
  }

  async function submitVote(vote: "yes" | "no") {
    setError(null);

    if (!room) {
      setError("No active room.");
      return;
    }

    try {
      setStatus("Submitting vote...");
      await ensureGenLayerChain();

      await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [roomId, vote]);

      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch (err: any) {
      setStatus(null);
      setError(err.message || "Vote failed.");
    }
  }

  async function resolveRoom() {
    setError(null);

    if (!room) {
      setError("No active room.");
      return;
    }

    try {
      setStatus("Resolving via AI + validators...");
      await ensureGenLayerChain();

      await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [roomId]);

      startPolling(roomId);
    } catch (err: any) {
      setStatus(null);
      setError(err.message || "Resolution failed.");
    }
  }

  /* -------------------------------------------------------
     EFFECTS
  ------------------------------------------------------- */
  useEffect(() => {
    loadLeaderboard().catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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

      {/* CREATE ROOM */}
      <section>
        <h3>Create Room</h3>

        <label>Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ width: "100%" }}
        />

        <label style={{ marginTop: 10 }}>
          Prompt{" "}
          <span style={{ color: "#999" }}>
            (players define the question)
          </span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Was this performance overrated?"
          rows={4}
          style={{ width: "100%" }}
        />

        <button onClick={createRoom} style={{ marginTop: 12 }}>
          Create Room
        </button>
      </section>

      {/* ROOM STATE */}
      <section style={{ marginTop: 30 }}>
        <h3>Room</h3>
        {room ? (
          <div style={{ background: "#f8f8f8", padding: 12 }}>
            <p>
              <strong>{room.prompt}</strong>
            </p>
            <p>Resolved: {room.resolved ? "Yes" : "No"}</p>
            <p>Outcome: {room.final_outcome || "—"}</p>
          </div>
        ) : (
          <p>No room loaded</p>
        )}
      </section>

      {/* VOTING */}
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

      {/* STATUS / ERRORS */}
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
