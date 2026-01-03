export interface Room {
  room_id: string;
  prompt: string;
  created_at: number; // Unix timestamp
  resolved: boolean;
  final_outcome: string; // "yes", "no", or "undetermined"
}

export interface VoteMap {
  [address: string]: "yes" | "no";
}

export interface LeaderboardMap {
  [address: string]: number; // XP points
}
