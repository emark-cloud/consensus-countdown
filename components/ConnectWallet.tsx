import { shortenAddress } from "@/lib/utils";

interface ConnectWalletProps {
  onConnect: () => void;
  address: string | null;
}

export function ConnectWallet({ onConnect, address }: ConnectWalletProps) {
  if (address) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-green-700">Connected to GenLayer StudioNet</p>
          <p className="font-mono text-green-900 font-semibold">{shortenAddress(address)}</p>
        </div>
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      </div>
    );
  }

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
