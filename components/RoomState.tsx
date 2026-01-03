import { Room } from '@/types/room';
import { CountdownTimer } from './CountdownTimer';

export function RoomState({ room }: { room: Room | null }) {
  if (!room) {
    return (
      <div className="card">
        <p className="text-gray-500 text-center">No room loaded.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div>
        <h4 className="text-sm text-gray-600 font-medium mb-1">Prompt</h4>
        <p className="text-lg font-semibold text-gray-900">{room.prompt}</p>
      </div>

      {!room.resolved && (
        <div>
          <h4 className="text-sm text-gray-600 font-medium mb-2">Time Remaining</h4>
          <CountdownTimer createdAt={room.created_at} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`ml-2 font-semibold ${
            room.resolved ? 'text-blue-700' : 'text-green-700'
          }`}>
            {room.resolved ? 'Resolved' : 'Active'}
          </span>
        </div>

        {room.resolved && (
          <div>
            <span className="text-sm text-gray-600">Outcome:</span>
            <span className="ml-2 font-semibold text-indigo-700 uppercase">
              {room.final_outcome || '—'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
