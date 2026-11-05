import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function mapDatabaseError(error: unknown): { message: string; code: string } {
  const errorCode = (error as { code?: string })?.code;
  switch (errorCode) {
    case "23505": return { message: "This information is already registered", code: "DUPLICATE_ENTRY" };
    case "23503": return { message: "Invalid reference", code: "INVALID_REFERENCE" };
    case "23502": return { message: "Required field missing", code: "MISSING_FIELD" };
    case "22P02": return { message: "Invalid data format", code: "INVALID_FORMAT" };
    default: return { message: "An error occurred processing your request", code: "INTERNAL_ERROR" };
  }
}

function validateInput(action: string, payload: Record<string, unknown>): void {
  switch (action) {
    case "findOrCreateContact": {
      const { firstName, lastName, email, phone } = payload as Record<string, string>;
      if (!firstName?.trim() || firstName.length > 100) throw new Error("Invalid first name");
      if (!lastName?.trim() || lastName.length > 100) throw new Error("Invalid last name");
      if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || email.length > 255) throw new Error("Invalid email");
      if (!phone?.trim() || phone.length > 20) throw new Error("Invalid phone");
      break;
    }
    case "saveMessage": {
      const { content } = payload as Record<string, string>;
      if (!content?.trim() || content.length > 5000) throw new Error("Invalid message content");
      break;
    }
    case "closeSession": {
      const { reason } = payload as Record<string, string>;
      if (reason && reason.length > 1000) throw new Error("Invalid reason");
      break;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, payload } = await req.json();

    try {
      validateInput(action, payload || {});
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid input", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "findOrCreateContact": {
        const { firstName, lastName, email, phone } = payload;
        
        const { data: existing } = await supabase
          .from("support_contacts")
          .select("*")
          .eq("email", email.toLowerCase().trim())
          .eq("phone", phone.trim())
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ contact: existing }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: newContact, error } = await supabase
          .from("support_contacts")
          .insert({
            first_name: firstName.trim().slice(0, 100),
            last_name: lastName.trim().slice(0, 100),
            email: email.trim().toLowerCase().slice(0, 255),
            phone: phone.trim().slice(0, 20),
          })
          .select()
          .single();

        if (error) {
          const mapped = mapDatabaseError(error);
          return new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ contact: newContact }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getOpenSession": {
        // Find existing open session for a contact
        const { contactId } = payload;
        const { data: session } = await supabase
          .from("support_chat_sessions")
          .select("*")
          .eq("contact_id", contactId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          // Also load existing messages
          const { data: messages } = await supabase
            .from("support_chat_messages")
            .select("*")
            .eq("session_id", session.id)
            .order("created_at", { ascending: true });

          return new Response(JSON.stringify({ session, messages: messages || [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ session: null, messages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "createSession": {
        const { contactId, subject: rawSubject } = payload;
        const ticketSubject = (typeof rawSubject === "string" && rawSubject.trim())
          ? rawSubject.trim().slice(0, 200)
          : "Live Chat Session";

        const { data: contact } = await supabase
          .from("support_contacts")
          .select("*")
          .eq("id", contactId)
          .single();

        const { data: session, error } = await supabase
          .from("support_chat_sessions")
          .insert({ contact_id: contactId, status: "open" })
          .select()
          .single();

        if (error) {
          const mapped = mapDatabaseError(error);
          return new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (contact) {
          try {
            await supabase.from("support_tickets").insert({
              first_name: contact.first_name,
              last_name: contact.last_name,
              email: contact.email,
              phone: contact.phone,
              subject: ticketSubject,
              description: `Chat session started on ${new Date().toISOString()}`,
              status: "open",
              source: "website",
            });

            try {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                  type: "ticket_opened",
                  email: contact.email,
                  firstName: contact.first_name,
                  subject: ticketSubject,
                }),
              });
            } catch (notifErr) {
              console.error("Failed to send open notification:", notifErr);
            }
          } catch (ticketErr) {
            console.error("Failed to create ticket from session:", ticketErr);
          }
        }

        return new Response(JSON.stringify({ session }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "saveMessage": {
        const { sessionId, contactId, role, content } = payload;
        const sanitizedContent = (content || "").replace(/<[^>]*>/g, "").slice(0, 5000);

        // Sanitize attachments
        let attachments: Array<{ type: string; name: string; url: string }> = [];
        if (Array.isArray(payload.attachments)) {
          attachments = payload.attachments
            .filter((a: any) => a && typeof a.url === "string" && /^https?:\/\//i.test(a.url))
            .slice(0, 10)
            .map((a: any) => ({
              type: ["image", "file", "link"].includes(a.type) ? a.type : "file",
              name: String(a.name || "attachment").slice(0, 200),
              url: String(a.url).slice(0, 2000),
            }));
        }

        const { error } = await supabase
          .from("support_chat_messages")
          .insert({
            session_id: sessionId,
            contact_id: contactId,
            role: role === "user" || role === "assistant" || role === "staff" ? role : "user",
            content: sanitizedContent,
            staff_name: payload.staffName || null,
            staff_user_id: payload.staffUserId || null,
            attachments,
          });

        if (error) {
          const mapped = mapDatabaseError(error);
          return new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Stamp first_staff_response_at the first time a staff message lands on a session
        if (role === "staff") {
          try {
            const { data: sess } = await supabase
              .from("support_chat_sessions")
              .select("first_staff_response_at")
              .eq("id", sessionId)
              .maybeSingle();
            if (sess && !sess.first_staff_response_at) {
              await supabase
                .from("support_chat_sessions")
                .update({ first_staff_response_at: new Date().toISOString() })
                .eq("id", sessionId);
            }
          } catch (e) {
            console.error("Failed to stamp first_staff_response_at:", e);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "closeSession": {
        const { sessionId, reason } = payload;
        
        const { error } = await supabase
          .from("support_chat_sessions")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            closed_reason: reason?.slice(0, 1000) || null,
          })
          .eq("id", sessionId);

        if (error) {
          const mapped = mapDatabaseError(error);
          return new Response(JSON.stringify({ error: mapped.message, code: mapped.code }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        try {
          const { data: session } = await supabase
            .from("support_chat_sessions")
            .select("contact_id")
            .eq("id", sessionId)
            .single();
          if (session) {
            const { data: contact } = await supabase
              .from("support_contacts")
              .select("email")
              .eq("id", session.contact_id)
              .single();
            if (contact) {
              await supabase
                .from("support_tickets")
                .update({
                  status: "closed",
                  needs_staff_attention: reason === "inactivity",
                  updated_at: new Date().toISOString(),
                })
                .eq("email", contact.email)
                .eq("status", "open");
            }
          }
        } catch (ticketErr) {
          console.error("Failed to update ticket on close:", ticketErr);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "requestHuman": {
        const { sessionId } = payload;
        
        await supabase
          .from("support_chat_sessions")
          .update({ human_requested: true, human_requested_at: new Date().toISOString(), ai_enabled: false })
          .eq("id", sessionId);

        try {
          const { data: session } = await supabase
            .from("support_chat_sessions")
            .select("contact_id")
            .eq("id", sessionId)
            .single();
          if (session) {
            const { data: contact } = await supabase
              .from("support_contacts")
              .select("email")
              .eq("id", session.contact_id)
              .single();
            if (contact) {
              await supabase
                .from("support_tickets")
                .update({
                  human_requested: true,
                  needs_staff_attention: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("email", contact.email)
                .eq("status", "open");
            }
          }
        } catch (err) {
          console.error("Failed to flag ticket for human:", err);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggleAi": {
        const { sessionId, enabled } = payload;
        const { error } = await supabase
          .from("support_chat_sessions")
          .update({ ai_enabled: !!enabled })
          .eq("id", sessionId);
        if (error) {
          return new Response(JSON.stringify({ error: "Failed to toggle AI" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getResponseEta": {
        // Compute today's average staff first-response time within the current shift.
        // Shifts (America/New_York): DAY 09:00-17:00, EVE 17:00-01:00 (next day), QUIET 01:00-09:00.
        // Returns { etaMinutes, shift, sampleCount } or { shift: 'quiet' } if no ETA shown.
        const TZ = "America/New_York";
        const nowUtc = new Date();
        // Get current hour in NY
        const fmt = new Intl.DateTimeFormat("en-US", {
          timeZone: TZ, hour: "numeric", hour12: false,
          year: "numeric", month: "2-digit", day: "2-digit",
        });
        const parts = fmt.formatToParts(nowUtc);
        const hour = parseInt(parts.find(p => p.type === "hour")!.value, 10);
        const yearNY = parts.find(p => p.type === "year")!.value;
        const monthNY = parts.find(p => p.type === "month")!.value;
        const dayNY = parts.find(p => p.type === "day")!.value;

        let shift: "day" | "eve" | "quiet";
        let shiftStartNY: string; // YYYY-MM-DDTHH:00:00 in NY
        if (hour >= 9 && hour < 17) {
          shift = "day";
          shiftStartNY = `${yearNY}-${monthNY}-${dayNY}T09:00:00`;
        } else if (hour >= 17 || hour < 1) {
          shift = "eve";
          // If hour < 1 we crossed midnight — shift started yesterday at 17:00
          if (hour < 1) {
            const d = new Date(`${yearNY}-${monthNY}-${dayNY}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() - 1);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, "0");
            const da = String(d.getUTCDate()).padStart(2, "0");
            shiftStartNY = `${y}-${m}-${da}T17:00:00`;
          } else {
            shiftStartNY = `${yearNY}-${monthNY}-${dayNY}T17:00:00`;
          }
        } else {
          shift = "quiet";
          return new Response(JSON.stringify({ shift, etaMinutes: null, sampleCount: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Convert NY shift start to UTC ISO
        const shiftStartUtc = new Date(new Date(shiftStartNY + "-05:00").getTime()); // approx; will use offset detection
        // Better: build from NY parts using Date.UTC + offset lookup
        const offsetMin = (() => {
          const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" });
          const tz = f.formatToParts(nowUtc).find(p => p.type === "timeZoneName")?.value || "GMT-5";
          const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/);
          if (!m) return 300;
          const sign = m[1] === "-" ? 1 : -1;
          return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
        })();
        const [yr, mo, rest] = shiftStartNY.split("-");
        const [da, hms] = rest.split("T");
        const [h, mi, s] = hms.split(":").map(Number);
        const shiftStartIso = new Date(Date.UTC(+yr, +mo - 1, +da, h, mi, s) + offsetMin * 60_000).toISOString();

        // Pull sessions started on/after shift start where staff has responded
        const { data: sessions } = await supabase
          .from("support_chat_sessions")
          .select("id, created_at, first_staff_response_at, human_requested_at")
          .gte("created_at", shiftStartIso)
          .not("first_staff_response_at", "is", null);

        const samples: number[] = [];
        for (const s of sessions || []) {
          const start = s.human_requested_at || s.created_at;
          const end = s.first_staff_response_at;
          if (!start || !end) continue;
          const diffMin = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
          if (diffMin >= 0 && diffMin < 8 * 60) samples.push(diffMin);
        }

        let etaMinutes: number | null = null;
        if (samples.length > 0) {
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          etaMinutes = Math.max(1, Math.round(avg));
        } else {
          // No data yet for this shift — fall back to a sensible default per shift
          etaMinutes = shift === "day" ? 5 : 15;
        }

        return new Response(JSON.stringify({ shift, etaMinutes, sampleCount: samples.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getSessionByTicketEmail": {
        // Find session + messages for a ticket by matching the contact email
        const { email } = payload;
        const { data: contact } = await supabase
          .from("support_contacts")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!contact) {
          return new Response(JSON.stringify({ session: null, messages: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get the most recent session (open first, then closed)
        const { data: session } = await supabase
          .from("support_chat_sessions")
          .select("*")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!session) {
          return new Response(JSON.stringify({ session: null, messages: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: messages } = await supabase
          .from("support_chat_messages")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });

        return new Response(JSON.stringify({ session, messages: messages || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getClosedSessions": {
        const { contactId } = payload;
        const { data: sessions } = await supabase
          .from("support_chat_sessions")
          .select("*")
          .eq("contact_id", contactId)
          .eq("status", "closed")
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify({ sessions: sessions || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getSessionMessages": {
        const { sessionId } = payload;
        const { data: messages } = await supabase
          .from("support_chat_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        return new Response(JSON.stringify({ messages: messages || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid request", code: "INVALID_ACTION" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Support DB error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
