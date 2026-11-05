import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Paperclip, Send, Sparkles, X, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Mentionable {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface NoteAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
}

interface InternalNote {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  content: string;
  mentions: any;
  is_ai: boolean;
  created_at: string;
  support_internal_note_attachments?: NoteAttachment[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  ticketLabel: string;
}

const BUCKET = "support-internal-attachments";

export default function AdminInternalNotesPanel({ open, onOpenChange, ticketId, ticketLabel }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<Mentionable[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Mentionable[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-internal-notes", {
        body: { action: "list", ticket_id: ticketId },
      });
      if (error) throw error;
      setNotes((data as any)?.notes ?? []);
    } catch (e: any) {
      toast({ title: "Failed to load notes", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.functions.invoke("support-internal-notes", {
        body: { action: "list_mentionable" },
      });
      setUsers((data as any)?.users ?? []);
    } catch {}
  };

  useEffect(() => {
    if (open && ticketId) {
      fetchNotes();
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const uploadFiles = async (): Promise<{ file_name: string; file_url: string; file_size: number; file_type: string }[]> => {
    if (!files.length) return [];
    const out: any[] = [];
    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) {
        toast({ title: `${f.name} is over 50MB`, variant: "destructive" });
        continue;
      }
      const bad = /\.(exe|bat|cmd|sh|app|msi|com|jar|scr|js|vbs|ps1)$/i.test(f.name);
      if (bad) {
        toast({ title: `${f.name} is an executable and was skipped`, variant: "destructive" });
        continue;
      }
      const path = `${ticketId}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: false });
      if (error) {
        toast({ title: `Upload failed: ${f.name}`, description: error.message, variant: "destructive" });
        continue;
      }
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      out.push({ file_name: f.name, file_url: signed?.signedUrl || path, file_size: f.size, file_type: f.type });
    }
    return out;
  };

  const handleSend = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      const attachments = await uploadFiles();
      const { error } = await supabase.functions.invoke("support-internal-notes", {
        body: {
          action: "create",
          ticket_id: ticketId,
          content: text.trim(),
          mentions: mentions.map((m) => ({ user_id: m.user_id, email: m.email, name: m.full_name })),
          attachments,
        },
      });
      if (error) throw error;
      setText("");
      setMentions([]);
      setFiles([]);
      await fetchNotes();
    } catch (e: any) {
      toast({ title: "Failed to add note", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleAiScan = async () => {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke("support-internal-notes", {
        body: { action: "ai_scan", ticket_id: ticketId },
      });
      if (error) throw error;
      await fetchNotes();
      toast({ title: "AI note added" });
    } catch (e: any) {
      toast({ title: "AI scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <span>Internal Notes</span>
            <Button size="sm" variant="fortiGhost" onClick={handleAiScan} disabled={scanning} className="text-purple-400">
              <Sparkles className="h-4 w-4 mr-1" />
              {scanning ? "Scanning..." : "AI Scan"}
            </Button>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">{ticketLabel}</p>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No internal notes yet. Add one below.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className={`rounded-lg p-3 border ${n.is_ai ? "bg-purple-500/10 border-purple-500/30" : "bg-muted/30 border-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {n.is_ai ? <Bot className="h-3.5 w-3.5 text-purple-400" /> : <AtSign className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs font-medium">{n.author_name || "Staff"}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  {Array.isArray(n.mentions) && n.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.mentions.map((m: any, i: number) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">@{m.name || m.email}</span>
                      ))}
                    </div>
                  )}
                  {n.support_internal_note_attachments && n.support_internal_note_attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {n.support_internal_note_attachments.map((a) => (
                        <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-1 rounded bg-background border border-border hover:border-foreground/40 inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {a.file_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border p-3 space-y-2">
          {mentions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mentions.map((m) => (
                <span key={m.user_id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary inline-flex items-center gap-1">
                  @{m.full_name || m.email}
                  <button onClick={() => setMentions((arr) => arr.filter((x) => x.user_id !== m.user_id))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {files.map((f, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {f.name}
                  <button onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <Textarea
            placeholder="Add an internal note..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const arr = Array.from(e.target.files ?? []);
                setFiles((cur) => [...cur, ...arr].slice(0, 10));
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button size="sm" variant="fortiGhost" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button size="sm" variant="fortiGhost" onClick={() => setPickerOpen((v) => !v)}>
                <AtSign className="h-4 w-4" />
              </Button>
              {pickerOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-64 max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-lg z-50 p-2">
                  <input
                    autoFocus
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent border-b border-border text-xs px-1 py-1 mb-1 outline-none"
                  />
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No users found.</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => {
                          if (!mentions.find((m) => m.user_id === u.user_id)) setMentions((arr) => [...arr, u]);
                          setPickerOpen(false);
                          setSearch("");
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs flex flex-col"
                      >
                        <span className="font-medium">{u.full_name || u.email}</span>
                        {u.full_name && <span className="text-[10px] text-muted-foreground">{u.email}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button size="sm" variant="forti" className="ml-auto" onClick={handleSend} disabled={sending || (!text.trim() && files.length === 0)}>
              <Send className="h-4 w-4 mr-1" />
              {sending ? "..." : "Add Note"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
