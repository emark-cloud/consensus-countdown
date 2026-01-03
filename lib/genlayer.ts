import { ethers } from "ethers";

/* ======================================================
   WRITE — MetaMask-native (NO ethers transaction sending)
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
        data,          // ✅ calldata only
        // 🚫 NO gas
        // 🚫 NO gasLimit
        // 🚫 NO fees
      },
    ],
  });

  return txHash;
}
