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
   DETAILED ERROR FORMATTER
   - Annotates with source (function name)
   - Extracts message, reason, code, rpc body if present
   - Keeps original object in console for debugging
------------------------------------------------------- */
function extractErrorInfo(err: any) {
  if (!err) return { short: "Unknown error", full: err };

  // ethers errors may have .reason, .error, .code, .data
  const parts: string[] = [];

  if (typeof err === "string") {
    parts.push(err);
  } else {
    if (err.message) parts.push(err.message);
    if (err.reason && err.reason !== err.message) parts.push(`reason: ${err.reason}`);
    if (err.code) parts.push(`code: ${err.code}`);
    // RPC bodies from gen_call are sometimes embedded in err.message or err.error
    if (err.error) {
      try {
        parts.push(`rpc_error: ${JSON.stringify(err.error)}`);
      } catch {
        parts.push(`rpc_error: ${String(err.error)}`);
      }
    }
    if (err.data) {
      try {
        parts.push(`data: ${JSON.stringify(err.data)}`);
      } catch {
        parts.push(`data: ${String(err.data)}`);
      }
    }
  }

  const short = parts.length ? parts.join(" | ") : "Unknown error";
  return { short, full: err };
}

export default function Page() {
  /* ------------------ inputs ------------------ */
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");

  /* ---------------- on-chain ------------------ */
  const [room, setRoom] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});

  /* ------------------ ui ---------------------- */
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<any>(null); // full error object for debugging

  /* -------------------------------------------------------
     ERROR HELPERS
  ------------------------------------------------------- */
  function setDetailedError(source: string, err: any) {
    const { short, full } = extractErrorInfo(err);
    const annotated = `${source}: ${short}`;
    setError(annotated);
    setErrorDetail({ source, error: full, time: new Date().toISOString() });
    // Always log full error to console for debugging (stack, object)
    console.error(`[${source}]`, full);
  }

  /* -------------------------------------------------------
     READ HELPERS
  ------------------------------------------------------- */
  async function loadRoom(id: string) {
    try {
      const r = await genlayerRead(CONTRACT_ADDRESS, "get_room", [id]);
      setRoom(r && Object.keys(r).length ? r : null);

      const v = await genlayerRead(CONTRACT_ADDRESS, "get_votes", [id]);
      setVotes(v || {});
    } catch (e) {
      setDetailedError("loadRoom", e);
    }
  }

  async function loadLeaderboard() {
    try {
      const lb = await genlayerRead(CONTRACT_ADDRESS, "get_leaderboard");
      setLeaderboard(lb || {});
    } catch (e) {
      setDetailedError("loadLeaderboard", e);
    }
  }

  /* -------------------------------------------------------
     ACTIONS
  ------------------------------------------------------- */
  async function connectWallet() {
    setError(null);
    try {
      await ensureGenLayerChain();
      setStatus("Connected to GenLayer StudioNet");
    } catch (e) {
      setDetailedError("connectWallet", e);
    }
  }

  async function createRoom() {
    setError(null);

    if (!roomId.trim()) {
      setError("createRoom: Room ID is required.");
      return;
    }
    if (!prompt.trim()) {
      setError("createRoom: Prompt is required.");
      return;
    }

    try {
      setStatus("createRoom: Creating room… Please sign the transaction.");
      await genlayerWrite(CONTRACT_ADDRESS, "create_room", [roomId, prompt]);

      setStatus("createRoom: Room created. Loading state…");
      await loadRoom(roomId);
      setStatus(null);
    } catch (e) {
      setDetailedError("createRoom", e);
      setStatus(null);
    }
  }

  async function submitVote(vote: "yes" | "no") {
    setError(null);

    if (!room) {
      setError("submitVote: No active room loaded.");
      return;
    }

    try {
      setStatus(`submitVote: Submitting "${vote}"… Please sign the transaction.`);
      await genlayerWrite(CONTRACT_ADDRESS, "submit_vote", [roomId, vote]);

      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch (e) {
      setDetailedError("submitVote", e);
      setStatus(null);
    }
  }

  async function resolveRoom() {
    setError(null);

    if (!room) {
      setError("resolveRoom: No active room loaded.");
      return;
    }

    try {
      setStatus("resolveRoom: Resolving room via AI consensus… Please sign the transaction.");
      await genlayerWrite(CONTRACT_ADDRESS, "resolve_room", [roomId]);

      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch (e) {
      setDetailedError("resolveRoom", e);
      setStatus(null);
    }
  }

  /* -------------------------------------------------------
     EFFECTS
  ------------------------------------------------------- */
  useEffect(() => {
    loadLeaderboard().catch((e) => setDetailedError("init/loadLeaderboard", e));
  }, []);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <main style={{ maxWidth: 920, margin: "24px auto", padding: 20, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>Consensus Countdown</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Players propose subjective statements. Validators decide consensus.
      </p>

      {/* CONNECT */}
      <section style={{ marginTop: 12 }}>
        <button onClick={connectWallet}>Connect Wallet (GenLayer StudioNet)</button>
      </section>

      {/* CREATE ROOM */}
      <section style={{ marginTop: 18 }}>
        <h3>Create Room</h3>

        <label>Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ width: "100%", padding: 8, marginTop: 6 }}
        />

        <label style={{ marginTop: 8 }}>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. Was this performance overrated?"
          style={{ width: "100%", padding: 8, marginTop: 6 }}
        />

        <div style={{ marginTop: 10 }}>
          <button onClick={createRoom}>Create Room</button>
        </div>
      </section>

      {/* ROOM STATE */}
      <section style={{ marginTop: 22 }}>
        <h3>Room State</h3>
        {room ? (
          <div style={{ background: "#f5f5f5", padding: 12 }}>
            <p><strong>{String(room.prompt)}</strong></p>
            <p>Resolved: {room.resolved ? "Yes" : "No"}</p>
            <p>Final outcome: {room.final_outcome || "—"}</p>
            <p>Created at: {room.created_at ? new Date(Number(room.created_at) * 1000).toString() : "—"}</p>
          </div>
        ) : (
          <p>No room loaded.</p>
        )}
      </section>

      {/* ACTIONS */}
      <section style={{ marginTop: 16 }}>
        <button onClick={() => submitVote("yes")}>YES</button>
        <button onClick={() => submitVote("no")} style={{ marginLeft: 8 }}>NO</button>
        <button onClick={resolveRoom} style={{ marginLeft: 8 }}>Resolve</button>
      </section>

      {/* LEADERBOARD */}
      <section style={{ marginTop: 20 }}>
        <h3>Leaderboard</h3>
        <button onClick={loadLeaderboard}>Refresh</button>
        <pre style={{ background: "#fff8f0", padding: 12, marginTop: 8 }}>
          {JSON.stringify(leaderboard, null, 2)}
        </pre>
      </section>

      {/* STATUS */}
      {status && (
        <section style={{ marginTop: 18, padding: 12, background: "#eef" }}>
          <strong>Status</strong>
          <div style={{ marginTop: 6 }}>{status}</div>
        </section>
      )}

      {/* ERROR (short) */}
      {error && (
        <section style={{ marginTop: 18, padding: 12, border: "1px solid #e00", background: "#fff5f5" }}>
          <strong>Error</strong>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{error}</div>
        </section>
      )}

      {/* ERROR (detailed inspector) */}
      {errorDetail && (
        <section style={{ marginTop: 12, padding: 12, borderLeft: "4px solid #c00", background: "#fff" }}>
          <strong>Debug info</strong>
          <div style={{ marginTop: 8, fontSize: 13, color: "#333" }}>
            <div><strong>Source:</strong> {errorDetail.source}</div>
            <div style={{ marginTop: 6 }}>
              <strong>Full error object (console also contains stack):</strong>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{JSON.stringify(errorDetail.error, null, 2)}</pre>
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Timestamp:</strong> {errorDetail.time}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
