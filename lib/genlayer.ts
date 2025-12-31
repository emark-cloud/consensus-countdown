// lib/genlayer.ts

declare global {
  interface Window {
    ethereum?: any;
  }
}

const RPC_URL = "https://studio.genlayer.com/api";

/* -------------------------------------------------------------------------- */
/*                               Read Helpers                                 */
/* -------------------------------------------------------------------------- */

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
    throw new Error(json.error.message || "GenLayer RPC error");
  }
  return json.result;
}

/* -------------------------------------------------------------------------- */
/*                              Public Interface                              */
/* -------------------------------------------------------------------------- */

export const genlayer = {
  /* ---------------- Read (safe, stateless) ---------------- */

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

  /* ---------------- Write (wallet-backed) ---------------- */

  async callContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    if (!window.ethereum) {
      throw new Error("MetaMask not available");
    }

    const eth = window.ethereum;

    // Ensure wallet permission
    const [from] = await eth.request({
      method: "eth_requestAccounts",
    });

    /**
     * IMPORTANT:
     * Writes must go through the wallet provider,
     * not a raw fetch() call.
     */
    return eth.request({
      method: "genlayer_callContract",
      params: [
        {
          from,
          contractAddress,
          method,
          args,
        },
      ],
    });
  },
};
