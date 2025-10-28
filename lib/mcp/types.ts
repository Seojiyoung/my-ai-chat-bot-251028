import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export interface MCPClientInfo {
  id: string;
  client: Client;
  transport: Transport;
  connected: boolean;
  config: {
    name: string;
    command: string;
    args: string[];
  };
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

