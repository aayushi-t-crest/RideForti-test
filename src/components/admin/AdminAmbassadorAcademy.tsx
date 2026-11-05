import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Megaphone, Copy, Send } from "lucide-react";

function formatUsPhone(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AdminAmbassadorAcademy() {
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", track: "open" });

  async function load() {
    const [{ data: a }, { data: i }] = await Promise.all([
      supabase.from("ambassador_drivers").select("*").order("created_at", { ascending: false }),
      supabase.from("ambassador_invites").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAmbassadors(a || []); setInvites(i || []);
  }
  useEffect(() => { load(); }, []);

  async function createInvite() {
    const first_name = form.first_name.trim();
    const last_name = form.last_name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!first_name || !last_name) return toast.error("First and last name are required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("A valid email is required");
    if (!phone || !/^\+1\d{10}$/.test(phone)) return toast.error("Phone must be in +1XXXXXXXXXX format");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ambassador-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "create-invite", first_name, last_name, email, phone, track: form.track, base_url: window.location.origin }),
    });
    const r = await res.json();
    if (r.ok) { toast.success("Invite sent via SMS + email"); setOpen(false); setForm({ first_name: "", last_name: "", email: "", phone: "", track: "open" }); load(); }
    else toast.error(r.error || "Failed");
  }

  async function resendInvite(invite_id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ambassador-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "resend-invite", invite_id, base_url: window.location.origin }),
    });
    const r = await res.json();
    if (r.ok) { toast.success("Invite resent via SMS + email"); load(); }
    else toast.error(r.error || "Failed to resend");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Megaphone className="h-5 w-5" />Forti Ambassador Academy</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Invite brand ambassadors, manage levels, and monitor referrals & Forti Scores.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="forti" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />New invite</Button></DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Send Ambassador invite</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="(555) 123-4567"
                  value={formatUsPhone(form.phone)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
                    setForm({ ...form, phone: digits ? `+1${digits}` : "" });
                  }}
                />
              </div>
              <div><Label>Track</Label>
                <Select value={form.track} onValueChange={(v) => setForm({ ...form, track: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]">
                    <SelectItem value="core">Core Ambassadors (required)</SelectItem>
                    <SelectItem value="open">Open Network (optional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createInvite} className="w-full" variant="forti">Send invite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="ambassadors">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="ambassadors" className="flex-1 sm:flex-none text-xs sm:text-sm">Ambassadors ({ambassadors.length})</TabsTrigger>
          <TabsTrigger value="invites" className="flex-1 sm:flex-none text-xs sm:text-sm">Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="ambassadors" className="mt-4">
          <Card className="p-3 sm:p-4">
            <div className="space-y-2">
              {ambassadors.length === 0 ? <p className="text-sm text-muted-foreground">No ambassadors yet. Send an invite to get started.</p> : ambassadors.map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded bg-muted/30">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{d.first_name} {d.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.email} · {d.phone}</p>
                  </div>
                  <div className="sm:text-right text-xs flex sm:block gap-3">
                    <p>Level: <span className="font-bold">{d.current_level}</span></p>
                    <p>Score: <span className="font-bold">{d.forti_score}</span> · {d.track}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <Card className="p-3 sm:p-4">
            <div className="space-y-2">
              {invites.length === 0 ? <p className="text-sm text-muted-foreground">No invites yet.</p> : invites.map((i) => (
                <div key={i.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded bg-muted/30 text-sm">
                  <div className="min-w-0"><p className="truncate">{i.email}</p><p className="text-xs text-muted-foreground truncate">{i.phone} · {i.status}</p></div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {i.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => resendInvite(i.id)}>
                        <Send className="h-3 w-3 mr-1" />Resend
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ambassador/invite/${i.token}`); toast.success("Link copied"); }}>
                      <Copy className="h-3 w-3 mr-1" />Copy link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
