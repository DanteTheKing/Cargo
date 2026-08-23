import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, model, systemPrompt } = await req.json();

  const groqApiKey = process.env.GROQ_API_KEY || "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";

  if (!groqApiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set." },
      { status: 500 }
    );
  }

  const groq = new Groq({
    apiKey: groqApiKey,
  });

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt || "You are a helpful assistant.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: model || "meta/llama-3.3-70b",
    });

    return NextResponse.json({
      text: chatCompletion.choices[0]?.message?.content || "",
    });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Groq" },
      { status: 500 }
    );
  }
}
