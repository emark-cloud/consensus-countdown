"use client";

import { useState } from "react";
import { genlayer } from "../lib/genlayer";

const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT as string;

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<any>(null);

  async function createRoom() {
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "create_room",
      args: [roomId, prompt]
    });
    alert("Room created");
  }

  async function getRoom() {
    const res = await genlayer.readContract({
      contractAddress: CONTRACT,
      method: "get_room",
      args: [roomId]
    });
    setOutput(res);
  }

  async function resolveRoom() {
    const res = await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "resolve_room",
      args: [roomId]
    });
    setOutput(res);
  }

  return (
    <main style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>Consensus Countdown</h1>

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={e => setRoomId(e.target.value)}
      />

      <textarea
        placeholder="Prompt"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={createRoom}>Create Room</button>
        <button onClick={getRoom}>Get Room</button>
        <button onClick={resolveRoom}>Resolve Room</button>
      </div>

      {output && (
        <pre style={{ marginTop: 16 }}>
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </main>
  );
}
