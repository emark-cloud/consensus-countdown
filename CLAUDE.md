# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js on port 3000)
npm run build    # Production build
npm start        # Start production server
npx tsc          # Type check without emitting
```

## Architecture

This is a multiplayer voting game built on **GenLayer** (an AI-enabled blockchain with Intelligent Contracts). Players vote YES/NO on subjective questions, and AI validators resolve the outcome using Optimistic Democracy consensus.

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS
- **Blockchain**: GenLayer StudioNet (chain ID 61999)
- **Wallet**: MetaMask integration via raw `window.ethereum` calls

### Key Directories

```
app/           # Next.js App Router pages
components/    # React UI components (ConnectWallet, CreateRoom, VotingPanel, etc.)
hooks/         # React hooks (useRoom for polling, useCountdown for timer)
lib/           # Core utilities
  genlayer.ts  # GenLayer RPC integration (read/write functions)
  errors.ts    # User-friendly error mapping
  config.ts    # Game configuration constants
types/         # TypeScript type definitions
```

### GenLayer Integration Pattern

GenLayer uses a custom RPC protocol, NOT standard Ethereum patterns:

**Reading contract state** (`lib/genlayer.ts:genlayerRead`):
- Uses `gen_call` RPC method with `type: "snapshot"`
- Passes method name and args directly (no ABI encoding)
- Direct fetch to `https://studio.genlayer.com/api`

**Writing transactions** (`lib/genlayer.ts:genlayerWrite`):
- Uses ethers.js ONLY for ABI encoding of calldata
- Sends raw transaction via MetaMask `eth_sendTransaction`
- NO gas/gasLimit/fee fields (GenLayer handles this)

**Contract address**: Hardcoded in `app/page.tsx` as `CONTRACT_ADDRESS`

### State Management

- No external state library; uses React useState/useEffect
- Room data polled every 5s via `useRoom` hook when room is active
- Countdown timer updates every 100ms via `useCountdown` hook

### Contract Methods

Write methods (defined in `CONTRACT_ABI`):
- `create_room(room_id, prompt)` - Create a new voting room
- `submit_vote(room_id, vote)` - Cast a "yes" or "no" vote
- `resolve_room(room_id)` - Trigger AI consensus resolution

Read methods (called via `genlayerRead`):
- `get_room(room_id)` - Get room state
- `get_votes(room_id)` - Get vote map for a room
- `get_leaderboard()` - Get XP leaderboard
