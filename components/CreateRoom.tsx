import { useState } from 'react';

interface CreateRoomProps {
  onCreateRoom: (roomId: string, prompt: string) => void;
  onRoomIdChange: (roomId: string) => void;
}

export function CreateRoom({ onCreateRoom, onRoomIdChange }: CreateRoomProps) {
  const [roomId, setRoomId] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleCreate = () => {
    onCreateRoom(roomId, prompt);
    onRoomIdChange(roomId);
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-xl font-bold text-gray-900">Create Room</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Room ID
        </label>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-genlayer-primary focus:border-transparent"
          placeholder="e.g., game-123"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt (Subjective Question)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-genlayer-primary focus:border-transparent resize-none"
          placeholder="e.g., Was this performance overrated?"
        />
      </div>

      <button
        onClick={handleCreate}
        className="btn-primary w-full"
      >
        Create Room
      </button>
    </div>
  );
}
