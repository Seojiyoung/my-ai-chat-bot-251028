import { Message } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { MarkdownContent } from "./markdown-content";
import { FunctionCallCard } from "./function-call-card";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timestamp = new Date(message.timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-blue-500" : "bg-purple-500"}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        {/* 함수 호출 카드 (AI 메시지에만) */}
        {!isUser && message.functionCalls && message.functionCalls.length > 0 && (
          <div className="w-full mb-2">
            {message.functionCalls.map((fc) => (
              <FunctionCallCard key={fc.id} functionCall={fc} />
            ))}
          </div>
        )}
        
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-blue-500 text-white"
              : "bg-muted text-foreground"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="text-sm">
              <MarkdownContent content={message.content} />
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1">{timestamp}</span>
      </div>
    </div>
  );
}

