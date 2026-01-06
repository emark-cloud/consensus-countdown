import { NextRequest, NextResponse } from "next/server";

const GENLAYER_RPC_URL = "https://studio.genlayer.com/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(GENLAYER_RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GenLayer proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Proxy request failed" },
      { status: 500 }
    );
  }
}
