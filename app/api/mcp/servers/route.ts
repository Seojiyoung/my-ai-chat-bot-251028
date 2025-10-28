import { NextRequest, NextResponse } from "next/server";
import { connectServer, disconnectServer, getConnectedClients } from "@/lib/mcp/manager";
import { MCPServerConfig } from "@/lib/types";

/**
 * GET: MCP 서버 목록 조회
 */
export async function GET() {
  try {
    const connectedClients = getConnectedClients();
    
    return NextResponse.json({
      servers: connectedClients.map((c) => ({
        id: c.id,
        name: c.config.name,
        command: c.config.command,
        args: c.config.args,
        connected: c.connected,
      })),
    });
  } catch (error) {
    console.error("Failed to get MCP servers:", error);
    return NextResponse.json(
      { error: "Failed to get MCP servers" },
      { status: 500 }
    );
  }
}

/**
 * POST: MCP 서버 추가 및 연결
 */
export async function POST(request: NextRequest) {
  try {
    const config: MCPServerConfig = await request.json();

    if (!config.id || !config.name || !config.command) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 인자 배열 검증
    if (!Array.isArray(config.args)) {
      return NextResponse.json(
        { error: "Invalid args format - must be an array" },
        { status: 400 }
      );
    }

    // 연결 시도
    const clientInfo = await connectServer(config);

    return NextResponse.json({
      success: true,
      server: {
        id: clientInfo.id,
        name: clientInfo.config.name,
        command: clientInfo.config.command,
        args: clientInfo.config.args,
        connected: clientInfo.connected,
      },
    });
  } catch (error) {
    console.error("Failed to connect MCP server:", error);
    
    // 상세 에러 정보 추출
    const errorWithDetails = error as Error & {
      details?: { message?: string; stderr?: string; suggestion?: string };
    };
    
    return NextResponse.json(
      {
        error: "Failed to connect MCP server",
        details: errorWithDetails.details?.message || errorWithDetails.message || String(error),
        stderr: errorWithDetails.details?.stderr,
        suggestion: errorWithDetails.details?.suggestion,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: MCP 서버 삭제 및 연결 해제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get("id");

    if (!serverId) {
      return NextResponse.json(
        { error: "Missing server ID" },
        { status: 400 }
      );
    }

    await disconnectServer(serverId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect MCP server:", error);
    return NextResponse.json(
      { error: "Failed to disconnect MCP server" },
      { status: 500 }
    );
  }
}

