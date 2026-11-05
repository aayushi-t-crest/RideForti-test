import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  Paperclip,
  Send,
  Trash2,
  AtSign,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface NoteAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
}

interface NoteMention {
  id: string;
  mentioned_user_id: string;
  mentioned_user_email: string;
  mentioned_user_name: string | null;
}

interface EventNote {
  id: string;
  author_id: string;
  author_name: string | null;
  author_email: string | null;
  content: string;
  created_at: string;
  attachments: NoteAttachment[];
  mentions: NoteMention[];
}

interface Props {
  eventId: string;
  eventTitle: string;
}

const EventNotes = ({ eventId, eventTitle }: Props) => {
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mentions, setMentions] = useState<AdminUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return staff
      .filter(
        (s) =>
          (s.full_name || "").toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mentionQuery, staff]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart || 0;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionStart(cursor - match[0].length);
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const selectMention = (user: AdminUser) => {
    if (mentionStart < 0) return;
    const before = content.slice(0, mentionStart);
    const after = content.slice((textareaRef.current?.selectionStart) || mentionStart);
    const label = (user.full_name || user.email).replace(/\s+/g, "");
    const newContent = `${before}@${label} ${after}`;
    setContent(newContent);
    if (!mentions.find((m) => m.user_id === user.user_id)) {
      setMentions((prev) => [...prev, user]);
    }
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  useEffect(() => {
    loadAll();
  }, [eventId]);

  const loadAll = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    setCurrentUserId(userData.user?.id || null);

    const { data: staffData } = await supabase
      .from("admin_users_directory")
      .select("user_id, email, full_name")
      .eq("active", true)
      .order("full_name");
    setStaff(staffData || []);

    const { data: notesData } = await supabase
      .from("event_notes")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    const noteIds = (notesData || []).map((n) => n.id);
    let attachmentsByNote: Record<string, NoteAttachment[]> = {};
    let mentionsByNote: Record<string, NoteMention[]> = {};

    if (noteIds.length) {
      const { data: atts } = await supabase
        .from("event_note_attachments")
        .select("*")
        .in("note_id", noteIds);
      const { data: mens } = await supabase
        .from("event_note_mentions")
        .select("*")
        .in("note_id", noteIds);
      (atts || []).forEach((a: any) => {
        attachmentsByNote[a.note_id] = attachmentsByNote[a.note_id] || [];
        attachmentsByNote[a.note_id].push(a);
      });
      (mens || []).forEach((m: any) => {
        mentionsByNote[m.note_id] = mentionsByNote[m.note_id] || [];
        mentionsByNote[m.note_id].push(m);
      });
    }

    setNotes(
      (notesData || []).map((n: any) => ({
        ...n,
        attachments: attachmentsByNote[n.id] || [],
        mentions: mentionsByNote[n.id] || [],
      }))
    );
    setLoading(false);
  };

  const toggleMention = (user: AdminUser) => {
    setMentions((prev) =>
      prev.find((m) => m.user_id === user.user_id)
        ? prev.filter((m) => m.user_id !== user.user_id)
        : [...prev, user]
    );
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      toast({ title: "Add a note or attachment", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user ?? null;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData.user;
      }
      if (!user) throw new Error("Your session expired. Please refresh and sign in again.");

      const authorMeta = (user.user_metadata || {}) as any;
      const authorName =
        [authorMeta.first_name, authorMeta.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "Unknown";

      // 1. Create note
      const { data: note, error: noteErr } = await supabase
        .from("event_notes")
        .insert({
          event_id: eventId,
          author_id: user.id,
          author_name: authorName,
          author_email: user.email,
          content: content.trim(),
        })
        .select()
        .single();
      if (noteErr) throw noteErr;

      // 2. Upload attachments
      for (const file of files) {
        const path = `${eventId}/${note.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("event-note-attachments")
          .upload(path, file, { upsert: false });
        if (upErr) {
          console.error(upErr);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("event-note-attachments")
          .getPublicUrl(path);
        await supabase.from("event_note_attachments").insert({
          note_id: note.id,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }

      // 3. Insert mentions
      if (mentions.length) {
        await supabase.from("event_note_mentions").insert(
          mentions.map((m) => ({
            note_id: note.id,
            mentioned_user_id: m.user_id,
            mentioned_user_email: m.email,
            mentioned_user_name: m.full_name,
          }))
        );
      }

      // 4. Trigger notifications (admins + tagged staff)
      await supabase.functions.invoke("notify-event-note", {
        body: { noteId: note.id },
      });

      toast({ title: "Note posted" });
      setContent("");
      setFiles([]);
      setMentions([]);
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to post note", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("event_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      loadAll();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Notes & Updates</h4>
        <span className="text-[10px] text-muted-foreground">{notes.length} note{notes.length !== 1 && "s"}</span>
      </div>

      {/* Composer */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 relative">
        <Textarea
          ref={textareaRef}
          placeholder="Leave a note for the team... Type @ to tag staff"
          value={content}
          onChange={handleContentChange}
          rows={2}
          className="text-sm resize-none bg-background"
        />

        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="absolute left-3 right-3 top-[88px] z-50 rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
            {mentionMatches.map((s) => (
              <button
                key={s.user_id}
                onClick={() => selectMention(s)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-foreground/10 flex items-center gap-2"
              >
                <AtSign className="h-3 w-3 text-primary" />
                <span className="font-medium">{s.full_name || s.email}</span>
                {s.full_name && <span className="text-muted-foreground">{s.email}</span>}
              </button>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1 pr-1">
                {f.type.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {f.name.length > 20 ? f.name.slice(0, 20) + "..." : f.name}
                <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <Badge key={m.user_id} className="text-[10px] gap-1 pr-1 bg-primary/20 text-primary border-primary/40">
                <AtSign className="h-3 w-3" />
                {m.full_name || m.email}
                <button onClick={() => toggleMention(m)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              onChange={handleFiles}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => fileRef.current?.click()}
              title="Attach files"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Tag staff">
                  <AtSign className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-popover z-[100]" align="start">
                <p className="text-[10px] text-muted-foreground mb-2 px-1">Tag staff to notify them</p>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {staff.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">No staff in directory</p>
                  ) : (
                    staff.map((s) => {
                      const checked = mentions.find((m) => m.user_id === s.user_id);
                      return (
                        <button
                          key={s.user_id}
                          onClick={() => toggleMention(s)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-foreground/10 transition-colors flex items-center justify-between ${checked ? "bg-primary/10" : ""}`}
                        >
                          <span className="truncate">
                            <span className="font-medium">{s.full_name || s.email}</span>
                            {s.full_name && <span className="text-muted-foreground ml-1">{s.email}</span>}
                          </span>
                          {checked && <span className="text-primary text-[10px]">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            variant="forti"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && files.length === 0)}
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Post
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No notes yet. Be the first to post.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium">{note.author_name || note.author_email}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(note.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {note.author_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {note.content && <p className="text-sm whitespace-pre-wrap">{note.content}</p>}

              {note.mentions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.mentions.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-[10px] gap-0.5 border-primary/40 text-primary">
                      <AtSign className="h-2.5 w-2.5" />
                      {m.mentioned_user_name || m.mentioned_user_email}
                    </Badge>
                  ))}
                </div>
              )}

              {note.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted hover:bg-muted/70 transition-colors"
                    >
                      {a.file_type?.startsWith("image/") ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {a.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventNotes;
