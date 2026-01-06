export interface Room {
  room_id: string;
  prompt: string;
  created_at: number | bigint; // Unix timestamp (may be BigInt from GenLayer SDK)
  resolved: boolean;
  final_outcome: string; // "yes", "no", or "undetermined"
}

export interface VoteMap {
  [address: string]: "yes" | "no";
}

export interface LeaderboardMap {
  [address: string]: number | bigint; // XP points (may be BigInt from GenLayer SDK)
}
