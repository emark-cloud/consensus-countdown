declare global {
  interface Window {
    ethereum?: any;
  }
}

const RPC_URL = "https://studio.genlayer.com/api";


async function rpc(method: string, params: any[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || "RPC Error");
  }
  return json.result;
}

async function getSenderAddress(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts[0];
}

export const genlayer = {
  async callContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    const from = await getSenderAddress();

    return rpc("genlayer_callContract", [
      {
        from,
        contractAddress,
        method,
        args,
      },
    ]);
  },

  async readContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    return rpc("genlayer_readContract", [
      {
        contractAddress,
        method,
        args,
      },
    ]);
  },
};
