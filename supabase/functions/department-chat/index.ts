import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { directAiChat } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEPARTMENT_PROMPTS: Record<string, string> = {
  support: `You are the Forti Support Operations GPT. You are an expert on Forti's customer support operations for a luxury rideshare and personal protection platform.

Your responsibilities:
- Help staff manage support tickets and customer inquiries
- Provide communication templates and best practices
- Guide escalation procedures
- Answer questions about Forti's services, pricing, and policies using the knowledge base
- Help draft responses to customer issues

You have access to:
1. The Knowledge Base (articles that serve as Forti's source of truth)
2. Current Support Tickets (open and recent tickets)

Always be professional, concise, and helpful. Reference specific knowledge articles or ticket details when relevant.`,

  admin: `You are the Forti Admin Operations GPT. Help with user management, permissions, security policies, admin dashboard operations, and internal processes for a luxury rideshare platform.`,

  development: `You are the Forti Development GPT. Help with React/TypeScript code, Supabase Edge Functions, database queries, component architecture, and technical debugging for a luxury rideshare and personal protection platform.`,

  marketing: `You are the Forti Marketing & Content GPT. Help with social media captions, content ideas, hashtag strategies, campaign concepts, and brand messaging. Forti posts 10 pieces of content per day across 10 categories: Informational, Armed Vehicles, Humor, Stills, Entertainment, News, Protection Tips, Industry, Custom Content, and Text-Based.`,

  ops: `You are the Forti Operations GPT. Help with logistics, fleet management, driver and guard onboarding, service quality standards, and operational processes for a luxury rideshare and personal protection platform.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, department } = await req.json();

    if (!department || !messages) {
      return new Response(JSON.stringify({ error: "Missing department or messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let systemPrompt = DEPARTMENT_PROMPTS[department] || DEPARTMENT_PROMPTS.support;

    // For support department, inject knowledge articles and recent tickets
    if (department === "support") {
      const [knowledgeRes, ticketsRes] = await Promise.all([
        supabase.from("knowledge_articles").select("title, content, category").eq("is_active", true),
        supabase.from("support_tickets").select("id, subject, status, description, first_name, last_name, email, source, created_at, human_requested, needs_staff_attention").order("created_at", { ascending: false }).limit(50),
      ]);

      if (knowledgeRes.data && knowledgeRes.data.length > 0) {
        systemPrompt += "\n\n--- KNOWLEDGE BASE ---\n";
        for (const article of knowledgeRes.data) {
          systemPrompt += `\n[${article.category}] ${article.title}\n${article.content}\n`;
        }
      }

      if (ticketsRes.data && ticketsRes.data.length > 0) {
        systemPrompt += "\n\n--- RECENT SUPPORT TICKETS ---\n";
        for (const t of ticketsRes.data) {
          const flags = [];
          if (t.human_requested) flags.push("HUMAN REQUESTED");
          if (t.needs_staff_attention) flags.push("NEEDS ATTENTION");
          systemPrompt += `\n#${t.id.slice(0, 8)} | ${t.subject} | Status: ${t.status} | From: ${t.first_name} ${t.last_name} (${t.email}) | Source: ${t.source} | ${t.created_at}${flags.length ? " | " + flags.join(", ") : ""}\n${t.description}\n`;
        }
      }
    }

    const response = await directAiChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
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
  } catch (e) {
    console.error("department-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
