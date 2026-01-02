"use client";

import { useEffect, useState } from "react";
import { genlayer } from "../lib/genlayer";

/* -------------------------------------------------------------------------- */
/*                               Constants                                    */
/* -------------------------------------------------------------------------- */

const CONTRACT = "0x65090e7324b754a653764AeE7Ed2d0FB7E698fB5";
const GENLAYER_CHAIN_ID = "0xF22F"; // 61999

const GENLAYER_CHAIN = {
  chainId: GENLAYER_CHAIN_ID,
  chainName: "GenLayer StudioNet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://studio.genlayer.com/api"],
};

/* -------------------------------------------------------------------------- */
/*                              Prompt Presets                                */
/* -------------------------------------------------------------------------- */

const PROMPT_PRESETS: Record<string, string[]> = {
  Sports: [
    "Did the referee decision change the outcome of the match?",
    "Was this performance overrated?",
    "Did the better team actually win?",
  ],
  Governance: [
    "Is this DAO proposal too risky?",
    "Should emergency powers be used here?",
    "Is this decision aligned with long-term incentives?",
  ],
  Tech: [
    "Is this AI output misleading?",
    "Does this model hallucinate in this example?",
    "Is automation appropriate in this case?",
  ],
  Culture: [
    "Is this meme offensive?",
    "Is this headline clickbait?",
    "Does this joke cross a line?",
  ],
};

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [wallet, setWallet] = useState<string | null>(null);

  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Sports");

  const [status, setStatus] = useState("");
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const [roomActive, setRoomActive] = useState(false);

  const [votesYes, setVotesYes] = useState(0);
  const [votesNo, setVotesNo] = useState(0);

  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);

  /* ---------------- Wallet ---------------- */

  async function connectWallet() {
    if (!(window as any).ethereum) {
      alert("MetaMask is required");
      return;
    }

    const eth = (window as any).ethereum;

    // 1. Request accounts
    const accounts = await eth.request({
      method: "eth_requestAccounts",
    });

    // 2. Check chain
    const currentChain = await eth.request({
      method: "eth_chainId",
    });

    // 3. Switch or add GenLayer StudioNet
    if (currentChain !== GENLAYER_CHAIN_ID) {
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: GENLAYER_CHAIN_ID }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [GENLAYER_CHAIN],
          });
        } else {
          throw err;
        }
      }
    }

    setWallet(accounts[0]);
  }

  /* ---------------- Countdown ---------------- */

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setVotingOpen(false);
      return;
    }

    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  /* ---------------- Helpers ---------------- */

  function loadRandomPrompt(cat: string) {
    const list = PROMPT_PRESETS[cat];
    const idx = Math.floor(Math.random() * list.length);
    setPrompt(list[idx]);
  }

  /* ---------------- Contract Actions ---------------- */

  async function createRoom() {
    if (!wallet) {
      alert("Connect wallet first");
      return;
    }

    if (!roomId || !prompt) {
      alert("Room ID and prompt are required");
      return;
    }

    try {
      setStatus("Please confirm the transaction in MetaMask…");

      const txHash = await genlayer.callContract({
        contractAddress: CONTRACT,
        method: "create_room",
        args: [roomId, prompt],
      });

      // Optimistic UI update
      setPendingTx(txHash ?? null);
      setRoomActive(true);
      setVotingOpen(true);
      setTimeLeft(duration);
      setVotesYes(0);
      setVotesNo(0);

      setStatus(
        "Transaction submitted. Validators are reviewing the room (Optimistic Democracy)."
      );
    } catch (err) {
      console.error(err);
      setStatus("Transaction rejected or failed.");
    }
  }

  async function submitVote(vote: "yes" | "no") {
    if (!wallet || !roomActive || !votingOpen) return;

    try {
      setStatus(`Submitting ${vote.toUpperCase()} vote…`);

      await genlayer.callContract({
        contractAddress: CONTRACT,
        method: "submit_vote",
        args: [roomId, vote],
      });

      if (vote === "yes") setVotesYes((v) => v + 1);
      if (vote === "no") setVotesNo((v) => v + 1);

      setStatus(`Vote submitted: ${vote.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      setStatus("Vote failed.");
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <main style={{ background: "#fafafa", minHeight: "100vh", padding: 24 }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#fff",
          padding: 24,
          borderRadius: 12,
        }}
      >
        <h1>Consensus Countdown</h1>
        <p>A GenLayer mini-game powered by Optimistic Democracy</p>

        {!wallet ? (
          <button onClick={connectWallet} style={btnPrimary}>
            Connect Wallet
          </button>
        ) : (
          <p style={{ fontSize: 12 }}>
            Connected: {wallet.slice(0, 6)}…{wallet.slice(-4)} (GenLayer StudioNet)
          </p>
        )}

        <h3>Room Setup</h3>

        <input
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={input}
        />

        <div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.keys(PROMPT_PRESETS).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button onClick={() => loadRandomPrompt(category)}>
            Random Prompt
          </button>
        </div>

        <textarea
          placeholder="Prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={input}
        />

        <label>
          Countdown:
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>

        <button onClick={createRoom} style={btnPrimary}>
          Create Room
        </button>

        {status && <p>{status}</p>}

        {pendingTx && (
          <p style={{ fontSize: 12, color: "#555" }}>
            ⏳ Pending tx: {pendingTx.slice(0, 10)}…
          </p>
        )}

        <h3>Voting</h3>

        {timeLeft !== null && <p>⏱️ {timeLeft}s</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => submitVote("yes")}
            style={btnYes}
            disabled={!roomActive || !votingOpen}
          >
            YES
          </button>
          <button
            onClick={() => submitVote("no")}
            style={btnNo}
            disabled={!roomActive || !votingOpen}
          >
            NO
          </button>
        </div>

        <p>
          Votes → YES: {votesYes} | NO: {votesNo}
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const input = { width: "100%", padding: 8, marginBottom: 8 };

const btnBase = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary = { ...btnBase, background: "#111827", color: "#fff" };
const btnYes = { ...btnBase, background: "#16a34a", color: "#fff", flex: 1 };
const btnNo = { ...btnBase, background: "#dc2626", color: "#fff", flex: 1 };
