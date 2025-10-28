export interface FunctionCall {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "success" | "error";
  timestamp: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  functionCalls?: FunctionCall[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type MCPTransport = "stdio" | "sse";

// 유니온 타입: stdio(uvx) 또는 sse(HTTP/SSE)
export type MCPServerConfig = (
  {
    id: string;
    name: string;
    enabled: boolean;
    createdAt: number;
    transport: MCPTransport;
  } & (
    | { transport: "stdio"; command: string; args: string[] }
    | { transport: "sse"; url: string; token?: string; hfToken?: string }
  )
);

