// Direct Resend integration with automatic Zero-Key Development Mode fallback.
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  isMock?: boolean;
  error?: string;
}

export async function sendDirectEmail({
  to,
  subject,
  html,
  from = "Forti <contracts@rideforti.com>",
  attachments,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");

  // Real Resend sending if API key exists
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[Resend direct error]", res.status, data);
        return { success: false, error: data.message || `Resend HTTP ${res.status}` };
      }
      return { success: true, id: data.id };
    } catch (err: any) {
      console.error("[Resend exception]", err);
      return { success: false, error: err.message };
    }
  }

  // Zero-Key Development Mode Fallback:
  // Log email to console and return success so workflows never fail.
  const recipient = Array.isArray(to) ? to.join(", ") : to;
  console.log(`[DEV EMAIL SIMULATION] To: ${recipient} | From: ${from} | Subject: "${subject}"`);
  return {
    success: true,
    id: `dev_mock_email_${Date.now()}`,
    isMock: true,
  };
}

