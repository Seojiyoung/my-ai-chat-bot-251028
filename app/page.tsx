"use client";

import { useEffect, useState, useRef } from "react";
import { Message, ChatSession } from "@/lib/types";
import {
  getSessions,
  saveSession,
  deleteSession,
  createSession,
  getSession,
} from "@/lib/storage";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { SessionSidebar } from "@/components/chat/session-sidebar";
import { AnimatedMessage } from "@/components/chat/animated-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { MarkdownContent } from "@/components/chat/markdown-content";
import { Bot, Loader2, RotateCcw } from "lucide-react";

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 초기 로드: 세션 불러오기
  useEffect(() => {
    const loadedSessions = getSessions();
    setSessions(loadedSessions);

    // 최근 세션이 있으면 자동 선택
    if (loadedSessions.length > 0) {
      const latestSession = loadedSessions[0];
      setCurrentSessionId(latestSession.id);
      setMessages(latestSession.messages);
    } else {
      // 없으면 새 세션 생성
      handleNewChat();
    }
  }, []);

  // 메시지 변경 시 자동 스크롤 (부드러운 애니메이션)
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, streamingMessage]);

  // 현재 세션 저장
  const saveCurrentSession = (
    updatedMessages: Message[],
    customTitle?: string
  ) => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    if (!session) return;

    const updatedSession: ChatSession = {
      ...session,
      messages: updatedMessages,
      title: customTitle || session.title,
      updatedAt: Date.now(),
    };

    saveSession(updatedSession);
    setSessions(getSessions());
  };

  // 제목 자동 요약
  const generateSummaryTitle = async (
    userMessage: string,
    assistantMessage: string
  ) => {
    try {
      const response = await fetch("/api/summarize-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, assistantMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.title;
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
    }
    return null;
  };

  // 새 채팅 시작
  const handleNewChat = () => {
    const newSession = createSession();
    saveSession(newSession);
    setSessions(getSessions());
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setStreamingMessage("");
  };

  // 세션 선택
  const handleSelectSession = (id: string) => {
    const session = getSession(id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setStreamingMessage("");
    }
  };

  // 세션 삭제
  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updatedSessions = getSessions();
    setSessions(updatedSessions);

    // 현재 세션이 삭제되면 새 세션으로 전환
    if (id === currentSessionId) {
      if (updatedSessions.length > 0) {
        handleSelectSession(updatedSessions[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  // 현재 대화 초기화
  const handleClearChat = () => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    if (!session) return;

    const clearedSession: ChatSession = {
      ...session,
      messages: [],
      title: "새 채팅",
      updatedAt: Date.now(),
    };

    saveSession(clearedSession);
    setSessions(getSessions());
    setMessages([]);
    setStreamingMessage("");
  };

  // 메시지 전송
  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveCurrentSession(updatedMessages);

    setIsLoading(true);
    setStreamingMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulatedText += data.text;
                setStreamingMessage(accumulatedText);
              }
              if (data.done) {
                const assistantMessage: Message = {
                  id: `msg_${Date.now()}_${Math.random()
                    .toString(36)
                    .substr(2, 9)}`,
                  role: "assistant",
                  content: accumulatedText,
                  timestamp: Date.now(),
                };

                const finalMessages = [...updatedMessages, assistantMessage];
                setMessages(finalMessages);
                saveCurrentSession(finalMessages);
                setStreamingMessage("");

                // 첫 번째 응답인 경우 제목 자동 요약
                if (messages.length === 0) {
                  generateSummaryTitle(content, accumulatedText).then(
                    (title) => {
                      if (title) {
                        saveCurrentSession(finalMessages, title);
                      }
                    }
                  );
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("메시지 전송에 실패했습니다. API 키를 확인하세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 bg-background flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AI Chat</h1>
            <p className="text-sm text-muted-foreground">
              Powered by Gemini 2.0 Flash
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hover:scale-105 transition-transform"
                disabled={messages.length === 0}
              >
                <RotateCcw className="h-4 w-4" />
                대화 초기화
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>대화를 초기화하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  현재 대화의 모든 메시지가 삭제됩니다. 이 작업은 되돌릴 수
                  없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearChat}>
                  초기화
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </header>

        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !streamingMessage ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg mb-2">새로운 대화를 시작하세요</p>
                <p className="text-sm">아래에 메시지를 입력해보세요</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <AnimatedMessage key={message.id} delay={index * 0.05}>
                    <MessageBubble message={message} />
                  </AnimatedMessage>
                ))}

                {streamingMessage && (
                  <div className="flex gap-3 mb-4 animate-fade-in">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-purple-500">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start max-w-[85%]">
                      <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                        <div className="text-sm typing-cursor">
                          <MarkdownContent content={streamingMessage} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
