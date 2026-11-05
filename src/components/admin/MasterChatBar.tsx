import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, X, Loader2, History, Paperclip, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

type Attachment = {
  name: string;
  type: string;
  size: number;
  path: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

type SavedChat = {
  id: string;
  title: string;
  last_message_at: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-chat`;

const ACCEPTED_TYPES = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.docx,.txt,.csv,.md,.json";
const MAX_FILE_MB = 15;

interface MasterChatBarProps {
  userName?: string;
  isAdmin?: boolean;
  isPrimaryAdmin?: boolean;
  modulePerms?: { module_name: string; access_level: string }[];
}

const SUGGESTION_MAP: Record<string, string[]> = {
  "dept-support": ["Any high-priority support tickets?", "Who needs a follow-up today?"],
  "dept-sales": ["How's the sales pipeline looking?", "Any deals closing this week?"],
  "dept-ops": ["What's happening on the ops side today?", "Any fleet issues I should know about?"],
  "dept-marketing": ["What's on the content calendar this week?", "Any campaigns launching soon?"],
  "dept-development": ["What's in progress on the dev side?", "Any blockers on the engineering team?"],
  "dept-admin": ["How many new waitlist signups this week?", "Anything urgent on the admin side?"],
  "okr": ["What should I focus on today?", "What tasks are due this week?", "How are we tracking on goals?"],
  "tickets": ["Any tickets needing attention?"],
  "waitlist": ["How's the waitlist growing?"],
  "knowledge": ["What's in the knowledge base on pricing?"],
};

const GENERIC_SUGGESTIONS = [
  "What should I focus on today?",
  "Catch me up on this week",
  "Anything urgent I should know about?",
  "How are we tracking on goals?",
];

const ADMIN_SUGGESTIONS = [
  "What should I focus on today?",
  "Anything urgent across the company?",
  "Catch me up on this week",
  "How are we tracking on OKRs?",
];

function buildSuggestions(
  isAdmin: boolean,
  isPrimaryAdmin: boolean,
  modulePerms: { module_name: string }[]
): string[] {
  if (isPrimaryAdmin || isAdmin) return ADMIN_SUGGESTIONS;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of modulePerms) {
    const prompts = SUGGESTION_MAP[p.module_name];
    if (!prompts) continue;
    for (const q of prompts) {
      if (seen.has(q)) continue;
      seen.add(q);
      out.push(q);
      if (out.length >= 4) return out;
    }
  }
  for (const q of GENERIC_SUGGESTIONS) {
    if (out.length >= 4) break;
    if (seen.has(q)) continue;
    seen.add(q);
    out.push(q);
  }
  return out.length > 0 ? out : GENERIC_SUGGESTIONS;
}

const MasterChatBar = ({
  userName = "Admin",
  isAdmin = false,
  isPrimaryAdmin = false,
  modulePerms = [],
}: MasterChatBarProps) => {
  const suggestions = buildSuggestions(isAdmin, isPrimaryAdmin, modulePerms);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load saved chats
  const loadSavedChats = useCallback(async () => {
    const { data, error } = await supabase
      .from("nova_chats")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (!error && data) setSavedChats(data as SavedChat[]);
  }, []);

  useEffect(() => {
    loadSavedChats();
  }, [loadSavedChats]);

  const openSavedChat = async (id: string) => {
    setHistoryOpen(false);
    abortRef.current?.abort();
    const { data, error } = await supabase
      .from("nova_messages")
      .select("role, content, attachments")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      setError("Could not load that chat.");
      return;
    }
    setChatId(id);
    setMessages(
      (data || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }))
    );
    setError(null);
    setPendingAttachments([]);
  };

  const deleteSavedChat = async (id: string) => {
    if (!confirm("Delete this chat?")) return;
    await supabase.from("nova_chats").delete().eq("id", id);
    if (chatId === id) {
      setChatId(null);
      setMessages([]);
    }
    loadSavedChats();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in to attach files.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          setError(`${file.name} is over ${MAX_FILE_MB}MB.`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("nova-uploads")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`Upload failed for ${file.name}: ${upErr.message}`);
          continue;
        }
        uploaded.push({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          path,
        });
      }
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } finally {
      setIsUploading(false);
    }
  };

  const removePending = (path: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.path !== path));
  };

  const send = async (text: string, atts?: Attachment[]) => {
    const trimmed = text.trim();
    const attachments = atts ?? pendingAttachments;
    if ((!trimmed && attachments.length === 0) || isStreaming) return;
    setError(null);
    setInput("");
    setPendingAttachments([]);

    const userMsg: Msg = { role: "user", content: trimmed, attachments };
    const next = [...messages, userMsg];
    setMessages(next);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          chat_id: chatId,
          attachments,
        }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        setError("Rate limit reached. Please wait a moment.");
        setIsStreaming(false);
        return;
      }
      if (resp.status === 402) {
        setError("AI credits exhausted. Please add credits in workspace settings.");
        setIsStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        setError("Could not reach the assistant. Please try again.");
        setIsStreaming(false);
        return;
      }

      // Capture chat id from response header
      const returnedChatId = resp.headers.get("x-chat-id");
      if (returnedChatId && returnedChatId !== chatId) setChatId(returnedChatId);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistant += delta;
              setMessages((prev) =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistant } : m))
              );
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      // Refresh saved chat list so the new/updated chat appears
      loadSavedChats();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setPendingAttachments([]);
    setChatId(null);
    setError(null);
    setIsStreaming(false);
  };

  const rawFirst = userName.split(" ")[0] || "there";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);

  return (
    <section className="mb-8">
      {messages.length === 0 ? (
        <div className="text-center mb-4 flex items-center justify-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Hey {firstName} — what's on your mind?
          </h2>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Nova · your ops partner</span>
          </div>
          <div className="flex items-center gap-1">
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4 mr-1" /> Saved chats
                </Button>
              </SheetTrigger>
              <SavedChatsPanel
                chats={savedChats}
                activeId={chatId}
                onOpen={openSavedChat}
                onDelete={deleteSavedChat}
              />
            </Sheet>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4 mr-1" /> New chat
            </Button>
          </div>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex justify-center mb-3">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <History className="h-4 w-4 mr-1" /> Saved chats
              </Button>
            </SheetTrigger>
            <SavedChatsPanel
              chats={savedChats}
              activeId={chatId}
              onOpen={openSavedChat}
              onDelete={deleteSavedChat}
            />
          </Sheet>
        </div>
      )}

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="rounded-xl border border-border bg-card/40 p-4 mb-3 max-h-[400px] overflow-y-auto space-y-4"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm space-y-2 ${
                  m.role === "user" ? "bg-white text-black" : "bg-muted text-foreground"
                }`}
              >
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.attachments.map((a) => (
                      <span
                        key={a.path}
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                          m.role === "user" ? "border-black/20 bg-black/5" : "border-border bg-background/40"
                        }`}
                      >
                        {a.type.startsWith("image/") ? (
                          <ImageIcon className="h-3 w-3" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-headings:my-2">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  m.content && <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingAttachments.map((a) => (
              <span
                key={a.path}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border bg-card/60"
              >
                {a.type.startsWith("image/") ? (
                  <ImageIcon className="h-3 w-3" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                <span className="max-w-[160px] truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => removePending(a.path)}
                  className="opacity-60 hover:opacity-100"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-2.5 focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-colors [&_*::selection]:bg-white [&_*::selection]:text-black">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isStreaming}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-50"
            aria-label="Attach files"
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isUploading ? "Uploading…" : "Talk to Nova…"}
            disabled={isStreaming}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && pendingAttachments.length === 0) || isStreaming || isUploading}
            className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Send"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-2 px-2">{error}</p>}
      </form>

      {messages.length === 0 && (
        <div className="mt-4 -mx-2 overflow-x-auto scrollbar-hide">
          <div className="flex flex-nowrap gap-2 px-2 w-max mx-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="shrink-0 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-white focus-visible:outline-none focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const SavedChatsPanel = ({
  chats,
  activeId,
  onOpen,
  onDelete,
}: {
  chats: SavedChat[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <SheetContent side="right" className="w-[360px] sm:w-[420px] bg-card border-border">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <History className="h-4 w-4" /> Saved chats
        </SheetTitle>
      </SheetHeader>
      <div className="mt-6 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
        {chats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No saved chats yet. Start a conversation and it'll be saved here automatically.
          </p>
        ) : (
          chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                activeId === c.id
                  ? "border-white bg-card"
                  : "border-border bg-card/40 hover:border-white/50"
              }`}
              onClick={() => onOpen(c.id)}
            >
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(c.last_message_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))
        )}
      </div>
    </SheetContent>
  );
};

export default MasterChatBar;
