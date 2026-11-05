import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "ticket_opened" | "ticket_closed" | "ticket_assignment" | "faq_assignment" | "support_digest";
  email: string;
  firstName?: string;
  subject?: string;
  messageBody?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { type, email, firstName = "there", subject, messageBody } = (await req.json()) as NotificationPayload;

    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isOpened = type === "ticket_opened";
    const isClosed = type === "ticket_closed";
    const isGeneric = !isOpened && !isClosed;

    let heading = "";
    let bodyHtml = "";
    let emailSubject = "";

    if (isOpened) {
      heading = "Your Support Ticket Has Been Opened";
      bodyHtml = `We've received your support request <strong>"${subject || "Live Chat Session"}"</strong> and our team is on it. You'll receive another notification when your ticket is resolved.`;
      emailSubject = `Forti Support — Ticket Received: ${subject || "Live Chat Session"}`;
    } else if (isClosed) {
      heading = "Your Support Ticket Has Been Closed";
      bodyHtml = `Your support ticket <strong>"${subject || "Live Chat Session"}"</strong> has been resolved and closed. If you need further assistance, feel free to reach out again through our support chat.`;
      emailSubject = `Forti Support — Ticket Closed: ${subject || "Live Chat Session"}`;
    } else {
      heading = subject || "Forti Support Notification";
      bodyHtml = (messageBody || "").replace(/\n/g, "<br/>");
      emailSubject = `Forti Support — ${subject || "Notification"}`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:24px 32px;background-color:#000000;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">FORTI</h1>
        </td></tr>
        <tr><td style="padding:32px;background-color:#f9f9f9;border:1px solid #e5e5e5;border-top:none;">
          <h2 style="margin:0 0 16px;color:#111;font-size:20px;font-weight:600;">${heading}</h2>
          <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">${bodyHtml}</p>
          ${isOpened ? `<p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">In the meantime, you can continue chatting with us through the support widget on our website.</p>` : ""}
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
          <p style="margin:0;color:#888;font-size:13px;">If you have any questions, contact us at <a href="mailto:support@rideforti.com" style="color:#007AFF;">support@rideforti.com</a></p>
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#000000;border-radius:0 0 12px 12px;">
          <p style="margin:0;color:#888;font-size:12px;text-align:center;">© ${new Date().getFullYear()} Forti. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Forti Support <support@rideforti.com>",
        to: [email],
        subject: emailSubject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
