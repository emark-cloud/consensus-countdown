export function ConnectWallet({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
      <p className="text-sm text-indigo-900 mb-3">
        Connect your wallet to GenLayer StudioNet to play.
      </p>
      <button onClick={onConnect} className="btn-primary">
        Connect Wallet
      </button>
    </div>
  );
}
