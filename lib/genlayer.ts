// lib/genlayer.ts
import { createClient } from "genlayer-js";

const RPC_URL = "https://studio.genlayer.com/api";

/* -------------------------------------------------------------------------- */
/*                             GenLayer Client                                 */
/* -------------------------------------------------------------------------- */

const client = createClient({
  rpcUrl: RPC_URL,
});

/* -------------------------------------------------------------------------- */
/*                              Public API                                    */
/* -------------------------------------------------------------------------- */

export const genlayer = {
  /* ---------------- Read ---------------- */

  async readContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    return client.readContract({
      address: contractAddress,
      method,
      args,
    });
  },

  /* ---------------- Write (CORRECT) ---------------- */

  async callContract({
    contractAddress,
    method,
    args,
  }: {
    contractAddress: string;
    method: string;
    args: any[];
  }) {
    /**
     * This is CRITICAL:
     * - Proper calldata encoding
     * - Correct GenLayer execution context
     * - MetaMask popup works
     */
    return client.writeContract({
      address: contractAddress,
      method,
      args,
    });
  },
};
