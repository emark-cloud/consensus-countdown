import { ethers } from "ethers";

/* -------------------------------------------------------
   GENLAYER STUDIO NET CONFIG
------------------------------------------------------- */
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

/* -------------------------------------------------------
   CONTRACT ABI (WRITE METHODS ONLY)
------------------------------------------------------- */
export const CONTRACT_ABI = [
  "function create_room(string room_id, string prompt)",
  "function submit_vote(string room_id, string vote)",
  "function resolve_room(string room_id)",
];

/* -------------------------------------------------------
   ENSURE GENLAYER CHAIN (MetaMask)
------------------------------------------------------- */
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

/* -------------------------------------------------------
   READ: GenLayer RPC (gen_call)
   -> NOTE: Studio expects positional params:
     params: [ contractAddress, { method: "name", args: [...] } ]
------------------------------------------------------- */
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
      contractAddress,
      {
        method,
        args: args || [],
      },
    ],
  };

  const res = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (parseErr) {
    // include raw text when parse fails
    throw new Error(
      `GenLayer read failed: non-JSON response. HTTP ${res.status}. body: ${text}`
    );
  }

  if (!json) {
    throw new Error(`GenLayer read failed: empty response. HTTP ${res.status}`);
  }

  if (json.error) {
    // bubble full error info
    const errMsg = json.error.message || "GenLayer read returned error";
    const extra = JSON.stringify(json.error, null, 2);
    throw new Error(`${errMsg}\nRPC error: ${extra}`);
  }

  return json.result;
}

/* -------------------------------------------------------
   WRITE: Standard EVM transaction (MetaMask + ethers)
------------------------------------------------------- */
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

  const signer = await getSigner();
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

  const tx = await contract[method](...args);
  await tx.wait();

  return tx.hash;
}
