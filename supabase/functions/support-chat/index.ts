import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { directAiChat } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    
    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and validate each message
    const sanitizedMessages = messages.map((m: { role?: string; content?: string; attachments?: Array<{ type: string; name: string; url: string }> }) => {
      const role = m.role === "user" || m.role === "assistant" ? m.role : "user";
      let content = typeof m.content === "string" 
        ? m.content.replace(/<[^>]*>/g, "").slice(0, 5000) 
        : "";
      
      // Append attachment context so the AI can reference them
      if (m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0) {
        const attachmentDescriptions = m.attachments.map((a: { type: string; name: string; url: string }) => {
          if (a.type === "image") return `[Attached image: ${a.name}] (${a.url})`;
          if (a.type === "link") return `[Shared link: ${a.url}]`;
          return `[Attached document: ${a.name}] (${a.url})`;
        }).join("\n");
        content = content ? `${content}\n\n${attachmentDescriptions}` : attachmentDescriptions;
      }
      
      return { role, content };
    }).filter((m: { content: string }) => m.content.length > 0);

    if (sanitizedMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch knowledge articles for context
    let knowledgeContext = "";
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: articles } = await adminClient
        .from("knowledge_articles")
        .select("title, category, content")
        .eq("is_active", true);
      if (articles && articles.length > 0) {
        knowledgeContext = "\n\n--- KNOWLEDGE BASE (use this as your source of truth) ---\n" +
          articles.map((a: any) => `[${a.category.toUpperCase()}] ${a.title}\n${a.content}`).join("\n\n") +
          "\n--- END KNOWLEDGE BASE ---";
      }
    } catch (e) {
      console.error("Failed to fetch knowledge:", e);
    }

    const systemPrompt = `You are Forti's AI Support Assistant — a calm, articulate concierge for a premium security-first transportation service used by executives and high-trust clients.

Conversation style:
- Speak naturally and warmly, like a thoughtful concierge — not a script. Vary sentence length, use plain language, and acknowledge what the user actually said before answering.
- Be concise but never robotic. One short paragraph is usually right; bullet points only when listing real items.
- No emojis, no slang, no exclamation marks unless the user is celebrating something.
- If you don't know something specific (pricing details, launch dates, exact features), say so honestly and offer to connect them with the team.

About Forti:
- Premium transportation with a security focus, designed for executives who value discretion and protection.
- Currently in waitlist phase — users can join at /waitlist.
- Vetted professional drivers, real-time security monitoring, and confidential travel.

Handoff awareness:
- If a message is prefixed with "[Human support agent NAME said]:" that means a real human teammate stepped in earlier. Treat their words as authoritative — don't contradict them. When the human steps away and you resume, briefly acknowledge where things left off and continue helping.
- If a user has issues you cannot resolve, offer to connect them with a human: "I'd be happy to have a teammate take a closer look — would that help?"

Attachments:
- Acknowledge any shared link, image, or document by name. For images, mention you can see one was shared. For links, reference the URL. For documents, offer to discuss the contents.

Always prioritize information from the Knowledge Base below over your general knowledge. The Knowledge Base is Forti's source of truth.${knowledgeContext}`;

    const response = await directAiChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...sanitizedMessages,
      ],
      stream: false,
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    return new Response(JSON.stringify(aiData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
