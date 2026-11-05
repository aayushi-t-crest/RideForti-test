import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import fortiLogo from "@/assets/forti-logo.png";

// Beta oauth namespace isn't in the generated types; tiny local wrapper.
type OauthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthClient = () => (supabase.auth as unknown as { oauth: OauthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        setReady(true);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/admin/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message ?? "Could not load authorization request");
          setReady(true);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? "Unexpected error");
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauthClient().approveAuthorization(authorizationId)
        : await oauthClient().denyAuthorization(authorizationId);
      if (error) {
        setError(error.message ?? "Authorization failed");
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={fortiLogo} alt="Forti" className="h-8 mx-auto mb-6" />
          <h1 className="text-2xl font-bold">
            {details?.client?.name
              ? `Connect ${details.client.name} to Forti`
              : "Authorize connection"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            This lets {details?.client?.name ?? "the client"} use this app as you. It does not
            bypass Forti's permissions or backend policies.
          </p>
        </div>

        {!ready && !error && (
          <p className="text-sm text-muted-foreground text-center">Loading…</p>
        )}

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {ready && details && !error && (
          <>
            {details?.client?.redirect_uri && (
              <div className="text-xs text-muted-foreground text-center break-all">
                Redirect URI: {details.client.redirect_uri}
              </div>
            )}
            {Array.isArray(details?.scopes) && details.scopes.length > 0 && (
              <div className="rounded-md border border-border p-4 text-sm">
                <div className="font-semibold mb-2">Requested access</div>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {details.scopes.map((s: string) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button
                variant="forti"
                className="w-full"
                disabled={busy}
                onClick={() => decide(true)}
              >
                {busy ? "Working…" : "Approve"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Cancel connection
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default OAuthConsent;
