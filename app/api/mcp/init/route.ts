import { NextResponse } from "next/server";
import { connectServer } from "@/lib/mcp/manager";
import { MCPServerConfig } from "@/lib/types";

/**
 * POST: 저장된 MCP 서버 목록을 자동으로 연결
 */
export async function POST(request: Request) {
  try {
    const { servers } = (await request.json()) as { servers: MCPServerConfig[] };

    if (!Array.isArray(servers)) {
      return NextResponse.json(
        { error: "Invalid servers array" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const server of servers as MCPServerConfig[]) {
      if (server.enabled) {
        try {
          const clientInfo = await connectServer(server);
          results.push({
            id: server.id,
            name: server.name,
            connected: clientInfo.connected,
          });
        } catch (error) {
          console.error(`Failed to connect server ${server.name}:`, error);
          errors.push({
            id: server.id,
            name: server.name,
            error: String(error),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      connected: results,
      failed: errors,
    });
  } catch (error) {
    console.error("Failed to initialize MCP servers:", error);
    return NextResponse.json(
      { error: "Failed to initialize MCP servers" },
      { status: 500 }
    );
  }
}

