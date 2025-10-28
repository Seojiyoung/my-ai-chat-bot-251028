import { NextRequest, NextResponse } from "next/server";
import { connectServer, disconnectServer, getConnectedClients } from "@/lib/mcp/manager";
import { MCPServerConfig, MCPTransport } from "@/lib/types";

// SSE URL 정규화: 경로가 비었거나 '/'이면 '/sse'를 붙인다
function normalizeSseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/sse";
    }
    return url.toString();
  } catch (_) {
    // URL 파싱 실패 시 원본 반환 (클라이언트/문서 힌트로 유도)
    return rawUrl;
  }
}

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
        connected: c.connected,
        // 전체 설정을 포함하여 클라이언트에서 안전하게 분기 가능
        config: c.config,
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
    const raw = (await request.json()) as unknown;

    // 입력 유효성 및 레거시 호환 처리
    const hasTransport = (v: unknown): v is { transport: MCPTransport } =>
      !!v && typeof v === "object" &&
      ("transport" in (v as Record<string, unknown>)) &&
      (((v as { transport?: unknown }).transport === "stdio") || ((v as { transport?: unknown }).transport === "sse"));

    const hasCommandShape = (v: unknown): v is { command: string; args: string[] } =>
      !!v && typeof v === "object" &&
      ("command" in (v as Record<string, unknown>));

    const hasSSEShape = (v: unknown): v is { url: string; token?: string } =>
      !!v && typeof v === "object" && ("url" in (v as Record<string, unknown>));

    const base = raw as Partial<Pick<MCPServerConfig, "id" | "name" | "enabled" | "createdAt">> & Record<string, unknown>;

    const transport: MCPTransport = hasTransport(raw)
      ? raw.transport
      : (hasCommandShape(raw) ? "stdio" : "sse");

    let config: MCPServerConfig;

    // 공통 필수값
    if (!base.id || !base.name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 방식별 유효성 검사 (레거시 저장 데이터 호환)
    if (transport === "stdio") {
      if (!hasCommandShape(raw) || typeof raw.command !== "string") {
        return NextResponse.json(
          { error: "Missing command for stdio transport" },
          { status: 400 }
        );
      }
      if (!Array.isArray(raw.args)) {
        return NextResponse.json(
          { error: "Invalid args format - must be an array" },
          { status: 400 }
        );
      }
      config = {
        id: base.id,
        name: base.name,
        enabled: Boolean(base.enabled),
        createdAt: typeof base.createdAt === "number" ? base.createdAt : Date.now(),
        transport: "stdio",
        command: raw.command,
        args: raw.args as string[],
      };
    } else {
      if (!hasSSEShape(raw) || typeof raw.url !== "string") {
        return NextResponse.json(
          { error: "Missing url for sse transport" },
          { status: 400 }
        );
      }

      // SSE URL 정규화 및 사전 점검
      const normalizedUrl = normalizeSseUrl(String(raw.url));
      try {
        const res = await fetch(normalizedUrl, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            ...(typeof raw.token === "string" && raw.token
              ? { Authorization: `Bearer ${raw.token}` }
              : {}),
          },
          redirect: "follow",
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || !contentType.includes("text/event-stream")) {
          return NextResponse.json(
            {
              error: "Invalid SSE endpoint",
              details: `SSE 엔드포인트 또는 Content-Type이 올바르지 않습니다 (status ${res.status}).`,
              suggestion: "URL에 /sse 경로를 붙이고 서버 문서의 SSE 경로를 확인하세요.",
            },
            { status: 400 }
          );
        }
      } catch (e) {
        return NextResponse.json(
          {
            error: "Failed to reach SSE endpoint",
            details: String(e),
            suggestion: "방화벽/네트워크 및 URL(스킴/호스트/경로)을 확인하세요. 필요 시 /sse 경로를 사용해보세요.",
          },
          { status: 400 }
        );
      }

      config = {
        id: base.id,
        name: base.name,
        enabled: Boolean(base.enabled),
        createdAt: typeof base.createdAt === "number" ? base.createdAt : Date.now(),
        transport: "sse",
        url: normalizedUrl,
        token: typeof raw.token === "string" ? raw.token : undefined,
      };
    }

    // 연결 시도
    const clientInfo = await connectServer(config);

    return NextResponse.json({
      success: true,
      server: {
        id: clientInfo.id,
        name: clientInfo.config.name,
        connected: clientInfo.connected,
        config: clientInfo.config,
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

