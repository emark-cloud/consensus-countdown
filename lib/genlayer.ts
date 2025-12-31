const RPC_URL = "https://rpc.genlayer.com";

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
    return rpc("genlayer_callContract", [
      {
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
