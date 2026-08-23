import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, model, systemPrompt } = await req.json();

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set in the environment variables." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  try {
    const response = await genAI.models.generateContent({
      model: model || "gemini-3-pro",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt || "You are a helpful assistant."
      }
    });
    return NextResponse.json({
      text: response.text,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Gemini" },
      { status: 500 }
    );
  }
}
