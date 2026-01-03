/* ======================================================
   GenLayer Frontend Utilities
   Safe for Vercel + Browser
====================================================== */

export const GENLAYER_CHAIN = {
  chainId: "0xF22F", // 61999
  chainName: "GenLayer StudioNet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://studio.genlayer.com/api"],
};

export const RPC_URL = "https://studio.genlayer.com/api";

/* ======================================================
   READ CONTRACT (RPC)
====================================================== */

export async function genlayerRead(
  contractAddress: string,
  method: string,
  args: any[] = []
) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
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
  if (json.error) {
    throw new Error(json.error.message || "GenLayer read error");
  }

  return json.result;
}

/* ======================================================
   ENSURE GENLAYER CHAIN
====================================================== */

export async function ensureGenLayerChain(): Promise<void> {
  if (!window.ethereum) {
    throw new Error("No wallet detected");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN.chainId }],
    });
  } catch (err: any) {
    // Chain not added
    if (err.code === 4902 || err.message?.includes("Unrecognized chain")) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [GENLAYER_CHAIN],
      });
    } else {
      throw err;
    }
  }
}

/* ======================================================
   WRITE CONTRACT (WALLET)
====================================================== */

export async function genlayerWrite(
  contractAddress: string,
  method: string,
  args: any[] = []
) {
  if (!window.ethereum) {
    throw new Error("Wallet not found");
  }

  // Request account access
  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const from = accounts[0];
  if (!from) {
    throw new Error("No account connected");
  }

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
}
