import { ChatSession, Message } from "./types";

const STORAGE_KEY = "chat_sessions";

/**
 * localStorage에서 모든 세션을 가져옵니다
 */
export function getSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return [];
  }
}

/**
 * 특정 세션을 ID로 조회합니다
 */
export function getSession(id: string): ChatSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * 세션을 저장하거나 업데이트합니다
 */
export function saveSession(session: ChatSession): void {
  if (typeof window === "undefined") return;
  
  try {
    const sessions = getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...session, updatedAt: Date.now() };
    } else {
      sessions.unshift(session);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * 세션을 삭제합니다
 */
export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const sessions = getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
}

/**
 * 새 세션을 생성합니다
 */
export function createSession(title: string = "새 채팅"): ChatSession {
  const now = Date.now();
  return {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 세션 제목을 자동 생성합니다 (첫 메시지 기반)
 */
export function generateSessionTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "새 채팅";
  
  const content = firstUserMessage.content.trim();
  const maxLength = 30;
  
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

