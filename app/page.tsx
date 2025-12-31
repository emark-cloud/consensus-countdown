"use client";

import { useState, useEffect } from "react";
import { genlayer } from "../lib/genlayer";

const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT as string;

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [leaderboard, setLeaderboard] = useState<[string, number][]>([]);

  // Voting + stats
  const [votesYes, setVotesYes] = useState(0);
  const [votesNo, setVotesNo] = useState(0);

  // Countdown timer
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [votingOpen, setVotingOpen] = useState(true);

  // Countdown effect
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setVotingOpen(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  // Live vote stats polling (read-only)
  useEffect(() => {
    if (!roomId) return;

    const poll = setInterval(async () => {
      try {
        const res = await genlayer.readContract({
          contractAddress: CONTRACT,
          method: "get_votes",
          args: [roomId],
        });

        let yes = 0;
        let no = 0;
        Object.values(res || {}).forEach((v: any) => {
          if (v === "yes") yes++;
          if (v === "no") no++;
        });

        setVotesYes(yes);
        setVotesNo(no);
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [roomId]);

  async function createRoom() {
    setStatus("Creating room...");
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "create_room",
      args: [roomId, prompt],
    });
    setStatus("Room created");
    setTimeLeft(duration);
    setVotingOpen(true);
    setVotesYes(0);
    setVotesNo(0);
  }

  async function submitVote(vote: "yes" | "no") {
    if (!votingOpen) return;
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

    const sorted = Object.entries(res)
      .map(([addr, xp]) => [addr, Number(xp)] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    setLeaderboard(sorted);
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
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

      <label>
        Countdown (seconds):
        <input
          type="number"
          min={10}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={{ marginLeft: 8, width: 80 }}
        />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={createRoom}>Create Room</button>
        <button onClick={getRoom}>Get Room</button>
      </div>

      <hr />

      <h3>Vote</h3>

      {timeLeft !== null && (
        <p>
          ⏱️ Time left: <strong>{timeLeft}s</strong>
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <button onClick={() => submitVote("yes")} disabled={!votingOpen}>
          YES
        </button>
        <button onClick={() => submitVote("no")} disabled={!votingOpen}>
          NO
        </button>
      </div>

      <p>
        📊 Votes — YES: <strong>{votesYes}</strong> | NO:{" "}
        <strong>{votesNo}</strong>
      </p>

      {!votingOpen && <p>Voting closed. Ready to resolve.</p>}

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
