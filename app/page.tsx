"use client";

import { useState, useEffect } from "react";
import { genlayer } from "../lib/genlayer";

const CONTRACT = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT as string;

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [output, setOutput] = useState<any>(null);

  const [votesYes, setVotesYes] = useState(0);
  const [votesNo, setVotesNo] = useState(0);

  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [votingOpen, setVotingOpen] = useState(true);

  const [leaderboard, setLeaderboard] = useState<[string, number][]>([]);

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

  /* ---------------- Live vote stats ---------------- */

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

  /* ---------------- Contract actions ---------------- */

  async function createRoom() {
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
    if (!votingOpen) return;
    setStatus(`Submitting ${vote.toUpperCase()} vote…`);
    await genlayer.callContract({
      contractAddress: CONTRACT,
      method: "submit_vote",
      args: [roomId, vote],
    });
    setStatus(`Vote submitted: ${vote.toUpperCase()}`);
  }

  async function resolveRoom() {
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
    const res = await genlayer.readContract({
      contractAddress: CONTRACT,
      method: "get_leaderboard",
      args: [],
    });

    const sorted = Object.entries(res)
      .map(([a, x]) => [a, Number(x)] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    setLeaderboard(sorted);
  }

  /* ---------------- UI ---------------- */

  return (
    <main style={{ fontFamily: "system-ui", background: "#fafafa", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>

        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Consensus Countdown</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>
          A GenLayer mini-game powered by Optimistic Democracy
        </p>

        {/* Room setup */}
        <section style={{ marginBottom: 24 }}>
          <h3>Room Setup</h3>

          <input
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />

          <textarea
            placeholder="Question / Prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 8 }}
          />

          <label style={{ fontSize: 14 }}>
            Countdown (seconds):
            <input
              type="number"
              min={10}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <button onClick={createRoom} style={btnPrimary}>Create Room</button>
          </div>
        </section>

        {/* Voting */}
        <section style={{ marginBottom: 24 }}>
          <h3>Voting</h3>

          {timeLeft !== null && (
            <div style={{ fontSize: 20, marginBottom: 8 }}>
              ⏱️ <strong>{timeLeft}s</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button disabled={!votingOpen} onClick={() => submitVote("yes")} style={btnYes}>YES</button>
            <button disabled={!votingOpen} onClick={() => submitVote("no")} style={btnNo}>NO</button>
          </div>

          <div style={{ marginTop: 12, fontSize: 14 }}>
            Votes → YES: <strong>{votesYes}</strong> | NO: <strong>{votesNo}</strong>
          </div>

          {!votingOpen && (
            <div style={{ marginTop: 8, color: "#b45309" }}>
              Voting closed — ready to resolve
            </div>
          )}
        </section>

        {/* Resolution */}
        <section style={{ marginBottom: 24 }}>
          <button onClick={resolveRoom} style={btnResolve}>Resolve Outcome</button>

          {output && (
            <pre style={{ marginTop: 12, background: "#f3f4f6", padding: 12, borderRadius: 8 }}>
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </section>

        {/* Status */}
        {status && (
          <div style={{ background: "#eef2ff", padding: 10, borderRadius: 8, marginBottom: 24 }}>
            {status}
          </div>
        )}

        {/* Leaderboard */}
        <section>
          <h3>🏆 Leaderboard</h3>
          <button onClick={loadLeaderboard} style={btnSecondary}>Load Leaderboard</button>

          {leaderboard.length > 0 && (
            <ol style={{ marginTop: 12 }}>
              {leaderboard.map(([addr, xp], i) => (
                <li key={addr}>
                  #{i + 1} — {addr.slice(0, 6)}…{addr.slice(-4)} — <strong>{xp}</strong> XP
                </li>
              ))}
            </ol>
          )}
        </section>

      </div>
    </main>
  );
}

/* ---------------- Styles ---------------- */

const btnBase = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary = {
  ...btnBase,
  background: "#111827",
  color: "#fff",
};

const btnSecondary = {
  ...btnBase,
  background: "#e5e7eb",
};

const btnYes = {
  ...btnBase,
  background: "#16a34a",
  color: "#fff",
  flex: 1,
};

const btnNo = {
  ...btnBase,
  background: "#dc2626",
  color: "#fff",
  flex: 1,
};

const btnResolve = {
  ...btnBase,
  background: "#4f46e5",
  color: "#fff",
  width: "100%",
};
