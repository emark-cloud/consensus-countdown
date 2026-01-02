// lib/genlayer.ts

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const genlayer = {
  /* ---------------- WRITE ---------------- */

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
      throw new Error("MetaMask is required");
    }

    // 1. Request wallet access (this enables MetaMask)
    const [from] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // 2. THIS is the critical call
    return window.ethereum.request({
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

  /* ---------------- READ ---------------- */

  async readContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    const res = await fetch("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "genlayer_readContract",
        params: [
          {
            contractAddress,
            method,
            args,
          },
        ],
      }),
    });

    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
  },
};
