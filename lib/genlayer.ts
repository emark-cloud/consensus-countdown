// lib/genlayer.ts

declare global {
  interface Window {
    ethereum?: any;
  }
}

/* -------------------------------------------------------------------------- */
/*                            GenLayer StudioNet                              */
/* -------------------------------------------------------------------------- */

const RPC_URL = "https://studio.genlayer.com/api";
const REQUIRED_CHAIN_ID = "0xF22F"; // 61999 decimal

/* -------------------------------------------------------------------------- */
/*                              Read Utilities                                */
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
/*                              Public API                                    */
/* -------------------------------------------------------------------------- */

export const genlayer = {
  /* ---------------- Read (pure RPC) ---------------- */

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
      throw new Error("MetaMask is required for GenLayer writes");
    }

    const eth = window.ethereum;

    // Ensure wallet access
    const [from] = await eth.request({
      method: "eth_requestAccounts",
    });

    // Enforce correct chain
    const chainId = await eth.request({ method: "eth_chainId" });
    if (chainId !== REQUIRED_CHAIN_ID) {
      throw new Error(
        `Wrong network. Please switch to GenLayer StudioNet (chainId ${REQUIRED_CHAIN_ID}).`
      );
    }

    /**
     * IMPORTANT:
     * Writes MUST go through the wallet provider.
     * fetch() WILL NOT work here.
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
