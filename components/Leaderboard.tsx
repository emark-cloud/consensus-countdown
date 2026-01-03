import { LeaderboardMap } from '@/types/room';
import { shortenAddress } from '@/lib/utils';

export function Leaderboard({
  leaderboard,
  onRefresh
}: {
  leaderboard: LeaderboardMap;
  onRefresh: () => void;
}) {
  const entries = Object.entries(leaderboard).sort(([, a], [, b]) => b - a);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Leaderboard</h3>
        <button
          onClick={onRefresh}
          className="btn bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm"
        >
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No players yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([address, xp], index) => (
            <div
              key={address}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">
                  #{index + 1}
                </span>
                <span className="font-mono text-sm text-gray-700">
                  {shortenAddress(address)}
                </span>
              </div>
              <span className="font-semibold text-genlayer-primary">
                {xp} XP
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
