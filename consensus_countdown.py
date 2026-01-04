# v0.1.0
# { "Depends": "py-genlayer:latest" }

from genlayer import *
from dataclasses import dataclass
import time


@allow_storage
@dataclass
class Room:
    room_id: str
    prompt: str
    created_at: u256          # ← FIXED (no floats)
    resolved: bool
    final_outcome: str        # "yes", "no", "undetermined"


class ConsensusCountdown(gl.Contract):
    rooms: TreeMap[str, Room]
    votes: TreeMap[str, TreeMap[Address, str]]
    xp: TreeMap[Address, u256]

    def __init__(self):
        # Do NOT assign storage descriptors here
        pass

    # ------------------------------------------------------------------
    # Room creation
    # ------------------------------------------------------------------
    @gl.public.write
    def create_room(self, room_id: str, prompt: str) -> None:
        if room_id in self.rooms:
            raise Exception("Room already exists")

        room = Room(
            room_id=room_id,
            prompt=prompt,
            created_at=u256(int(time.time())),  # ← FIXED
            resolved=False,
            final_outcome=""
        )

        self.rooms[room_id] = room
        self.votes[room_id] = gl.storage.inmem_allocate(TreeMap[Address, str])

    # ------------------------------------------------------------------
    # Voting
    # ------------------------------------------------------------------
    @gl.public.write
    def submit_vote(self, room_id: str, vote: str) -> None:
        room = self.rooms.get(room_id)
        if room is None:
            raise Exception("Room not found")

        if room.resolved:
            raise Exception("Room already resolved")

        vote_lc = vote.strip().lower()
        if vote_lc not in ["yes", "no"]:
            raise Exception("Invalid vote")

        sender = gl.message.sender_address
        room_votes = self.votes.get(room_id)

        if sender in room_votes:
            raise Exception("Vote already submitted")

        room_votes[sender] = vote_lc
        self.votes[room_id] = room_votes  # explicit write

    # ------------------------------------------------------------------
    # Resolution (AI + Optimistic Democracy)
    # ------------------------------------------------------------------
    @gl.public.write
    def resolve_room(self, room_id: str) -> None:
        room = self.rooms.get(room_id)
        if room is None:
            raise Exception("Room not found")

        if room.resolved:
            raise Exception("Room already resolved")

        prompt_text = room.prompt

        def ai_decision() -> str:
            task = f"""
Answer strictly YES or NO.

Question:
{prompt_text}

Rules:
- Output exactly one word: YES or NO
- No punctuation
- No explanation
"""
            result = gl.nondet.exec_prompt(task)
            return result.strip().upper()

        outcome_raw = gl.eq_principle.strict_eq(ai_decision)

        if outcome_raw == "YES":
            outcome = "yes"
        elif outcome_raw == "NO":
            outcome = "no"
        else:
            outcome = "undetermined"

        room.resolved = True
        room.final_outcome = outcome
        self.rooms[room_id] = room

        room_votes = self.votes.get(room_id)
        if room_votes is not None:
            for voter, vote in room_votes.items():
                if voter not in self.xp:
                    self.xp[voter] = u256(0)

                if outcome == "undetermined":
                    self.xp[voter] += u256(5)
                elif vote == outcome:
                    self.xp[voter] += u256(10)

    # ------------------------------------------------------------------
    # Read-only views
    # ------------------------------------------------------------------
    @gl.public.view
    def get_room(self, room_id: str) -> dict:
        room = self.rooms.get(room_id)
        if room is None:
            return {}

        return {
            "room_id": room.room_id,
            "prompt": room.prompt,
            "created_at": int(room.created_at),  # frontend-friendly
            "resolved": room.resolved,
            "final_outcome": room.final_outcome
        }

    @gl.public.view
    def get_votes(self, room_id: str) -> dict:
        room_votes = self.votes.get(room_id)
        if room_votes is None:
            return {}

        return {addr.as_hex: vote for addr, vote in room_votes.items()}

    @gl.public.view
    def get_leaderboard(self) -> dict:
        return {addr.as_hex: int(score) for addr, score in self.xp.items()}
