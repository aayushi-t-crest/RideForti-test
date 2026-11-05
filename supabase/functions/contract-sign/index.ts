import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "get";

    if (req.method === "GET" || action === "get") {
      const token = url.searchParams.get("token");
      if (!token) return json({ error: "token required" }, 400);
      const { data: contract } = await admin
        .from("contracts")
        .select("id,title,description,recipient_name,recipient_email,amount_cents,payment_terms,expires_at,document_path,document_name,document_mime,status,signed_at")
        .eq("sign_token", token)
        .maybeSingle();
      if (!contract) return json({ error: "Not found" }, 404);

      const { data: signed } = await admin.storage
        .from("contracts")
        .createSignedUrl(contract.document_path, 60 * 30);

      const { data: fields } = await admin
        .from("contract_custom_fields")
        .select("id,label,field_type,required,position,value")
        .eq("contract_id", contract.id)
        .order("position");

      // Mark as viewed (only first time)
      if (contract.status === "sent") {
        await admin.from("contracts").update({ status: "viewed" }).eq("id", contract.id);
        await admin.from("contract_events").insert({
          contract_id: contract.id,
          event_type: "viewed",
          ip_address: req.headers.get("x-forwarded-for") ?? "",
          user_agent: req.headers.get("user-agent") ?? "",
        });
      }

      return json({ contract, documentUrl: signed?.signedUrl, fields: fields || [] });
    }

    if (action === "sign") {
      const body = await req.json();
      const { token, signatureDataUrl, typedName, fieldValues } = body;
      if (!token || !signatureDataUrl || !typedName) {
        return json({ error: "missing fields" }, 400);
      }

      const { data: contract } = await admin
        .from("contracts")
        .select("*")
        .eq("sign_token", token)
        .maybeSingle();
      if (!contract) return json({ error: "Not found" }, 404);
      if (contract.status === "signed") return json({ error: "Already signed" }, 400);
      if (contract.expires_at && new Date(contract.expires_at) < new Date()) {
        return json({ error: "Contract expired" }, 400);
      }

      // Save field values
      if (Array.isArray(fieldValues)) {
        for (const fv of fieldValues) {
          if (fv?.id) {
            await admin
              .from("contract_custom_fields")
              .update({ value: String(fv.value ?? "") })
              .eq("id", fv.id)
              .eq("contract_id", contract.id);
          }
        }
      }

      const ip = req.headers.get("x-forwarded-for") ?? "";
      const ua = req.headers.get("user-agent") ?? "";

      await admin
        .from("contracts")
        .update({
          status: "signed",
          signature_data_url: signatureDataUrl,
          signer_typed_name: typedName,
          signed_at: new Date().toISOString(),
          signed_ip: ip,
          signed_user_agent: ua,
        })
        .eq("id", contract.id);

      await admin.from("contract_events").insert({
        contract_id: contract.id,
        event_type: "signed",
        ip_address: ip,
        user_agent: ua,
        metadata: { typedName },
      });

      return json({ success: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("contract-sign error:", e);
    return json({ error: (e as Error).message }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
