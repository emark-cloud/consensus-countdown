import { VoteMap } from '@/types/room';

interface VotingPanelProps {
  votes: VoteMap;
  isExpired: boolean;
  isResolved: boolean;
  walletAddress: string | null;
  onVote: (vote: "yes" | "no") => void;
  onResolve: () => void;
}

export function VotingPanel({
  votes,
  isExpired,
  isResolved,
  walletAddress,
  onVote,
  onResolve
}: VotingPanelProps) {
  const yesCount = Object.values(votes).filter(v => v === "yes").length;
  const noCount = Object.values(votes).filter(v => v === "no").length;
  const totalVotes = yesCount + noCount;

  // Check if user has already voted (case-insensitive address comparison)
  const userVote = walletAddress
    ? Object.entries(votes).find(
        ([addr]) => addr.toLowerCase() === walletAddress.toLowerCase()
      )?.[1]
    : undefined;
  const hasVoted = userVote !== undefined;

  const votingDisabled = isExpired || isResolved || hasVoted;

  return (
    <div className="space-y-4">
      {/* Vote Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onVote("yes")}
          disabled={votingDisabled}
          className="btn-success flex-1 text-lg py-3"
        >
          YES
        </button>
        <button
          onClick={() => onVote("no")}
          disabled={votingDisabled}
          className="btn bg-red-600 text-white hover:bg-red-700 flex-1 text-lg py-3"
        >
          NO
        </button>
      </div>

      {/* Vote Counts - only shown after resolution */}
      {isResolved && totalVotes > 0 && (
        <div className="flex justify-around text-sm text-gray-600 bg-gray-100 rounded-lg p-3">
          <div>
            <span className="font-semibold text-green-700">YES:</span> {yesCount}
          </div>
          <div>
            <span className="font-semibold text-red-700">NO:</span> {noCount}
          </div>
          <div>
            <span className="font-semibold">Total:</span> {totalVotes}
          </div>
        </div>
      )}

      {/* Resolve Button */}
      {isExpired && !isResolved && (
        <button
          onClick={onResolve}
          className="btn-primary w-full text-lg py-3"
        >
          Resolve with AI Consensus
        </button>
      )}

      {hasVoted && !isResolved && (
        <p className="text-sm text-green-600 text-center">
          You voted <span className="font-semibold uppercase">{userVote}</span>
        </p>
      )}

      {votingDisabled && !isResolved && !hasVoted && (
        <p className="text-sm text-gray-500 text-center">
          Voting is closed. Waiting for resolution...
        </p>
      )}
    </div>
  );
}
