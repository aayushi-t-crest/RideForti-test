// Direct Twilio integration with automatic Zero-Key Development Mode fallback.
export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  isMock?: boolean;
  error?: string;
}

export async function sendDirectSms({ to, body, from }: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const defaultFrom = Deno.env.get("TWILIO_FROM_NUMBER");
  const sender = from || defaultFrom;

  // Real Twilio sending if credentials exist
  if (accountSid && authToken && sender) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = "Basic " + btoa(`${accountSid}:${authToken}`);
      const toNumber = to.startsWith("+") ? to : `+1${to.replace(/\D/g, "")}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toNumber,
          From: sender,
          Body: body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("[Twilio direct error]", res.status, data);
        return { success: false, error: data.message || `Twilio HTTP ${res.status}` };
      }
      return { success: true, sid: data.sid };
    } catch (err: any) {
      console.error("[Twilio exception]", err);
      return { success: false, error: err.message };
    }
  }

  // Zero-Key Development Mode Fallback:
  // Log message and verification code to console/database so testing succeeds seamlessly.
  console.log(`[DEV SMS SIMULATION] To: ${to} | Sender: ${sender || "FORTI-DEV"} | Message: "${body}"`);
  return {
    success: true,
    sid: `dev_mock_sms_${Date.now()}`,
    isMock: true,
  };
}

