// Direct OpenAI / Gemini integration with automatic Zero-Key Development Mode fallback.
export interface AiChatParams {
  messages: Array<{ role: string; content: any }>;
  model?: string;
  temperature?: number;
  tools?: any[];
  stream?: boolean;
}

export async function directAiChat({
  messages,
  model = "gpt-4o-mini",
  temperature = 0.7,
  tools,
  stream = false,
}: AiChatParams): Promise<Response> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  // Real OpenAI call if key exists
  if (openaiKey) {
    return fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        tools,
        stream,
      }),
    });
  }

  // Zero-Key Development Mode Fallback:
  // Return structured OpenAI-compatible response for UI chat widgets
  const lastMsg = messages[messages.length - 1]?.content || "";
  console.log(`[DEV AI SIMULATION] Prompt: "${typeof lastMsg === "string" ? lastMsg.slice(0, 80) : "multimodal"}"`);

  const mockReply =
    "Welcome to Forti Executive Mobility & Protection. Our armed chauffeurs and armored Cadillac Escalade fleet are at your service across Florida. How can we assist your itinerary today?";

  const mockBody = {
    id: `chatcmpl_dev_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: mockReply,
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 15, completion_tokens: 35, total_tokens: 50 },
  };

  return new Response(JSON.stringify(mockBody), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function directAiEmbeddings(input: string | string[]): Promise<number[][]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input,
      }),
    });
    const data = await res.json();
    if (res.ok && data.data) {
      return data.data.map((d: any) => d.embedding);
    }
  }

  // Zero-Key Development Mode Fallback:
  // Return standard 1536-dimensional mock embedding for database vector storage
  const inputs = Array.isArray(input) ? input : [input];
  return inputs.map(() => new Array(1536).fill(0.001));
}

