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
    // Resolve initial target model (allow passthrough for specific model IDs)
    let targetModel = model || "llama-3.3-70b-versatile";
    
    // Alias mapping for internal CARGO terminology
    if (targetModel === 'groq/compound') targetModel = 'llama-3.3-70b-versatile';
    if (targetModel === 'groq/compound-mini') targetModel = 'llama-3.1-8b-instant';

    // Smart Pipeline & Execution Wrapper
    const executeWithFallback = async (primaryModel: string): Promise<any> => {
       try {
          return await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt || "You are a helpful assistant." },
              { role: "user", content: prompt }
            ],
            model: primaryModel,
          });
       } catch (error: any) {
          const errMessage = error?.error?.message || error?.message || "";
          const errCode = error?.error?.code || error?.code || "";
          
          // Detect Decommissioned or Invalid Model Errors
          if (
            errCode === 'model_decommissioned' || 
            errCode === 'invalid_request_error' ||
            errMessage.toLowerCase().includes('decommissioned') ||
            errMessage.toLowerCase().includes('does not exist') ||
            error.status === 400 || error.status === 404
          ) {
             console.warn(`[ORCHESTRATOR] Model ${primaryModel} failed (${errCode}). Triggering smart fallback...`);
             
             // Determine appropriate fallback tier
             const isSmall = primaryModel.includes('8b') || primaryModel.includes('mini') || primaryModel.includes('7b') || primaryModel.includes('22m') || primaryModel.includes('86m');
             const fallbackModel = isSmall ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
             
             console.log(`[ORCHESTRATOR] Rerouting payload to active fallback: ${fallbackModel}`);
             
             return await groq.chat.completions.create({
                messages: [
                  { role: "system", content: systemPrompt || "You are a helpful assistant." },
                  { role: "user", content: prompt }
                ],
                model: fallbackModel,
             });
          }
          throw error; // Re-throw critical auth/rate-limit errors
       }
    };

    const chatCompletion = await executeWithFallback(targetModel);

    return NextResponse.json({
      text: chatCompletion.choices[0]?.message?.content || "",
    });
  } catch (error: any) {
    console.error("[ORCHESTRATOR ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch from Groq API" },
      { status: 500 }
    );
  }
}
