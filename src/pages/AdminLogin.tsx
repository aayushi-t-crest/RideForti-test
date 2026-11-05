import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import fortiLogo from "@/assets/forti-logo.png";
import { Shield, Mail, MessageSquare } from "lucide-react";

const TRUST_KEY = "forti_2fa_trust";
const TWO_FA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-2fa`;

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA state
  const [phase, setPhase] = useState<"credentials" | "channel" | "otp">("credentials");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [otpValue, setOtpValue] = useState("");
  const [userId, setUserId] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const callTwoFa = async (action: string, body: Record<string, unknown>, token?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(TWO_FA_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...body }),
    });
    return res.json();
  };

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    let result = await signIn(email.trim(), password);
    if (result.error && password !== password.trim()) {
      result = await signIn(email.trim(), password.trim());
    }
    if (result.error) {
      setError(
        result.error.message?.includes("Invalid login credentials")
          ? "Incorrect email or password. Please try again."
          : result.error.message || "Login failed",
      );
      setIsLoading(false);
      return;
    }

    // Get session to retrieve user id and token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Authentication failed");
      setIsLoading(false);
      return;
    }

    const uid = session.user.id;
    setUserId(uid);

    // Check if device is trusted
    const storedToken = localStorage.getItem(TRUST_KEY);
    if (storedToken) {
      const trustResult = await callTwoFa("check_trust", {
        user_id: uid,
        device_token: storedToken,
      });
      if (trustResult.trusted) {
        setIsLoading(false);
        navigate(getPostLoginTarget());
        return;
      }
      // Token expired or invalid — remove it
      localStorage.removeItem(TRUST_KEY);
    }

    // Move to channel selection
    setPhase("channel");
    setIsLoading(false);
  };

  const handleChooseChannel = async (chosen: "email" | "sms") => {
    setError("");
    setIsLoading(true);
    setChannel(chosen);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expired. Please log in again.");
      setPhase("credentials");
      setIsLoading(false);
      return;
    }

    const sendResult = await callTwoFa("send_code", { channel: chosen }, session.access_token);
    if (sendResult.error) {
      setError(sendResult.error);
      setIsLoading(false);
      return;
    }

    setPhase("otp");
    setResendCooldown(60);
    setIsLoading(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expired. Please log in again.");
      setPhase("credentials");
      setIsLoading(false);
      return;
    }

    const result = await callTwoFa("send_code", { channel }, session.access_token);
    if (result.error) {
      setError(result.error);
    } else {
      setResendCooldown(60);
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setError("");
    setIsLoading(true);

    const result = await callTwoFa("verify_code", {
      user_id: userId,
      code: otpValue,
      remember_me: rememberMe,
    });

    if (result.error) {
      setError(result.error);
      setOtpValue("");
      setIsLoading(false);
      return;
    }

    if (result.device_token) {
      localStorage.setItem(TRUST_KEY, result.device_token);
    }

    setIsLoading(false);
    navigate(getPostLoginTarget());
  };

  // Honor a `next` query param (used by the OAuth consent route). Only accept
  // same-origin relative paths so this can't be turned into an open redirect.
  const getPostLoginTarget = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return `/admin${window.location.search}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={fortiLogo} alt="Forti" className="h-8 mx-auto mb-6" />
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {phase === "credentials"
              ? "Sign in to access the admin panel"
              : phase === "channel"
              ? "Choose how you'd like to receive your verification code"
              : `Enter the verification code sent via ${channel === "sms" ? "SMS" : "email"}`}
          </p>
        </div>

        {phase === "credentials" ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-visible:ring-white focus-visible:border-white"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus-visible:ring-white focus-visible:border-white"
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Remember this device for 7 days
              </label>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="forti" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        ) : phase === "channel" ? (
          <div className="space-y-3">
            <Button
              onClick={() => handleChooseChannel("email")}
              variant="forti"
              className="w-full justify-start h-14"
              disabled={isLoading}
            >
              <Mail className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Email</div>
                <div className="text-xs opacity-70">Send code to {email}</div>
              </div>
            </Button>
            <Button
              onClick={() => handleChooseChannel("sms")}
              variant="forti"
              className="w-full justify-start h-14"
              disabled={isLoading}
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Text Message (SMS)</div>
                <div className="text-xs opacity-70">Send code to your phone</div>
              </div>
            </Button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              type="button"
              onClick={() => { setPhase("credentials"); setError(""); }}
              className="text-sm text-muted-foreground hover:underline w-full text-center pt-2"
            >
              ← Back to login
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {channel === "sms" ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
              <span className="text-sm">
                Code sent via <strong>{channel === "sms" ? "SMS" : "email"}</strong>
              </span>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={setOtpValue}
                onComplete={handleVerifyOtp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              onClick={handleVerifyOtp}
              variant="forti"
              className="w-full"
              disabled={isLoading || otpValue.length !== 6}
            >
              <Shield className="h-4 w-4 mr-2" />
              {isLoading ? "Verifying..." : "Verify & Login"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isLoading}
                className="text-sm text-white hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPhase("credentials");
                setOtpValue("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:underline w-full text-center"
            >
              ← Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
