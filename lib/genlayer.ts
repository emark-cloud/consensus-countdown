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
   CONTRACT ABI (ConsensusCountdown)
------------------------------------------------------- */
export const CONTRACT_ABI = [
  // write
  "function create_room(string room_id, string prompt)",
  "function submit_vote(string room_id, string vote)",
  "function resolve_room(string room_id)",

  // read
  "function get_room(string room_id) view returns (tuple(string room_id, string prompt, bool resolved, string final_outcome))",
  "function get_votes(string room_id) view returns (tuple(address voter, string vote)[])",
  "function get_leaderboard() view returns (tuple(address player, uint256 score)[])",
];

/* -------------------------------------------------------
   ENSURE CHAIN
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
   PROVIDERS
------------------------------------------------------- */
function getReadProvider() {
  return new ethers.JsonRpcProvider(GENLAYER_CHAIN.rpcUrls[0]);
}

async function getWriteSigner() {
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

/* -------------------------------------------------------
   READ
------------------------------------------------------- */
export async function genlayerRead(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<any> {
  const provider = getReadProvider();
  const contract = new ethers.Contract(
    contractAddress,
    CONTRACT_ABI,
    provider
  );

  return contract[method](...args);
}

/* -------------------------------------------------------
   WRITE (STANDARD EVM TX)
------------------------------------------------------- */
export async function genlayerWrite(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<string> {
  await ensureGenLayerChain();

  const signer = await getWriteSigner();
  const contract = new ethers.Contract(
    contractAddress,
    CONTRACT_ABI,
    signer
  );

  const tx = await contract[method](...args);
  await tx.wait();

  return tx.hash;
}
