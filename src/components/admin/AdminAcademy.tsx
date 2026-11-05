import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, GraduationCap, Copy, ShieldAlert, ExternalLink, Check, X } from "lucide-react";

export default function AdminAcademy() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [firearm, setFirearm] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", track: "open" });

  async function load() {
    const [{ data: d }, { data: i }, { data: f }] = await Promise.all([
      supabase.from("academy_drivers").select("*").order("created_at", { ascending: false }),
      supabase.from("academy_invites").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("academy_firearm_compliance").select("*, academy_drivers(first_name,last_name,email)").order("updated_at", { ascending: false }),
    ]);
    setDrivers(d || []); setInvites(i || []); setFirearm(f || []);
  }
  useEffect(() => { load(); }, []);

  async function createInvite() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/academy-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "create-invite", ...form, base_url: window.location.origin }),
    });
    const r = await res.json();
    if (r.ok) { toast.success("Invite sent via SMS + email"); setOpen(false); setForm({ first_name: "", last_name: "", email: "", phone: "", track: "open" }); load(); }
    else toast.error(r.error || "Failed");
  }

  async function reviewFirearm(id: string, status: "approved" | "rejected", notes: string) {
    const { error } = await supabase.from("academy_firearm_compliance").update({ review_status: status, review_notes: notes }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); load(); }
  }

  async function signedDocUrl(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("academy-firearm-docs").createSignedUrl(path, 600);
    return data?.signedUrl || null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><GraduationCap className="h-5 w-5" />Forti Driver Academy</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage driver enrollment, certifications, firearm compliance, and Forti Scores.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="forti" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />New invite</Button></DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Send Academy invite</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone (+1XXXXXXXXXX)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Track</Label>
                <Select value={form.track} onValueChange={(v) => setForm({ ...form, track: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]">
                    <SelectItem value="core">Core Operators (required)</SelectItem>
                    <SelectItem value="open">Open Network (optional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createInvite} className="w-full" variant="forti">Send invite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="drivers">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          <TabsTrigger value="drivers" className="flex-1 sm:flex-none text-xs sm:text-sm">Drivers ({drivers.length})</TabsTrigger>
          <TabsTrigger value="invites" className="flex-1 sm:flex-none text-xs sm:text-sm">Invites</TabsTrigger>
          <TabsTrigger value="firearm" className="flex-1 sm:flex-none text-xs sm:text-sm">Firearm ({firearm.filter((f) => f.review_status === "pending").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="mt-4">
          <Card className="p-3 sm:p-4">
            <div className="space-y-2">
              {drivers.length === 0 ? <p className="text-sm text-muted-foreground">No drivers yet. Send an invite to get started.</p> : drivers.map((d) => (
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
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/academy/invite/${i.token}`); toast.success("Link copied"); }}>
                    <Copy className="h-3 w-3 mr-1" />Copy link
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="firearm" className="mt-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              Awareness-only compliance. No tactical training. Verify external permits & certifications before approving.
            </div>
            {firearm.length === 0 ? (
              <p className="text-sm text-muted-foreground">No firearm submissions.</p>
            ) : firearm.map((f) => (
              <FirearmRow key={f.id} item={f} onReview={reviewFirearm} signedDocUrl={signedDocUrl} />
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FirearmRow({ item, onReview, signedDocUrl }: { item: any; onReview: (id: string, s: "approved" | "rejected", notes: string) => void; signedDocUrl: (p: string | null) => Promise<string | null> }) {
  const [notes, setNotes] = useState(item.review_notes || "");
  const drv = item.academy_drivers;
  const statusVariant = item.review_status === "approved" ? "default" : item.review_status === "rejected" ? "destructive" : "secondary";
  return (
    <div className="p-3 rounded bg-muted/30 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{drv?.first_name} {drv?.last_name}</p>
          <p className="text-xs text-muted-foreground">{drv?.email}</p>
        </div>
        <Badge variant={statusVariant as any}>{item.review_status}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Permit #:</span> {item.permit_number || "—"}</div>
        <div><span className="text-muted-foreground">State:</span> {item.permit_state || "—"}</div>
        <div><span className="text-muted-foreground">Expires:</span> {item.permit_expires || "—"}</div>
        <div><span className="text-muted-foreground">Cert provider:</span> {item.external_cert_provider || "—"}</div>
        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 mt-1">
          {item.permit_doc_url && (
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={async () => { const u = await signedDocUrl(item.permit_doc_url); if (u) window.open(u, "_blank"); }}>
              <ExternalLink className="h-3 w-3 mr-1" />Permit doc
            </Button>
          )}
          {item.external_cert_doc_url && (
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={async () => { const u = await signedDocUrl(item.external_cert_doc_url); if (u) window.open(u, "_blank"); }}>
              <ExternalLink className="h-3 w-3 mr-1" />Cert doc
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Disclosure: {item.acknowledged_disclosure ? "✓" : "—"}</span>
        <span>Storage: {item.acknowledged_storage ? "✓" : "—"}</span>
        <span>Legal: {item.acknowledged_legal ? "✓" : "—"}</span>
      </div>
      <Textarea placeholder="Review notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="text-xs" rows={2} />
      <div className="flex flex-col sm:flex-row gap-2">
        <Button size="sm" variant="forti" className="w-full sm:w-auto" onClick={() => onReview(item.id, "approved", notes)}><Check className="h-3 w-3 mr-1" />Approve</Button>
        <Button size="sm" variant="destructive" className="w-full sm:w-auto" onClick={() => onReview(item.id, "rejected", notes)}><X className="h-3 w-3 mr-1" />Reject</Button>
      </div>
    </div>
  );
}
