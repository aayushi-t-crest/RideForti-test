import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, GraduationCap, CheckCircle2, Lock, Trophy, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SS_KEY = "academy_session";
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function call(fn: string, action: string, body: any = {}, sessionToken?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
  if (sessionToken) headers["x-academy-session"] = sessionToken;
  const res = await fetch(`${FN_BASE}/${fn}`, {
    method: "POST", headers, body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

export default function Academy() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<"login" | "register" | "otp" | "dashboard" | "quiz">("login");
  const [session, setSession] = useState<string | null>(localStorage.getItem(SS_KEY));
  const [driver, setDriver] = useState<any>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState(""); const [maskedPhone, setMaskedPhone] = useState("");
  const [invite, setInvite] = useState<any>(null);
  const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [phone, setPhone] = useState("");
  const [modules, setModules] = useState<any[]>([]); const [certs, setCerts] = useState<any[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState<any>(null); const [progress, setProgress] = useState({ served: 0, total: 30, correct: 0 });
  const [quizDone, setQuizDone] = useState<{ score: number; passed: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      call("academy-auth", "get-invite", { token }).then((r) => {
        if (r.invite) { setInvite(r.invite); setView("register"); setEmail(r.invite.email); setPhone(r.invite.phone); setFirstName(r.invite.first_name || ""); setLastName(r.invite.last_name || ""); }
        else toast.error(r.error || "Invalid invite");
      });
    } else if (session) loadMe();
  }, [token]);

  async function loadMe() {
    const r = await call("academy-auth", "me", {}, session!);
    if (r.driver) {
      setDriver(r.driver); setView("dashboard");
      const m = await call("academy-content", "modules", {}, session!);
      setModules(m.modules || []);
      const c = await call("academy-content", "certifications", {}, session!);
      setCerts(c.certifications || []);
    } else { localStorage.removeItem(SS_KEY); setSession(null); setView("login"); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const r = await call("academy-auth", "register", { token, first_name: firstName, last_name: lastName, phone, password });
    setLoading(false);
    if (r.ok) { toast.success("Account created. Sign in below."); setView("login"); navigate("/academy"); }
    else toast.error(r.error || "Failed");
  }
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const r = await call("academy-auth", "login", { email, password });
    setLoading(false);
    if (r.otp_required) { setMaskedPhone(r.masked_phone); setView("otp"); toast.success("Code sent via SMS"); }
    else toast.error(r.error || "Failed");
  }
  async function handleOtp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const r = await call("academy-auth", "verify-otp", { email, code: otpCode });
    setLoading(false);
    if (r.session_token) { localStorage.setItem(SS_KEY, r.session_token); setSession(r.session_token); await loadMe(); }
    else toast.error(r.error || "Invalid code");
  }
  async function logout() {
    if (session) await call("academy-auth", "logout", {}, session);
    localStorage.removeItem(SS_KEY); setSession(null); setDriver(null); setView("login");
  }
  async function startQuiz(level_key: string) {
    const r = await call("academy-quiz", "start", { level_key }, session!);
    if (r.attempt_id) { setAttemptId(r.attempt_id); setQuizDone(null); setView("quiz"); fetchNext(r.attempt_id); }
  }
  async function fetchNext(aid: string) {
    const r = await call("academy-quiz", "next", { attempt_id: aid }, session!);
    if (r.question) { setCurrentQ(r.question); setProgress(r.progress); }
    else if (r.done) setQuizDone({ score: r.score, passed: r.passed });
  }
  async function answer(idx: number) {
    const r = await call("academy-quiz", "answer", { attempt_id: attemptId, question_id: currentQ.id, selected_index: idx }, session!);
    if (r.done) { setQuizDone({ score: r.score, passed: r.passed }); await loadMe(); }
    else fetchNext(attemptId!);
  }

  // ---------- VIEWS ----------
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 min-w-0"><Shield className="h-5 w-5 shrink-0" /><span className="font-semibold tracking-wide text-sm sm:text-base truncate">Forti Driver Academy</span></Link>
        {driver && <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sign out</span></Button>}
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">{children}</main>
    </div>
  );

  if (view === "register" && invite) return (
    <Shell><Card className="p-6 sm:p-8 max-w-md mx-auto"><h1 className="text-xl sm:text-2xl font-bold mb-2">Complete your enrollment</h1>
      <p className="text-sm text-muted-foreground mb-6">Welcome to the Forti Driver Academy. Set your password to begin.</p>
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
          <div><Label>Last name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
        </div>
        <div><Label>Email</Label><Input value={email} disabled /></div>
        <div><Label>Phone (SMS for OTP)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
        <div><Label>Password (8+ chars)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
        <Button type="submit" variant="forti" className="w-full" disabled={loading}>Create account</Button>
      </form></Card></Shell>
  );

  if (view === "otp") return (
    <Shell><Card className="p-6 sm:p-8 max-w-md mx-auto"><h1 className="text-xl sm:text-2xl font-bold mb-2">Verify your identity</h1>
      <p className="text-sm text-muted-foreground mb-6">We sent a 6-digit code to {maskedPhone}.</p>
      <form onSubmit={handleOtp} className="space-y-4">
        <div><Label>Verification code</Label><Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} required /></div>
        <Button type="submit" variant="forti" className="w-full" disabled={loading}>Verify & sign in</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setView("login")}>Back</Button>
      </form></Card></Shell>
  );

  if (view === "login") return (
    <Shell><Card className="p-6 sm:p-8 max-w-md mx-auto"><h1 className="text-xl sm:text-2xl font-bold mb-2">Driver Academy sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">Enter your credentials. We'll text a one-time code.</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" variant="forti" className="w-full" disabled={loading}>Continue</Button>
        <p className="text-xs text-muted-foreground text-center">Need access? Ask your Forti administrator for an invite link.</p>
      </form></Card></Shell>
  );

  if (view === "quiz") return (
    <Shell>
      {quizDone ? (
        <Card className="p-8 text-center max-w-lg mx-auto">
          <Trophy className={`h-12 w-12 mx-auto mb-4 ${quizDone.passed ? "text-yellow-500" : "text-muted-foreground"}`} />
          <h2 className="text-2xl font-bold mb-2">{quizDone.passed ? "Certified!" : "Not quite there"}</h2>
          <p className="text-4xl font-bold mb-4">{quizDone.score}%</p>
          <p className="text-sm text-muted-foreground mb-6">{quizDone.passed ? "You've earned this certification level. Your Forti Score has been updated." : "Review the modules and try again."}</p>
          <Button onClick={() => setView("dashboard")}>Back to dashboard</Button>
        </Card>
      ) : currentQ ? (
        <Card className="p-5 sm:p-8 max-w-2xl mx-auto">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Question {progress.served + 1} of {progress.total}</span>
            <span className="uppercase tracking-wide">{currentQ.difficulty}{currentQ.is_scenario && " · scenario"}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full mb-6 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(progress.served / 30) * 100}%` }} /></div>
          <h3 className="text-base sm:text-lg font-semibold mb-6">{currentQ.prompt}</h3>
          <div className="space-y-2">
            {currentQ.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => answer(i)} className="w-full text-left p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition text-sm sm:text-base">{opt}</button>
            ))}
          </div>
        </Card>
      ) : <p className="text-center text-muted-foreground">Loading…</p>}
    </Shell>
  );

  // Dashboard
  return (
    <Shell>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{driver?.first_name} {driver?.last_name}</h1>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Forti Score</p>
          <p className="text-3xl sm:text-4xl font-bold">{driver?.forti_score ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {["CD", "AO", "EO"].map((lvl) => {
          const has = certs.some((c) => c.level_key === lvl);
          const names: any = { CD: "Certified Driver", AO: "Advanced Operator", EO: "Elite Operator" };
          return (
            <Card key={lvl} className="p-5">
              <div className="flex items-center gap-2 mb-2">
                {has ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                <h3 className="font-semibold">{names[lvl]}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{has ? "Certified" : "Not yet certified"}</p>
              <Button size="sm" variant={has ? "outline" : "forti"} className="w-full" onClick={() => startQuiz(lvl)}>
                <GraduationCap className="h-4 w-4 mr-1" />{has ? "Re-certify" : "Take 30-Q exam"}
              </Button>
            </Card>
          );
        })}
      </div>

      <h2 className="text-xl font-bold mb-4">Curriculum</h2>
      <div className="space-y-3">
        {modules.map((m) => {
          const total = m.lessons.length;
          const done = m.lessons.filter((l: any) => l.completed).length;
          return (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{m.level_key} · {m.is_firearm ? "Compliance" : "Module"}</p>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{m.summary}</p>
                </div>
                <span className="text-xs whitespace-nowrap">{done}/{total}</span>
              </div>
              <div className="mt-3 space-y-2">
                {m.lessons.map((l: any) => (
                  <div key={l.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded bg-muted/30">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      {l.completed ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <div className="h-4 w-4 rounded-full border border-border shrink-0" />}
                      <span className="truncate">{l.title}</span>
                    </div>
                    {!l.completed && (
                      <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={async () => {
                        await call("academy-content", "complete-lesson", { lesson_id: l.id }, session!);
                        loadMe();
                      }}>Mark complete</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}
