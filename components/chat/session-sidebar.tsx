import { ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageSquarePlus, Trash2 } from "lucide-react";

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          onClick={onNewChat}
          className="w-full hover:scale-105 transition-transform"
          variant="default"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          새 채팅
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              채팅 내역이 없습니다
            </p>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer hover:bg-accent hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group ${
                  currentSessionId === session.id ? "bg-accent" : ""
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString("ko-KR")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.messages.length}개 메시지
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          ⚠️ 공용 PC에서는 민감한 정보를 입력하지 마세요
        </p>
      </div>
    </div>
  );
}

