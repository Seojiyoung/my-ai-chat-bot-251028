import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { MCPServerConfig } from "@/lib/types";

export interface MCPClientInfo {
  id: string;
  client: Client;
  transport: Transport;
  connected: boolean;
  config: MCPServerConfig;
  errorDetails?: MCPConnectionError;
}

export interface MCPConnectionError {
  message: string;
  stderr?: string;
  suggestion?: string;
  timestamp: number;
}

export interface MCPManagerState {
  clients: Map<string, MCPClientInfo>;
}

