import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface RequestBody {
  userMessage: string;
  assistantMessage?: string;
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
    const { userMessage, assistantMessage } = body;

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = assistantMessage
      ? `다음 대화를 3-5단어로 짧게 요약해서 제목을 만들어줘. 한국어로 답변하고, 제목만 출력해.

사용자: ${userMessage}
AI: ${assistantMessage.substring(0, 200)}...`
      : `다음 질문을 3-5단어로 짧게 요약해서 제목을 만들어줘. 한국어로 답변하고, 제목만 출력해.

질문: ${userMessage}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 50,
      },
    });

    const title = response.text?.trim() || userMessage.substring(0, 30);

    return new Response(
      JSON.stringify({ title }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Summarize title error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate title" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

