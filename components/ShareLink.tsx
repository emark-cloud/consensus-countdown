"use client";

import { useState } from "react";

export function ShareLink({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${encodeURIComponent(roomId)}`
    : "";

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }

  return (
    <div className="card bg-green-50 border-green-200">
      <h4 className="text-sm font-semibold text-green-800 mb-2">
        Share this room
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-gray-700 font-mono"
        />
        <button
          onClick={copyToClipboard}
          className="btn bg-green-600 text-white hover:bg-green-700 text-sm"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
