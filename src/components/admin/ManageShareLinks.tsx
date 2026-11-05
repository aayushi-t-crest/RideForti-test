import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, Link as LinkIcon, Eye, Edit3, CalendarDays, UserPlus } from "lucide-react";
import EventStaffPanel from "./calendar/EventStaffPanel";

interface ShareLink {
  id: string;
  token: string;
  recipient_name: string;
  recipient_phone: string;
  permission: "view" | "edit";
  enabled: boolean;
  department: string;
  created_at: string;
  last_accessed_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  department: string;
}

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const generateToken = () => {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
};

const ManageShareLinks = ({ open, onOpenChange, department }: Props) => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPermission, setFormPermission] = useState<"view" | "edit">("view");
  const [creating, setCreating] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; title: string; event_date: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const fetchLinks = async () => {
    setLoading(true);
    const [{ data, error }, { data: eventRows, error: eventError }] = await Promise.all([
      supabase
        .from("calendar_share_links")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("department_events")
        .select("id,title,event_date")
        .order("event_date", { ascending: true })
        .limit(100),
    ]);
    if (error) toast({ title: "Error loading links", description: error.message, variant: "destructive" });
    else setLinks((data as ShareLink[]) || []);
    if (eventError) toast({ title: "Error loading events", description: eventError.message, variant: "destructive" });
    else setEvents((eventRows as Array<{ id: string; title: string; event_date: string }>) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchLinks();
  }, [open]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const buildShareUrl = (token: string) => `${window.location.origin}/calendar/share/${token}`;

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(buildShareUrl(token));
    toast({ title: "Link copied" });
  };

  const handleToggle = async (link: ShareLink) => {
    const { error } = await supabase
      .from("calendar_share_links")
      .update({ enabled: !link.enabled })
      .eq("id", link.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: link.enabled ? "Link disabled" : "Link enabled" });
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this share link?")) return;
    const { error } = await supabase.from("calendar_share_links").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Link deleted" });
    fetchLinks();
  };

  const handleCreate = async () => {
    if (!formName.trim() || formPhone.replace(/\D/g, "").length !== 10) {
      toast({ title: "Name and 10-digit phone required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const token = generateToken();
    const phoneE164 = `+1${formPhone.replace(/\D/g, "")}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("calendar_share_links").insert({
      token,
      recipient_name: formName.trim(),
      recipient_phone: phoneE164,
      permission: formPermission,
      department,
      created_by: user?.id || null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Error creating link", description: error.message, variant: "destructive" });
      return;
    }
    const url = buildShareUrl(token);
    await navigator.clipboard.writeText(url);
    toast({ title: "Link created & copied", description: url });
    setShowCreate(false);
    setFormName("");
    setFormPhone("");
    setFormPermission("view");
    fetchLinks();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" /> Manage Share Links
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary" /> Calendar Share Links</h3>
                  <p className="text-xs text-muted-foreground mt-1">Each link is unique to one recipient and tied to their phone number. Disable to revoke access.</p>
                </div>
                <Button variant="forti" size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Link
                </Button>
              </div>

              {loading ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Loading…</p>
              ) : links.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No share links yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className={`rounded-lg border border-border bg-card p-3 space-y-2 ${
                        !link.enabled ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{link.recipient_name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                link.permission === "edit"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {link.permission === "edit" ? (
                                <>
                                  <Edit3 className="h-2.5 w-2.5" /> Edit
                                </>
                              ) : (
                                <>
                                  <Eye className="h-2.5 w-2.5" /> View only
                                </>
                              )}
                            </span>
                            {!link.enabled && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{link.recipient_phone}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Created {new Date(link.created_at).toLocaleDateString()}
                            {link.last_accessed_at &&
                              ` · Last opened ${new Date(link.last_accessed_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch checked={link.enabled} onCheckedChange={() => handleToggle(link)} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(link.token)}
                            title="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(link.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        readOnly
                        value={buildShareUrl(link.token)}
                        className="text-[10px] font-mono h-7"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Tag Staff to an Event</h3>
                <p className="text-xs text-muted-foreground mt-1">Select an event, then assign staff to the needed service tag with email and SMS alerts.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Event</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event to manage staffing" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[200]">
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} — {new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEvent ? (
                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{selectedEvent.title}</span>
                    <span>•</span>
                    <span>{new Date(selectedEvent.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <EventStaffPanel eventId={selectedEvent.id} eventTitle={selectedEvent.title} />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Pick an event to tag staff and control assignment notifications.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Share Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Recipient name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone number *</label>
              <div className="flex gap-2">
                <div className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground bg-muted/40">
                  +1
                </div>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(formatPhone(e.target.value))}
                  placeholder="(555) 555-5555"
                  inputMode="tel"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Each link is uniquely tied to this phone number.
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Permission</label>
              <Select value={formPermission} onValueChange={(v) => setFormPermission(v as "view" | "edit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="edit">Edit (add & modify events)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="fortiGhost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button variant="forti" size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create & Copy Link"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManageShareLinks;
