// Shared utilities for the Forti Ambassador Academy edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDirectSms } from "./twilio.ts";
import { sendDirectEmail } from "./resend.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ambassador-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function svc() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `pbkdf2$120000$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iters, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: parseInt(iters), hash: "SHA-256" },
      key,
      256
    );
    const calc = btoa(String.fromCharCode(...new Uint8Array(bits)));
    return calc === hashB64;
  } catch {
    return false;
  }
}

export function makeToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function makeOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendSms(to: string, body: string): Promise<void> {
  await sendDirectSms({ to, body });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await sendDirectEmail({
    to,
    subject,
    html,
    from: "Forti Ambassador Academy <onboarding@resend.dev>",
  });
}

export async function getAmbassadorFromSession(req: Request): Promise<{ id: string; email: string } | null> {
  const token = req.headers.get("x-ambassador-session");
  if (!token) return null;
  const { data } = await svc()
    .from("ambassador_sessions")
    .select("ambassador_id, expires_at, ambassador_drivers(id, email, status)")
    .eq("session_token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const u = (data as any).ambassador_drivers;
  if (!u || u.status !== "active") return null;
  return { id: u.id, email: u.email };
}
