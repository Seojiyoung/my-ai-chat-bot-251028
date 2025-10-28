import { useState, useEffect } from "react";
import { MCPServerConfig, MCPTransport } from "@/lib/types";
import {
  getMCPServers,
  saveMCPServer,
  deleteMCPServer,
  updateMCPServerEnabled,
  getMCPGlobalEnabled,
  setMCPGlobalEnabled,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Server, Plus, Trash2, Power, PowerOff, Edit2, Check, X, Sparkles, RefreshCw, Loader2, RotateCw } from "lucide-react";

interface MCPServerManagerProps {
  onServersChange?: () => void;
}

// MCP 서버 프리셋 (전체 목록)
const MCP_PRESETS = [
  {
    name: "Time Server",
    command: "uvx",
    args: "mcp-server-time",
    description: "시간 관련 도구 (현재 시간, 타임존 등)",
    warning: null,
  },
  {
    name: "Filesystem",
    command: "uvx",
    args: "mcp-server-filesystem",
    description: "파일 시스템 접근 (읽기/쓰기)",
    warning: "⚠️ 파일 시스템 접근 권한이 필요합니다",
  },
  {
    name: "Fetch",
    command: "uvx",
    args: "mcp-server-fetch",
    description: "웹 요청 (HTTP GET/POST)",
    warning: null,
  },
  {
    name: "GitHub",
    command: "uvx",
    args: "mcp-server-github",
    description: "GitHub 저장소 및 이슈 관리",
    warning: "⚠️ GitHub API 토큰이 필요합니다",
  },
  {
    name: "Memory",
    command: "uvx",
    args: "mcp-server-memory",
    description: "대화 컨텍스트 메모리 저장",
    warning: null,
  },
  {
    name: "Brave Search",
    command: "uvx",
    args: "mcp-server-brave-search",
    description: "웹 검색 (Brave Search API)",
    warning: "⚠️ Brave Search API 키가 필요합니다",
  },
  {
    name: "PostgreSQL",
    command: "uvx",
    args: "mcp-server-postgres",
    description: "PostgreSQL 데이터베이스 쿼리",
    warning: "⚠️ PostgreSQL 연결 정보가 필요합니다",
  },
  {
    name: "Slack",
    command: "uvx",
    args: "mcp-server-slack",
    description: "Slack 메시지 및 채널 관리",
    warning: "⚠️ Slack API 토큰이 필요합니다",
  },
  {
    name: "Git",
    command: "uvx",
    args: "mcp-server-git",
    description: "Git 저장소 작업 (커밋, 브랜치 등)",
    warning: null,
  },
  {
    name: "Puppeteer",
    command: "uvx",
    args: "mcp-server-puppeteer",
    description: "웹 브라우저 자동화 및 스크래핑",
    warning: "⚠️ 첫 실행 시 Chromium 다운로드로 1-2분 소요",
  },
  {
    name: "Sequential Thinking",
    command: "uvx",
    args: "mcp-server-sequential-thinking",
    description: "복잡한 문제 해결을 위한 순차적 사고",
    warning: null,
  },
  {
    name: "Google Drive",
    command: "uvx",
    args: "mcp-server-gdrive",
    description: "Google Drive 파일 접근 및 관리",
    warning: "⚠️ Google Drive API 인증이 필요합니다",
  },
];

