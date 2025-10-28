import { GoogleGenAI, mcpToTool } from "@google/genai";
import { NextRequest } from "next/server";
import { getConnectedClients } from "@/lib/mcp/manager";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables");
}

interface RequestBody {
  message: string;
  history?: Array<{ role: string; content: string }>;
  mcpEnabled?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await request.json();
    const { message, history = [], mcpEnabled = false } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // MCP 도구 준비
    const tools = [];
    if (mcpEnabled) {
      const connectedClients = getConnectedClients();
      for (const clientInfo of connectedClients) {
        if (clientInfo.connected) {
          tools.push(mcpToTool(clientInfo.client));
        }
      }
    }
    
    // Chat 세션 생성
    const chat = ai.chats.create({
      model: "gemini-2.0-flash-001",
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(tools.length > 0 && { tools }),
      },
      history: history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
    });

    // 스트리밍 응답 생성
    const stream = await chat.sendMessageStream({ message });

    // ReadableStream으로 변환
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // 텍스트 스트리밍
            const text = chunk.text || "";
            if (text) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
            
            // 함수 호출 정보 전송
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              for (const functionCall of chunk.functionCalls) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      functionCall: {
                        name: functionCall.name,
                        args: functionCall.args,
                      },
                    })}\n\n`
                  )
                );
              }
            }
          }
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // 에러 타입별 처리
    if (errorMessage.includes("API_KEY")) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

