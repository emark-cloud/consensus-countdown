// lib/genlayer.ts

declare global {
  interface Window {
    ethereum?: any;
  }
}

const RPC_URL = "https://studio.genlayer.com/api";

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
      throw new Error("MetaMask required");
    }

    const [from] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    /**
     * IMPORTANT:
     * GenLayer writes go through genlayer_callContract,
     * NOT eth_sendTransaction.
     */
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "genlayer_callContract",
        params: [
          {
            from,
            contractAddress,
            method,
            args,
          },
        ],
      }),
    });

    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message);
    }

    return json.result;
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
    const res = await fetch(RPC_URL, {
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