export function MCPServerManager({ onServersChange }: MCPServerManagerProps) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [globalEnabled, setGlobalEnabledState] = useState(false);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [displayedPresets, setDisplayedPresets] = useState<typeof MCP_PRESETS>([]);
  
  // 새 서버 추가 폼
  const [newServerName, setNewServerName] = useState("");
  const [newTransport, setNewTransport] = useState<MCPTransport>("stdio");
  const [newServerCommand, setNewServerCommand] = useState("uvx");
  const [newServerArgs, setNewServerArgs] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerToken, setNewServerToken] = useState("");
  
  // 서버 편집 상태
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editServerName, setEditServerName] = useState("");
  const [editTransport, setEditTransport] = useState<MCPTransport>("stdio");
  const [editServerCommand, setEditServerCommand] = useState("");
  const [editServerArgs, setEditServerArgs] = useState("");
  const [editServerUrl, setEditServerUrl] = useState("");
  const [editServerToken, setEditServerToken] = useState("");
  
  // 연결 에러 상태
  const [connectionErrors, setConnectionErrors] = useState<Map<string, { details: string; stderr?: string; suggestion?: string }>>(new Map());
  
  // 연결 중 상태
  const [connectingServers, setConnectingServers] = useState<Set<string>>(new Set());

  // 랜덤 3개 프리셋 선택 함수
  const shufflePresets = () => {
    const shuffled = [...MCP_PRESETS].sort(() => Math.random() - 0.5);
    setDisplayedPresets(shuffled.slice(0, 3));
  };

  useEffect(() => {
    loadServers();
    setGlobalEnabledState(getMCPGlobalEnabled());
    shufflePresets(); // 초기 랜덤 선택
  }, []);

  const loadServers = () => {
    const loadedServers = getMCPServers();
    setServers(loadedServers);
  };

  const handleToggleGlobal = async (enabled: boolean) => {
    setMCPGlobalEnabled(enabled);
    setGlobalEnabledState(enabled);
    
    // 전역 활성화 시 활성화된 서버들 연결
    if (enabled) {
      await initializeServers();
    }
    
    onServersChange?.();
  };

  const initializeServers = async () => {
    const enabledServers = servers.filter((s) => s.enabled);
    if (enabledServers.length > 0) {
      try {
        await fetch("/api/mcp/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servers: enabledServers }),
        });
      } catch (error) {
        console.error("Failed to initialize servers:", error);
      }
    }
  };

  const handleAddServer = async () => {
    if (!newServerName.trim()) {
      alert("서버 이름을 입력하세요.");
      return;
    }

    let newServer: MCPServerConfig;
    if (newTransport === "stdio") {
      if (!newServerCommand.trim()) {
        alert("명령(예: uvx)을 입력하세요.");
        return;
      }
      newServer = {
        id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newServerName.trim(),
        transport: "stdio",
        command: newServerCommand.trim(),
        args: newServerArgs.trim().split(" ").filter((a) => a),
        enabled: false,
        createdAt: Date.now(),
      } as MCPServerConfig;
    } else {
      if (!newServerUrl.trim()) {
        alert("원격 MCP 서버 URL을 입력하세요.");
        return;
      }
      newServer = {
        id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newServerName.trim(),
        transport: "sse",
        url: newServerUrl.trim(),
        token: newServerToken.trim() || undefined,
        enabled: false,
        createdAt: Date.now(),
      } as MCPServerConfig;
    }

    saveMCPServer(newServer);
    loadServers();
    
    // 폼 초기화
    setNewServerName("");
    setNewTransport("stdio");
    setNewServerCommand("uvx");
    setNewServerArgs("");
    setNewServerUrl("");
    setNewServerToken("");
    setIsAddingServer(false);
    
    onServersChange?.();
  };

  const handleAddPreset = (preset: typeof MCP_PRESETS[0]) => {
    const newServer: MCPServerConfig = {
      id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: preset.name,
      transport: "stdio",
      command: preset.command,
      args: preset.args.split(" ").filter((a) => a),
      enabled: false,
      createdAt: Date.now(),
    } as MCPServerConfig;

    saveMCPServer(newServer);
    loadServers();
    setShowPresets(false);
    
    onServersChange?.();
  };

  const handleStartEdit = (server: MCPServerConfig) => {
    setEditingServerId(server.id);
    setEditServerName(server.name);
    const transport: MCPTransport = server.transport;
    setEditTransport(transport as MCPTransport);
    if (transport === "stdio") {
      setEditServerCommand((server as Extract<MCPServerConfig, { transport: "stdio" }>).command || "");
      setEditServerArgs(((server as Extract<MCPServerConfig, { transport: "stdio" }>).args || []).join(" "));
      setEditServerUrl("");
      setEditServerToken("");
    } else {
      setEditServerUrl((server as Extract<MCPServerConfig, { transport: "sse" }>).url || "");
      setEditServerToken((server as Extract<MCPServerConfig, { transport: "sse" }>).token || "");
      setEditServerCommand("");
      setEditServerArgs("");
    }
  };

  const handleCancelEdit = () => {
    setEditingServerId(null);
    setEditServerName("");
    setEditTransport("stdio");
    setEditServerCommand("");
    setEditServerArgs("");
    setEditServerUrl("");
    setEditServerToken("");
  };

  const handleSaveEdit = async () => {
    if (!editingServerId || !editServerName.trim()) {
      alert("서버 이름을 입력하세요.");
      return;
    }

    const server = servers.find((s) => s.id === editingServerId);
    if (!server) return;

    let updatedServer: MCPServerConfig;
    if (editTransport === "stdio") {
      if (!editServerCommand.trim()) {
        alert("명령을 입력하세요.");
        return;
      }
      updatedServer = {
        ...server,
        name: editServerName.trim(),
        transport: "stdio",
        command: editServerCommand.trim(),
        args: editServerArgs.trim().split(" ").filter((a) => a),
      } as MCPServerConfig;
    } else {
      if (!editServerUrl.trim()) {
        alert("URL을 입력하세요.");
        return;
      }
      updatedServer = {
        ...server,
        name: editServerName.trim(),
        transport: "sse",
        url: editServerUrl.trim(),
        token: editServerToken.trim() || undefined,
      } as MCPServerConfig;
    }

    // 서버가 활성화된 상태면 재연결
    if (server.enabled && globalEnabled) {
      try {
        // 기존 연결 해제
        await fetch(`/api/mcp/servers?id=${server.id}`, {
          method: "DELETE",
        });
        
        // 새 설정으로 연결
        const response = await fetch("/api/mcp/servers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedServer),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          const errors = new Map(connectionErrors);
          errors.set(server.id, {
            details: errorData.details || "연결 실패",
            stderr: errorData.stderr,
            suggestion: errorData.suggestion,
          });
          setConnectionErrors(errors);
        } else {
          const errors = new Map(connectionErrors);
          errors.delete(server.id);
          setConnectionErrors(errors);
        }
      } catch (error) {
        console.error("Failed to reconnect server:", error);
        const errors = new Map(connectionErrors);
        errors.set(server.id, {
          details: String(error),
          suggestion: "네트워크 연결을 확인하고 다시 시도하세요.",
        });
        setConnectionErrors(errors);
      }
    }

    saveMCPServer(updatedServer);
    loadServers();
    handleCancelEdit();
    
    onServersChange?.();
  };

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    updateMCPServerEnabled(serverId, enabled);
    loadServers();

    const server = servers.find((s) => s.id === serverId);
    if (!server) return;

    try {
      if (enabled && globalEnabled) {
        // 연결 중 상태 표시
        setConnectingServers(new Set(connectingServers).add(serverId));
        
        // 서버 연결
        const response = await fetch("/api/mcp/servers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...server, enabled }),
        });
        
        // 연결 중 상태 제거
        const newConnecting = new Set(connectingServers);
        newConnecting.delete(serverId);
        setConnectingServers(newConnecting);
        
        if (!response.ok) {
          const errorData = await response.json();
          const errors = new Map(connectionErrors);
          errors.set(serverId, {
            details: errorData.details || "연결 실패",
            stderr: errorData.stderr,
            suggestion: errorData.suggestion,
          });
          setConnectionErrors(errors);
          // 연결 실패 시 다시 비활성화
          updateMCPServerEnabled(serverId, false);
          loadServers();
        } else {
          const errors = new Map(connectionErrors);
          errors.delete(serverId);
          setConnectionErrors(errors);
        }
      } else if (!enabled) {
        // 서버 연결 해제
        await fetch(`/api/mcp/servers?id=${serverId}`, {
          method: "DELETE",
        });
        const errors = new Map(connectionErrors);
        errors.delete(serverId);
        setConnectionErrors(errors);
      }
    } catch (error) {
      console.error("Failed to toggle server:", error);
      const errors = new Map(connectionErrors);
      errors.set(serverId, {
        details: String(error),
        suggestion: "네트워크 연결을 확인하고 다시 시도하세요.",
      });
      setConnectionErrors(errors);
      
      // 연결 중 상태 제거
      const newConnecting = new Set(connectingServers);
      newConnecting.delete(serverId);
      setConnectingServers(newConnecting);
      
      // 연결 실패 시 다시 비활성화
      if (enabled) {
        updateMCPServerEnabled(serverId, false);
        loadServers();
      }
    }
    
    onServersChange?.();
  };
  
  const handleRetryConnection = async (serverId: string) => {
    const errors = new Map(connectionErrors);
    errors.delete(serverId);
    setConnectionErrors(errors);
    
    await handleToggleServer(serverId, true);
  };

  const handleDeleteServer = async (serverId: string) => {
    try {
      // 연결 해제
      await fetch(`/api/mcp/servers?id=${serverId}`, {
        method: "DELETE",
      });
      
      // 저장소에서 삭제
      deleteMCPServer(serverId);
      loadServers();
      
      onServersChange?.();
    } catch (error) {
      console.error("Failed to delete server:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* 전역 활성화 토글 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">MCP 도구 사용</h3>
              <p className="text-sm text-muted-foreground">
                AI 채팅에서 외부 도구를 사용할 수 있습니다
              </p>
            </div>
          </div>
          <Switch
            checked={globalEnabled}
            onCheckedChange={handleToggleGlobal}
          />
        </div>
      </Card>

      {/* 서버 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">MCP 서버 목록</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              프리셋
            </Button>
            {showPresets && (
              <Button
                size="sm"
                onClick={shufflePresets}
                variant="outline"
                title="다른 추천 보기"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsAddingServer(!isAddingServer)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              직접 추가
            </Button>
          </div>
        </div>

        {/* 프리셋 목록 */}
        {showPresets && (
          <Card className="p-4 mb-3 space-y-2">
            <h4 className="text-sm font-medium mb-2">권장 MCP 서버</h4>
            {displayedPresets.map((preset, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-2 rounded hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.description}
                  </div>
                  {preset.warning && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      {preset.warning}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {preset.command} {preset.args}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddPreset(preset)}
                  variant="ghost"
                >
                  추가
                </Button>
              </div>
            ))}
          </Card>
        )}

        {/* 서버 추가 폼 */}
        {isAddingServer && (
          <Card className="p-4 mb-3 space-y-3">
            <div>
              <Input
                placeholder="서버 이름 (예: Time Server)"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={newTransport}
                onChange={(e) => setNewTransport(e.target.value as MCPTransport)}
              >
                <option value="stdio">로컬(uvx)</option>
                <option value="sse">원격(HTTP/SSE)</option>
              </select>
            </div>
            {newTransport === "stdio" ? (
              <>
                <div>
                  <Input
                    placeholder="명령 (예: uvx)"
                    value={newServerCommand}
                    onChange={(e) => setNewServerCommand(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="인자 (예: @modelcontextprotocol/server-time)"
                    value={newServerArgs}
                    onChange={(e) => setNewServerArgs(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 팁: 공백으로 구분하여 입력하세요
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Input
                    placeholder="URL (https://...)"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    placeholder="인증 토큰 (선택)"
                    value={newServerToken}
                    onChange={(e) => setNewServerToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">공용 PC에 토큰 저장은 피하세요.</p>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAddServer} size="sm" className="flex-1">
                추가
              </Button>
              <Button
                onClick={() => setIsAddingServer(false)}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </Card>
        )}

        {/* 서버 카드 목록 */}
        <div className="space-y-2">
          {servers.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              등록된 MCP 서버가 없습니다
            </Card>
          ) : (
            servers.map((server) => (
              <Card key={server.id} className="p-4">
                {editingServerId === server.id ? (
                  // 편집 모드
                  <div className="space-y-3">
                    <Input
                      placeholder="서버 이름"
                      value={editServerName}
                      onChange={(e) => setEditServerName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={editTransport}
                        onChange={(e) => setEditTransport(e.target.value as MCPTransport)}
                      >
                        <option value="stdio">로컬(uvx)</option>
                        <option value="sse">원격(HTTP/SSE)</option>
                      </select>
                    </div>
                    {editTransport === "stdio" ? (
                      <>
                        <Input
                          placeholder="명령 (예: uvx)"
                          value={editServerCommand}
                          onChange={(e) => setEditServerCommand(e.target.value)}
                        />
                        <Input
                          placeholder="인자 (공백으로 구분)"
                          value={editServerArgs}
                          onChange={(e) => setEditServerArgs(e.target.value)}
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          placeholder="URL (https://...)"
                          value={editServerUrl}
                          onChange={(e) => setEditServerUrl(e.target.value)}
                        />
                        <Input
                          placeholder="인증 토큰 (선택)"
                          value={editServerToken}
                          onChange={(e) => setEditServerToken(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">공용 PC에 토큰 저장은 피하세요.</p>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        className="flex-1"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        저장
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-1" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 일반 모드
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{server.name}</h4>
                          {server.enabled ? (
                            <Power className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <PowerOff className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                        </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {server.transport === "stdio"
                        ? `${(server as Extract<MCPServerConfig, { transport: "stdio" }>).command} ${((server as Extract<MCPServerConfig, { transport: "stdio" }>).args || []).join(" ")}`
                        : `${(server as Extract<MCPServerConfig, { transport: "sse" }>).url}`}
                    </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={server.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleServer(server.id, checked)
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStartEdit(server)}
                        >
                          <Edit2 className="h-4 w-4 text-blue-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>서버 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                {server.name} 서버를 삭제하시겠습니까?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteServer(server.id)}
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {/* 연결 중 표시 */}
                    {connectingServers.has(server.id) && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded">
                        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="font-medium">연결 중...</span>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          최대 30초 소요될 수 있습니다
                        </p>
                      </div>
                    )}
                    
                    {/* 연결 에러 표시 */}
                    {connectionErrors.has(server.id) && !connectingServers.has(server.id) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded text-xs">
                        <p className="font-medium text-red-800 dark:text-red-200">연결 실패</p>
                        <p className="mt-1 text-red-700 dark:text-red-300">
                          {connectionErrors.get(server.id)?.details}
                        </p>
                        {connectionErrors.get(server.id)?.stderr && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-red-600 dark:text-red-400 hover:underline">
                              에러 로그 보기
                            </summary>
                            <pre className="mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto">
                              {connectionErrors.get(server.id)?.stderr}
                            </pre>
                          </details>
                        )}
                        {connectionErrors.get(server.id)?.suggestion && (
                          <p className="mt-2 text-red-600 dark:text-red-400">
                            💡 {connectionErrors.get(server.id)?.suggestion}
                          </p>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleRetryConnection(server.id)}
                          className="mt-2 h-7 text-xs"
                          variant="outline"
                        >
                          <RotateCw className="h-3 w-3 mr-1" />
                          재시도
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 보안 경고 */}
      <Card className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          ⚠️ 공용 또는 공유 PC에서는 민감한 정보가 포함된 MCP 서버 설정을 저장하지 마세요.
        </p>
      </Card>
    </div>
  );
}

