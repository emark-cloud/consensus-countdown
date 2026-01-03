"use client";

import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------
   CONFIG
------------------------------------------------------- */
const CONTRACT_ADDRESS = "0xBf8D00b0F61B1FE4Ad532fFf982633d8b67E0429";
const RPC_URL = "https://studio.genlayer.com/api";
const GENLAYER_CHAIN_ID = "0xF22F"; // 61999
const POLL_INTERVAL = 2000;

/* -------------------------------------------------------
   RPC HELPERS (READ)
------------------------------------------------------- */
async function readContract(method: string, args: any[] = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "genlayer_readContract",
      params: [
        {
          contractAddress: CONTRACT_ADDRESS,
          method,
          args,
        },
      ],
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

/* -------------------------------------------------------
   WALLET WRITE
------------------------------------------------------- */
async function writeWithWallet(method: string, args: any[]) {
  if (!window.ethereum) throw new Error("Wallet not found");

  const [from] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  return window.ethereum.request({
    method: "genlayer_callContract",
    params: [
      {
        from,
        contractAddress: CONTRACT_ADDRESS,
        method,
        args,
      },
    ],
  });
}

/* -------------------------------------------------------
   CHAIN ENSURE
------------------------------------------------------- */
async function ensureChain() {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID }],
    });
    return true;
  } catch {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: GENLAYER_CHAIN_ID,
            chainName: "GenLayer StudioNet",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [RPC_URL],
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }
}

/* -------------------------------------------------------
   PAGE
------------------------------------------------------- */
export default function Page() {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [room, setRoom] = useState<any>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  /* --------------------------------------------------- */
  async function loadRoom(id: string) {
    const r = await readContract("get_room", [id]);
    setRoom(Object.keys(r).length ? r : null);
    setVotes(await readContract("get_votes", [id]));
  }

  async function loadLeaderboard() {
    setLeaderboard(await readContract("get_leaderboard"));
  }

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => loadRoom(id), POLL_INTERVAL);
  }

  /* --------------------------------------------------- */
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

    if (!(await ensureChain())) {
      setError("Please switch to GenLayer StudioNet.");
      return;
    }

    try {
      setStatus("Creating room...");
      await writeWithWallet("create_room", [roomId, prompt]);
      setStatus("Room submitted. Waiting for chain...");
      startPolling(roomId);
    } catch {
      setError("Transaction failed. Try using GenLayer Studio.");
    }
  }

  async function vote(v: "yes" | "no") {
    try {
      setStatus("Submitting vote...");
      await writeWithWallet("submit_vote", [roomId, v]);
      await loadRoom(roomId);
      await loadLeaderboard();
      setStatus(null);
    } catch {
      setError("Vote failed.");
    }
  }

  async function resolveRoom() {
    try {
      setStatus("Resolving via AI + validators...");
      await writeWithWallet("resolve_room", [roomId]);
      startPolling(roomId);
    } catch {
      setError("Resolution failed.");
    }
  }

  /* --------------------------------------------------- */
  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 20 }}>
      <h1>Consensus Countdown</h1>
      <p style={{ color: "#555" }}>
        Players propose a statement. Validators decide consensus.
      </p>

      {/* ROOM CREATION */}
      <section>
        <h3>Create Room</h3>

        <label>Room ID</label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ width: "100%" }}
        />

        <label style={{ marginTop: 10 }}>
          Prompt <span style={{ color: "#999" }}>(players define the question)</span>
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
          <div>
            <p><strong>{room.prompt}</strong></p>
            <p>Resolved: {room.resolved ? "Yes" : "No"}</p>
            <p>Outcome: {room.final_outcome || "—"}</p>
          </div>
        ) : (
          <p>No room loaded</p>
        )}
      </section>

      {/* VOTING */}
      <section style={{ marginTop: 20 }}>
        <button onClick={() => vote("yes")}>YES</button>
        <button onClick={() => vote("no")} style={{ marginLeft: 10 }}>
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
        <pre>{JSON.stringify(leaderboard, null, 2)}</pre>
      </section>

      {/* STATUS */}
      {status && <p style={{ background: "#eef", padding: 10 }}>{status}</p>}
      {error && <p style={{ background: "#fee", padding: 10 }}>{error}</p>}
    </main>
  );
}
