import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPClientInfo, MCPManagerState, MCPConnectionError } from "./types";
import { MCPServerConfig } from "../types";

// Node.js global 객체를 활용한 싱글톤 패턴
declare global {
  var mcpManager: MCPManagerState | undefined;
}

/**
 * MCP 매니저 싱글톤 인스턴스 반환
 */
export function getMCPManager(): MCPManagerState {
  if (!global.mcpManager) {
    global.mcpManager = {
      clients: new Map<string, MCPClientInfo>(),
    };
  }
  return global.mcpManager;
}

/**
 * 타임아웃을 적용한 Promise 래퍼
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * MCP 서버에 연결 (재시도 로직 포함)
 */
export async function connectServer(
  config: MCPServerConfig,
  retries: number = 2
): Promise<MCPClientInfo> {
  const manager = getMCPManager();

  // 이미 연결되어 있으면 기존 클라이언트 반환
  const existing = manager.clients.get(config.id);
  if (existing && existing.connected) {
    return existing;
  }

  let lastError: Error | null = null;
  let stderrOutput = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 새 클라이언트 생성
      const client = new Client(
        {
          name: `mcp-client-${config.name}`,
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      // stderr 캡처를 위한 배열
      const stderrLines: string[] = [];

      // Transport 생성
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        stderr: "pipe", // stderr 파이핑 활성화
      });

      // stderr 리스너 등록 (transport에 process가 있는 경우)
      // 타입 정의에 없지만 런타임에 존재할 수 있는 속성이므로 타입 단언 사용
      const transportWithProcess = transport as unknown as {
        process?: { stderr?: { on: (event: string, handler: (data: Buffer) => void) => void } };
      };
      if (transportWithProcess.process?.stderr) {
        transportWithProcess.process.stderr.on("data", (data: Buffer) => {
          const text = data.toString();
          stderrLines.push(text);
          console.error(`[MCP ${config.name} stderr]:`, text);
        });
      }

      // 타임아웃을 적용한 연결 (30초)
      await withTimeout(
        client.connect(transport),
        30000,
        "Connection timeout (30s)"
      );

      // 연결 검증: listTools 호출
      try {
        await withTimeout(client.listTools(), 5000, "Tool listing timeout");
      } catch (error) {
        // listTools 실패는 경고만 출력하고 계속 진행
        console.warn(`[MCP ${config.name}] listTools failed:`, error);
      }

      stderrOutput = stderrLines.join("\n");

      const clientInfo: MCPClientInfo = {
        id: config.id,
        client,
        transport,
        connected: true,
        config: {
          name: config.name,
          command: config.command,
          args: config.args,
        },
      };

      manager.clients.set(config.id, clientInfo);

      return clientInfo;
    } catch (error) {
      lastError = error as Error;
      const errorWithStderr = error as { stderr?: string };
      stderrOutput = errorWithStderr.stderr || stderrOutput;

      console.error(
        `[MCP ${config.name}] Connection attempt ${attempt + 1}/${retries + 1} failed:`,
        error
      );

      // 마지막 시도가 아니면 1초 대기 후 재시도
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // 모든 재시도 실패 시 상세 에러 정보와 함께 던지기
  const errorDetails: MCPConnectionError = {
    message: lastError?.message || "Unknown connection error",
    stderr: stderrOutput,
    suggestion: getSuggestionForError(lastError?.message, config),
    timestamp: Date.now(),
  };

  const enhancedError = new Error(errorDetails.message) as Error & { details: MCPConnectionError };
  enhancedError.details = errorDetails;

  throw enhancedError;
}

/**
 * 에러 메시지를 기반으로 사용자 조치 가이드 생성
 */
function getSuggestionForError(
  errorMessage?: string,
  config?: MCPServerConfig
): string {
  if (!errorMessage) {
    return "명령어와 인자를 확인하고 다시 시도하세요.";
  }

  if (errorMessage.includes("timeout")) {
    return "서버 초기화에 시간이 오래 걸립니다. 잠시 후 다시 시도하거나 네트워크 연결을 확인하세요.";
  }

  if (errorMessage.includes("ENOENT") || errorMessage.includes("not found")) {
    return `명령어 '${config?.command}'를 찾을 수 없습니다. 설치 여부를 확인하세요.`;
  }

  if (errorMessage.includes("Connection closed")) {
    return "서버 프로세스가 예기치 않게 종료되었습니다. stderr 출력을 확인하고 인자가 올바른지 검증하세요.";
  }

  if (errorMessage.includes("Invalid version request")) {
    return "패키지 이름이 올바르지 않습니다. 형식을 확인하세요 (예: mcp-server-time 또는 @modelcontextprotocol/server-time).";
  }

  return "명령어와 인자를 확인하고 다시 시도하세요.";
}

/**
 * MCP 서버 연결 해제
 */
export async function disconnectServer(serverId: string): Promise<void> {
  const manager = getMCPManager();
  const clientInfo = manager.clients.get(serverId);

  if (!clientInfo) {
    return;
  }

  try {
    if (clientInfo.connected) {
      await clientInfo.client.close();
    }
  } catch (error) {
    console.error(`Failed to disconnect MCP server ${serverId}:`, error);
  } finally {
    clientInfo.connected = false;
    manager.clients.delete(serverId);
  }
}

/**
 * 연결된 모든 클라이언트 반환
 */
export function getConnectedClients(): MCPClientInfo[] {
  const manager = getMCPManager();
  return Array.from(manager.clients.values()).filter((c) => c.connected);
}

/**
 * 특정 클라이언트 반환
 */
export function getClient(serverId: string): MCPClientInfo | undefined {
  const manager = getMCPManager();
  return manager.clients.get(serverId);
}

/**
 * 모든 연결 해제 (정리용)
 */
export async function disconnectAll(): Promise<void> {
  const manager = getMCPManager();
  const disconnectPromises = Array.from(manager.clients.keys()).map((id) =>
    disconnectServer(id)
  );
  await Promise.all(disconnectPromises);
}

