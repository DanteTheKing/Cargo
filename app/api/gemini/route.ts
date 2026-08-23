import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, model, systemPrompt } = await req.json();

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set in the environment variables." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const genModel = genAI.getGenerativeModel({ 
      model: model || "gemini-1.5-pro",
      systemInstruction: systemPrompt || "You are a helpful assistant."
    });

    const result = await genModel.generateContent(prompt);
    
    return NextResponse.json({
      text: result.response.text(),
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Gemini" },
      { status: 500 }
    );
  }
}
