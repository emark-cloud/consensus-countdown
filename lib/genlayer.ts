import { createClient, abi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { toRlp, toHex, encodeFunctionData, type Address } from "viem";

/* ======================================================
   GENLAYER CLIENT (using official SDK)
====================================================== */
let client = createClient({
  chain: studionet,
});

// Re-initialize client with MetaMask provider when available
function getClientWithProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    client = createClient({
      chain: studionet,
      provider: window.ethereum,
    });
  }
  return client;
}

/* ======================================================
   GENLAYER STUDIO NET CONFIG (for MetaMask)
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
   READ — USING GENLAYER SDK's readContract
   ✔ Uses official SDK for proper encoding/decoding
   ✔ Handles GenLayer's custom calldata format
====================================================== */
export async function genlayerRead(
  contractAddress: string,
  method: string,
  args: any[] = []
): Promise<any> {
  try {
    const result = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: method,
      args: args,
    });
    return result;
  } catch (error: any) {
    throw new Error(
      `GenLayer read failed: ${error.message || error}`
    );
  }
}

/* ======================================================
   TRANSACTION RECEIPT POLLING
   ✔ Uses GenLayer SDK's waitForTransactionReceipt
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
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}` & { length: 66 },
      interval: options.interval ?? 2000,
      retries: options.maxRetries ?? 30,
    });

    // receipt.consensus_data?.final is the final consensus result
    const finalData = receipt.consensus_data?.final;
    const status = typeof finalData === 'object' && finalData !== null
      ? (finalData as any).status ?? "FINALIZED"
      : "FINALIZED";

    return {
      status,
      txId: txHash,
      ...receipt,
    };
  } catch (error: any) {
    throw new Error(
      `Transaction receipt timeout. Transaction may still be pending.`
    );
  }
}

/* ======================================================
   WRITE — METAMASK + GENLAYER CONSENSUS CONTRACT
   ✔ Uses GenLayerJS SDK for calldata encoding
   ✔ Routes through consensus contract (addTransaction)
   ✔ MetaMask for transaction signing
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

  // Get account from MetaMask
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const from = accounts[0];

  // Debug: log the args being encoded
  console.log("[genlayerWrite] method:", method);
  console.log("[genlayerWrite] args:", JSON.stringify(args));

  // Encode the contract method call using GenLayer SDK
  const calldataObj = abi.calldata.makeCalldataObject(method, args, undefined);
  console.log("[genlayerWrite] calldataObj:", calldataObj);
  const encodedBytes = abi.calldata.encode(calldataObj);
  console.log("[genlayerWrite] encoded hex:", Array.from(encodedBytes, (b) => b.toString(16).padStart(2, "0")).join(""));

  // GenLayer expects RLP-encoded array: [encodedCalldata, leaderOnly]
  const leaderOnly = false;
  const serializedData = toRlp([toHex(encodedBytes), toHex(leaderOnly)]);

  // Encode the call to the consensus main contract's addTransaction function
  // This routes the transaction through GenLayer's consensus mechanism
  const consensusContractAddress = studionet.consensusMainContract?.address;
  const consensusAbi = studionet.consensusMainContract?.abi;

  if (!consensusContractAddress || !consensusAbi) {
    throw new Error("Consensus contract not configured for studionet");
  }

  const data = encodeFunctionData({
    abi: consensusAbi,
    functionName: "addTransaction",
    args: [
      from as Address,                                    // sender
      contractAddress as Address,                         // recipient (target contract)
      studionet.defaultNumberOfInitialValidators,         // numOfInitialValidators
      studionet.defaultConsensusMaxRotations,             // maxRotations
      serializedData,                                     // calldata
    ],
  });

  console.log("[genlayerWrite] consensus contract:", consensusContractAddress);
  console.log("[genlayerWrite] target contract:", contractAddress);

  // Send transaction to consensus contract via MetaMask
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: consensusContractAddress,
        data,
        gas: "0x30D40", // 200000
      },
    ],
  });

  return txHash;
}
