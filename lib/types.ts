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

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
  createdAt: number;
}

