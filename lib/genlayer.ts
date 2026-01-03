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
        type: "call",                // ✅ REQUIRED
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
