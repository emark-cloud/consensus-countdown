"use client";

import { useEffect, useState } from "react";
import { genlayer } from "../lib/genlayer";

/* -------------------------------------------------------------------------- */
/*                         GenLayer StudioNet Config                           */
/* -------------------------------------------------------------------------- */

const GENLAYER_CHAIN = {
  chainId: "0xF1BF", // 61999
  chainName: "GenLayer StudioNet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://studio.genlayer.com/api"],
};

const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT as string;

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
/*                              Weekly Reset                                  */
/* -------------------------------------------------------------------------- */

function getWeekId() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const week = Math.floor(
    (Date.UTC(year, now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(year, 0, 1)) /
      (7 * 24 * 60 * 60 * 1000)
  );
  return `${year}-W${week}`;
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [hasEthereum, setHasEthereum] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);

  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Sports");

  const [status, setStatus] = useState("");
  const [output, setOutput] = useState<any>(null);

  const [votesYes, setVotesYes] = useState(0);
  const [votesNo, setVotesNo] = useState(0);

  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [votingOpen, setVotingOpen] = useState(true);

  const [leaderboard, setLeaderboard] = useState<[string, number][]>([]);

  /* ---------------- Detect MetaMask safely ---------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkEthereum = () => {
      if ((window as any).ethereum) {
        setHasEthereum(true);
      }
    };

    checkEthereum();

    window.addEventListener("ethereum#initialized", checkEthereum, {
      once: true,
    });

    setTimeout(checkEthereum, 3000);

    return () => {
      window.removeEventListener("ethereum#initialized", checkEthereum);
    };
  }, []);

  /* ---------------- Wallet + Chain ---------------- */

  async function connectWallet() {
    if (!hasEthereum) {
      alert("MetaMask not detected. Please install MetaMask and refresh.");
      return;
    }

    const eth = (window as any).ethereum;

    try {
      const accounts = await eth.request({
        method: "eth_requestAccounts",
      });

      const chainId = await eth.request({ method: "eth_chainId" });

      if (chainId !== GENLAYER_CHAIN.chainId) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: GENLAYER_CHAIN.chainId }],
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
    } catch (err) {
      console.error(err);
      alert("Wallet connection rejected");
    }
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

  /* ---------------- Live Vote Stats ---------------- */

  useEffect(() => {
    if (!roomId) return;

    const poll = setInterval(async () => {
      try {
        const res = await genlayer.readContract({
          contractAddress: CONTRACT,
          method: "get_votes",
          args: [roomId],
        });

        let y = 0;
        let n = 0;
        Object.values(res || {}).forEach((v: any) => {
          if (v === "yes") y++;
          if (v === "no") n++;
        });

        setVotesYes(y);
        setVotesNo(n);
      } catch {}
    }, 3000);

    return () => clearInterval(poll);
  }, [roomId]);

  /* ---------------- Helpers ---------------- */

  function loadRandomPrompt(cat: string) {
    const list = PROMPT_PRESETS[cat];
    const idx = Math.floor(Math.random() * list.length);
    setPrompt(list[idx]);
  }

  /* ---------------- Contract Actions ---------------- */

  async function createRoom() {
    if (!wallet) return alert("Connect wallet first");

    setStatus("Creating room…");
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "create_room",
      args: [roomId, prompt],
    });

    setTimeLeft(duration);
    setVotingOpen(true);
    setVotesYes(0);
    setVotesNo(0);
    setStatus("Room created. Voting is open.");
  }

  async function submitVote(vote: "yes" | "no") {
    if (!wallet || !votingOpen) return;

    setStatus(`Submitting ${vote.toUpperCase()} vote…`);
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "submit_vote",
      args: [roomId, vote],
    });

    setStatus(`Vote submitted: ${vote.toUpperCase()}`);
  }

  async function resolveRoom() {
    if (!wallet) return;

    setStatus("Resolving via Optimistic Democracy…");
    const res = await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "resolve_room",
      args: [roomId],
    });

    setOutput(res);
    setStatus("Consensus finalized.");
  }

  async function loadLeaderboard() {
    const weekId = getWeekId();
    const storedWeek = localStorage.getItem("cc-week");

    if (storedWeek !== weekId) {
      localStorage.setItem("cc-week", weekId);
      localStorage.removeItem("cc-leaderboard");
      setLeaderboard([]);
    }

    const res = await genlayer.readContract({
      contractAddress: CONTRACT,
      method: "get_leaderboard",
      args: [],
    });

    const sorted = Object.entries(res)
      .map(([addr, xp]) => [addr, Number(xp)] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    localStorage.setItem("cc-leaderboard", JSON.stringify(sorted));
    setLeaderboard(sorted);
  }

  /* ---------------- UI ---------------- */

  return (
    <main style={{ background: "#fafafa", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", padding: 24, borderRadius: 12 }}>

        <h1>Consensus Countdown</h1>
        <p>A GenLayer mini-game powered by Optimistic Democracy</p>

        {!wallet ? (
          <button
            onClick={connectWallet}
            style={btnPrimary}
            disabled={!hasEthereum}
          >
            {hasEthereum ? "Connect Wallet (StudioNet)" : "Waiting for MetaMask…"}
          </button>
        ) : (
          <p style={{ fontSize: 12 }}>
            Connected: {wallet.slice(0, 6)}…{wallet.slice(-4)}
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
          <button onClick={() => loadRandomPrompt(category)}>Random Prompt</button>
        </div>

        <textarea
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

        <h3>Voting</h3>

        {timeLeft !== null && <p>⏱️ {timeLeft}s</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => submitVote("yes")} style={btnYes} disabled={!votingOpen}>
            YES
          </button>
          <button onClick={() => submitVote("no")} style={btnNo} disabled={!votingOpen}>
            NO
          </button>
        </div>

        <p>
          Votes → YES: {votesYes} | NO: {votesNo}
        </p>

        <button onClick={resolveRoom} style={btnResolve}>
          Resolve Outcome
        </button>

        {status && <p>{status}</p>}

        {output && <pre>{JSON.stringify(output, null, 2)}</pre>}

        <h3>🏆 Weekly Leaderboard</h3>
        <button onClick={loadLeaderboard}>Load Leaderboard</button>

        <ol>
          {leaderboard.map(([a, x], i) => (
            <li key={a}>
              #{i + 1} — {a.slice(0, 6)}…{a.slice(-4)} — {x} XP
            </li>
          ))}
        </ol>

      </div>
    </main>
  );
}

/* ---------------- Styles ---------------- */

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
const btnResolve = { ...btnBase, background: "#4f46e5", color: "#fff", width: "100%" };
