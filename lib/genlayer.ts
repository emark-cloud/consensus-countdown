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
   CONTRACT ABI — WRITE METHODS ONLY
   (View methods MUST NOT be decoded via ethers)
====================================================== */
export const CONTRACT_ABI = [
  "function create_room(string room_id, string prompt)",
  "function submit_vote(string room_id, string vote)",
  "function resolve_room(string room_id)",
];

/* ======================================================
   ENSURE GENLAYER CHAIN (MetaMask)
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
   READ — GENLAYER RPC (gen_call)
   ✔ positional params
   ✔ required `type: "call"`
   ✔ no ethers decoding
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
        type: "call",
        to: contractAddress, // ✅ THIS is the correct key
        method,
        args,
        data: null,          // ✅ required
      },
    ],
  };

  const res = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `GenLayer read failed: invalid JSON\nHTTP ${res.status}\n${text}`
    );
  }

  if (json.error) {
    throw new Error(
      `GenLayer read failed: ${json.error.message}\n` +
      JSON.stringify(json.error, null, 2)
    );
  }

  return json.result;
}


/* ======================================================
   WRITE — STANDARD EVM TRANSACTIONS (MetaMask + ethers)
====================================================== */
async function getSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function genlayerWrite(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<string> {
  await ensureGenLayerChain();

  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    contractAddress,
    CONTRACT_ABI,
    signer
  );

  // 🚫 Prevent ethers from injecting invalid gas
  const tx = await contract[method](...args, {
    gasLimit: undefined,
  });

  await tx.wait();
  return tx.hash;
}
