// lib/genlayer.ts

declare global {
  interface Window {
    ethereum?: any;
  }
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
    if (!window.ethereum) {
      throw new Error("MetaMask is required");
    }

    const [from] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // IMPORTANT: GenLayer write calls are sent via eth_sendTransaction
    return window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from,
          to: contractAddress,
          data: JSON.stringify({
            method: "genlayer_callContract",
            params: [
              {
                contractAddress,
                method,
                args,
              },
            ],
          }),
        },
      ],
    });
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
