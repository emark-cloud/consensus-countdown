import { ethers } from "ethers";

/* ======================================================
   GENLAYER STUDIO NET CONFIG
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

/* ======================================================
   CONTRACT ABI (WRITE METHODS ONLY)
   ⚠️ View methods are NOT called via ethers
====================================================== */
export const CONTRACT_ABI = [
  "function create_room(string room_id, string prompt)",
  "function submit_vote(string room_id, string vote)",
  "function resolve_room(string room_id)",
];

/* ======================================================
   ENSURE WALLET IS ON GENLAYER STUDIONET
====================================================== */
export async function ensureGenLayerChain(): Promise<void> {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  const currentChain = await window.ethereum.request({
    method: "eth_chainId",
  });

  if (currentChain !== GENLAYER_CHAIN.chainId) {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_CHAIN],
    });
  }
}

/* ======================================================
   READ — GENLAYER SNAPSHOT EXECUTION (gen_call)
   ✔ Uses snapshot mode
   ✔ Uses contract_address (NOT to/from)
   ✔ NO EVM-style fields
====================================================== */
export async function genlayerRead(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<any> {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "gen_call",
    params: [
      {
        type: "snapshot",
        contract_address: contractAddress,
        method,
        args,
      },
    ],
  };

  const res = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(
      `GenLayer read failed: ${json.error.message}\n` +
      JSON.stringify(json.error, null, 2)
    );
  }

  return json.result;
}

/* ======================================================
   TRANSACTION RECEIPT POLLING
   ✔ Uses GenLayer's gen_getTransactionReceipt
   ✔ Polls until FINALIZED status
====================================================== */
export interface TransactionReceipt {
  status: string;
  txId: string;
  blockNumber?: number;
  [key: string]: any;
}

export async function waitForTransactionReceipt(
  txHash: string,
  options: {
    interval?: number;
    maxRetries?: number;
    targetStatus?: string;
  } = {}
): Promise<TransactionReceipt> {
  const interval = options.interval ?? 2000; // Poll every 2 seconds
  const maxRetries = options.maxRetries ?? 30; // Max 60 seconds
  const targetStatus = options.targetStatus ?? "FINALIZED";

  for (let i = 0; i < maxRetries; i++) {
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "gen_getTransactionReceipt",
      params: [{ txId: txHash }],
    };

    const res = await fetch("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (json.error) {
      throw new Error(
        `Transaction receipt failed: ${json.error.message}\n${JSON.stringify(json.error, null, 2)}`
      );
    }

    const receipt = json.result;

    // If we have a receipt with the target status, return it
    if (receipt && receipt.status === targetStatus) {
      return receipt;
    }

    // If transaction failed or was canceled, throw error
    if (receipt && (receipt.status === "CANCELED" || receipt.status === "UNDETERMINED")) {
      throw new Error(
        `Transaction ${receipt.status.toLowerCase()}: ${txHash}`
      );
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Transaction receipt timeout after ${(maxRetries * interval) / 1000}s. Transaction may still be pending.`
  );
}

/* ======================================================
   WRITE — METAMASK-NATIVE TRANSACTION
   ✔ NO ethers tx sending
   ✔ NO gas / gasLimit / fees
   ✔ Matches Guess-Picture & Draw-Match
====================================================== */
export async function genlayerWrite(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  await ensureGenLayerChain();

  // Use ethers ONLY to encode calldata
  const iface = new ethers.Interface(CONTRACT_ABI);
  const data = iface.encodeFunctionData(method, args);

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  const from = accounts[0];

  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: contractAddress,
        data,
        // 🚫 DO NOT add gas, gasLimit, or fee fields
      },
    ],
  });

  return txHash;
}
