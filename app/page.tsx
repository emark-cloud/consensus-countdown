"use client";

import { useState } from "react";
import { genlayer } from "../lib/genlayer";

const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT as string;

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [leaderboard, setLeaderboard] = useState<[string, number][]>([]);

  async function createRoom() {
    setStatus("Creating room...");
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "create_room",
      args: [roomId, prompt],
    });
    setStatus("Room created");
  }

  async function submitVote(vote: "yes" | "no") {
    setStatus(`Submitting ${vote.toUpperCase()} vote...`);
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "submit_vote",
      args: [roomId, vote],
    });
    setStatus(`Vote ${vote.toUpperCase()} submitted`);
  }

  async function getRoom() {
    const res = await genlayer.readContract({
      contractAddress: CONTRACT,
      method: "get_room",
      args: [roomId],
    });
    setOutput(res);
  }

  async function resolveRoom() {
    setStatus("Resolving via Optimistic Democracy...");
    const res = await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "resolve_room",
      args: [roomId],
    });
    setOutput(res);
    setStatus("Resolution complete");
  }

  async function loadLeaderboard() {
    const res = await genlayer.readContract({
      contractAddress: CONTRACT,
      method: "get_leaderboard",
      args: [],
    });

    // Convert object -> sorted array
    const sorted = Object.entries(res)
      .map(([addr, xp]) => [addr, Number(xp)] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    setLeaderboard(sorted);
  }

  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Consensus Countdown</h1>

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <textarea
        placeholder="Prompt (only for room creation)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={createRoom}>Create Room</button>
        <button onClick={getRoom}>Get Room</button>
      </div>

      <hr />

      <h3>Vote</h3>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <button onClick={() => submitVote("yes")}>YES</button>
        <button onClick={() => submitVote("no")}>NO</button>
      </div>

      <button onClick={resolveRoom}>Resolve Room</button>

      {status && (
        <p style={{ marginTop: 12, fontStyle: "italic" }}>{status}</p>
      )}

      {output && (
        <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12 }}>
          {JSON.stringify(output, null, 2)}
        </pre>
      )}

      <hr style={{ margin: "24px 0" }} />

      <h2>🏆 Leaderboard</h2>
      <button onClick={loadLeaderboard}>Load Leaderboard</button>

      {leaderboard.length > 0 && (
        <ol style={{ marginTop: 12 }}>
          {leaderboard.map(([addr, xp], idx) => (
            <li key={addr}>
              #{idx + 1} — {addr.slice(0, 6)}…{addr.slice(-4)} : {xp} XP
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
