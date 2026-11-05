import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Brain,
  Lock,
  Plus,
  Upload,
  RefreshCw,
  Trash2,
  Sparkles,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Search,
  Pencil,
  PlayCircle,
} from "lucide-react";
import KbWalkthrough from "./KbWalkthrough";

type Entry = {
  id: string;
  title: string;
  summary: string | null;
  source_type: string;
  source_ref: string | null;
  category: string | null;
  tags: string[];
  reinforcement_score: number;
  upvotes: number;
  downvotes: number;
  is_active: boolean;
  review_status?: "pending" | "approved" | "denied";
  denied_reason?: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  ingest_status: string;
  uploaded_by_name: string | null;
  created_at: string;
};

type Correction = {
  id: string;
  entry_id: string | null;
  rule: string;
  reason: string | null;
  applies_globally: boolean;
  created_by_name: string | null;
  created_at: string;
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  faq: "FAQ answer",
  chat: "Chat session",
  file: "Uploaded file",
  "module:knowledge_articles": "Knowledge Center",
  "module:faq_patterns": "FAQ patterns",
  "module:academy_lessons": "Academy",
};

async function callKb(action: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-kb?action=${action}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export default function AdminSupportKnowledge() {
  const { user, loading: authLoading } = useAuth();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [globalCorrections, setGlobalCorrections] = useState<Correction[]>([]);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "approved" | "denied">("approved");
  const [counts, setCounts] = useState({ pending: 0, approved: 0, denied: 0 });
  const [loading, setLoading] = useState(false);
  const [syncingModules, setSyncingModules] = useState(false);
  const [denyDialog, setDenyDialog] = useState<{ id: string; title: string } | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<{
    id?: string;
    title: string;
    content: string;
    category: string;
    tags: string;
    is_active: boolean;
  }>({ title: "", content: "", category: "", tags: "", is_active: true });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<{ entry: Entry; corrections: Correction[]; feedback: any[] } | null>(null);
  const [correctionDraft, setCorrectionDraft] = useState({ rule: "", reason: "", applies_globally: false });

  const [uploading, setUploading] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);


  // ---------- access gate ----------
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve before deciding
    (async () => {
      if (!user) {
        setAccessChecked(true);
        setHasAccess(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data || []).map((r) => r.role);
      const admin = roles.includes("admin");
      const supervisor = roles.includes("supervisor" as any);
      setIsAdmin(admin);
      setHasAccess(admin || supervisor);
      setAccessChecked(true);
    })();
  }, [user, authLoading]);

  // ---------- load entries / files ----------
  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, f, c] = await Promise.all([
        callKb("list", { source_type: sourceFilter, search, review_status: reviewFilter }),
        callKb("list-files"),
        callKb("list-corrections", { only_global: true }),
      ]);
      setEntries(e.entries || []);
      if (e.counts) setCounts(e.counts);
      setFiles(f.files || []);
      setGlobalCorrections(c.corrections || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, sourceFilter, reviewFilter]);

  // ---------- gates ----------
  if (!accessChecked) {
    return (
      <div className="p-8 text-center text-muted-foreground">Checking access…</div>
    );
  }
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Restricted area</h2>
        <p className="text-muted-foreground">
          You don't have access to the AI Knowledge Base. Only admins and supervisors can view or edit it.
        </p>
      </div>
    );
  }

  // ---------- handlers ----------
  const openCreate = () => {
    setEditor({ title: "", content: "", category: "", tags: "", is_active: true });
    setEditorOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditor({
      id: e.id,
      title: e.title,
      content: "", // load on save? simpler: fetch
      category: e.category || "",
      tags: (e.tags || []).join(", "),
      is_active: e.is_active,
    });
    callKb("get", { id: e.id }).then((r) => {
      setEditor((d) => ({ ...d, content: r.entry.content }));
    });
    setEditorOpen(true);
  };

  const saveEntry = async () => {
    if (!editor.content.trim()) {
      toast.error("Content is required");
      return;
    }
    try {
      const action = editor.id ? "update" : "create";
      await callKb(action, {
        id: editor.id,
        title: editor.title.trim() || undefined,
        content: editor.content,
        category: editor.category.trim() || null,
        tags: editor.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_active: editor.is_active,
        source_type: editor.id ? undefined : "manual",
      });
      toast.success(editor.id ? "Entry updated" : "Entry added — AI is learning");
      setEditorOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Delete this entry? The AI will forget it.")) return;
    try {
      await callKb("delete", { id });
      toast.success("Deleted");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openDetail = async (e: Entry) => {
    try {
      const r = await callKb("get", { id: e.id });
      setDetail(r);
      setCorrectionDraft({ rule: "", reason: "", applies_globally: false });
      setDetailOpen(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addCorrection = async () => {
    if (!correctionDraft.rule.trim()) {
      toast.error("Rule is required");
      return;
    }
    try {
      await callKb("add-correction", {
        entry_id: detail?.entry.id ?? null,
        rule: correctionDraft.rule.trim(),
        reason: correctionDraft.reason.trim() || null,
        applies_globally: correctionDraft.applies_globally,
      });
      toast.success("Reinforcement added");
      setCorrectionDraft({ rule: "", reason: "", applies_globally: false });
      if (detail) {
        const r = await callKb("get", { id: detail.entry.id });
        setDetail(r);
      }
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const syncModules = async () => {
    setSyncingModules(true);
    try {
      const r = await callKb("ingest-from-modules", {
        sources: ["knowledge_articles", "faq_patterns", "academy_lessons"],
      });
      toast.success(`Synced ${r.count} entries from other modules`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncingModules(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Max file size is 20MB");
      return;
    }
    setUploading(true);
    try {
      // Read text content (for plain-text formats); binary formats get warning
      const isText = /\.(txt|md|csv|json|html|log|tsv|yaml|yml|xml)$/i.test(file.name) ||
        file.type.startsWith("text/");
      let textContent = "";
      if (isText) {
        textContent = await file.text();
      } else {
        toast.message("Binary file detected", {
          description: "Only the filename and metadata will be stored. For PDFs/DOCX, paste content into a manual entry for full ingestion.",
        });
      }

      // Upload to storage
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("support-kb-files")
        .upload(path, file);
      if (upErr) throw upErr;

      if (textContent.trim()) {
        await callKb("ingest-file", {
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          text_content: textContent,
        });
        toast.success("File ingested — AI is now smarter");
      } else {
        toast.success("File uploaded (not ingested — text content empty)");
      }
      loadAll();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteFile = async (id: string) => {
    if (!isAdmin) {
      toast.error("Only admins can delete files");
      return;
    }
    if (!confirm("Delete this file and all entries it created?")) return;
    try {
      await callKb("delete-file", { id });
      toast.success("Removed");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const approveEntry = async (id: string) => {
    try {
      await callKb("approve", { id });
      toast.success("Approved — added to AI memory");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitDeny = async () => {
    if (!denyDialog) return;
    if (!denyReason.trim()) {
      toast.error("Tell the AI why this is wrong");
      return;
    }
    try {
      await callKb("deny", { id: denyDialog.id, reason: denyReason.trim() });
      toast.success("Denied — reason saved as reinforcement");
      setDenyDialog(null);
      setDenyReason("");
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ---------- render ----------
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Brain className="h-7 w-7 text-white" />
            AI Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Train the support AI. Add documents, paste context, and reinforce its answers.
            FAQ answers and chat sessions are auto-ingested.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWalkthroughOpen(true)}
            className="relative overflow-hidden border-transparent text-background bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 hover:from-slate-200 hover:via-white hover:to-slate-300 bg-[length:200%_100%] animate-shimmer font-medium"
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Walkthrough
          </Button>
          <Button variant="outline" onClick={syncModules} disabled={syncingModules}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncingModules ? "animate-spin" : ""}`} />
            Sync from modules
          </Button>
          <Button onClick={openCreate} className="bg-white text-black hover:bg-white/90">
            <Plus className="h-4 w-4 mr-2" />
            Add entry
          </Button>
        </div>
      </div>

      <KbWalkthrough open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} />

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="rules">
            <ShieldAlert className="h-4 w-4 mr-1" />
            Global rules ({globalCorrections.length})
          </TabsTrigger>
        </TabsList>

        {/* ---------------- ENTRIES ---------------- */}
        <TabsContent value="entries" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              {([
                { k: "approved", label: `Approved (${counts.approved})` },
                { k: "pending", label: `Pending (${counts.pending})` },
                { k: "denied", label: `Denied (${counts.denied})` },
                { k: "all", label: "All" },
              ] as const).map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setReviewFilter(k)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    reviewFilter === k
                      ? k === "pending"
                        ? "bg-amber-500/20 text-amber-300"
                        : k === "denied"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title or summary…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadAll()}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {reviewFilter === "pending" && counts.pending > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              These entries were auto-ingested from FAQs, chats, or the daily sync. Approve to add them to the AI's memory, or deny with a reason so it learns what not to say.
            </div>
          )}

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          ) : entries.length === 0 ? (
            <Card className="p-12 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No entries here.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {entries.map((e) => (
                <Card
                  key={e.id}
                  className={`p-4 hover:border-primary/50 transition-colors cursor-pointer ${
                    e.review_status === "pending" ? "border-amber-500/40" : ""
                  } ${e.review_status === "denied" ? "border-red-500/30 opacity-70" : ""}`}
                  onClick={() => openDetail(e)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium">{e.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {SOURCE_LABELS[e.source_type] || e.source_type}
                        </Badge>
                        {e.review_status === "pending" && (
                          <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/40">Pending review</Badge>
                        )}
                        {e.review_status === "denied" && (
                          <Badge className="text-xs bg-red-500/20 text-red-300 border-red-500/40">Denied</Badge>
                        )}
                        {e.review_status === "approved" && !e.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {e.summary && <p className="text-sm text-muted-foreground line-clamp-2">{e.summary}</p>}
                      {e.denied_reason && (
                        <p className="text-xs text-red-300 mt-1">Denied reason: {e.denied_reason}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{e.upvotes}</span>
                        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{e.downvotes}</span>
                        <span>Score: {e.reinforcement_score}</span>
                        {e.created_by_name && <span>· {e.created_by_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 items-center" onClick={(ev) => ev.stopPropagation()}>
                      {e.review_status === "pending" && (
                        <>
                          <Button size="sm" variant="default" onClick={() => approveEntry(e.id)}>
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setDenyDialog({ id: e.id, title: e.title }); setDenyReason(""); }}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => deleteEntry(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- FILES ---------------- */}
        <TabsContent value="files" className="space-y-4">
          <Card className="p-6 border-dashed">
            <label className="flex flex-col items-center gap-3 cursor-pointer">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Upload a file to teach the AI</p>
                <p className="text-sm text-muted-foreground">
                  .txt, .md, .csv, .json, .html, .log, .yaml, .xml — up to 20MB
                </p>
              </div>
              <Input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button asChild disabled={uploading} className="bg-white text-black hover:bg-white/90">
                <span>{uploading ? "Uploading…" : "Choose file"}</span>
              </Button>
            </label>
          </Card>

          {files.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No files uploaded yet.</p>
          ) : (
            <div className="grid gap-2">
              {files.map((f) => (
                <Card key={f.id} className="p-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.uploaded_by_name || "—"} · {new Date(f.created_at).toLocaleString()} · {(f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : "")}
                    </p>
                  </div>
                  <Badge variant={f.ingest_status === "done" ? "default" : "secondary"}>
                    {f.ingest_status}
                  </Badge>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => deleteFile(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- GLOBAL RULES ---------------- */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-2">Add a global rule</h3>
            <p className="text-sm text-muted-foreground mb-3">
              These reinforcement rules apply to every AI answer (e.g. "Always say X. Never say Y.").
            </p>
            <div className="space-y-2">
              <Textarea
                placeholder="Rule the AI must follow…"
                value={correctionDraft.applies_globally ? correctionDraft.rule : ""}
                onChange={(e) => setCorrectionDraft({ ...correctionDraft, rule: e.target.value, applies_globally: true })}
                rows={3}
              />
              <Input
                placeholder="Why (optional)"
                value={correctionDraft.applies_globally ? correctionDraft.reason : ""}
                onChange={(e) => setCorrectionDraft({ ...correctionDraft, reason: e.target.value, applies_globally: true })}
              />
              <Button
                onClick={() => {
                  setCorrectionDraft((d) => ({ ...d, applies_globally: true }));
                  addCorrection();
                }}
                disabled={!correctionDraft.rule.trim() || !correctionDraft.applies_globally}
                className="bg-white text-black hover:bg-white/90"
              >
                Add global rule
              </Button>
            </div>
          </Card>
          {globalCorrections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No global rules yet.</p>
          ) : (
            <div className="grid gap-2">
              {globalCorrections.map((c) => (
                <Card key={c.id} className="p-3">
                  <p className="font-medium">{c.rule}</p>
                  {c.reason && <p className="text-sm text-muted-foreground mt-1">{c.reason}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {c.created_by_name || "—"} · {new Date(c.created_at).toLocaleString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---------------- EDITOR DIALOG ---------------- */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editor.id ? "Edit entry" : "Add knowledge entry"}</DialogTitle>
            <DialogDescription>
              The AI will summarize, tag, and embed this content automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title (optional — AI will generate)</Label>
              <Input value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                value={editor.content}
                onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                rows={10}
                placeholder="Paste documentation, policy text, FAQ, training material…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })} />
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={editor.tags} onChange={(e) => setEditor({ ...editor, tags: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry}>{editor.id ? "Save changes" : "Add to KB"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- DETAIL DIALOG ---------------- */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.entry.title}
                  <Badge variant="secondary">{SOURCE_LABELS[detail.entry.source_type] || detail.entry.source_type}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {detail.entry.created_by_name} · {new Date(detail.entry.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Content</Label>
                    <div className="mt-1 p-3 bg-muted/30 rounded text-sm whitespace-pre-wrap">{(detail.entry as any).content}</div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Reinforcement rules ({detail.corrections.length})</Label>
                    <div className="space-y-2 mt-2">
                      {detail.corrections.map((c) => (
                        <Card key={c.id} className="p-3">
                          <p className="font-medium text-sm">{c.rule}</p>
                          {c.reason && <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>}
                          {c.applies_globally && <Badge variant="outline" className="mt-1 text-xs">Global</Badge>}
                        </Card>
                      ))}
                      <Card className="p-3 border-dashed">
                        <Textarea
                          placeholder="Add a reinforcement rule for this entry…"
                          value={!correctionDraft.applies_globally ? correctionDraft.rule : ""}
                          onChange={(e) => setCorrectionDraft({ ...correctionDraft, rule: e.target.value, applies_globally: false })}
                          rows={2}
                        />
                        <Input
                          className="mt-2"
                          placeholder="Why (optional)"
                          value={!correctionDraft.applies_globally ? correctionDraft.reason : ""}
                          onChange={(e) => setCorrectionDraft({ ...correctionDraft, reason: e.target.value, applies_globally: false })}
                        />
                        <Button size="sm" className="mt-2" onClick={addCorrection} disabled={!correctionDraft.rule.trim()}>
                          Add rule
                        </Button>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs uppercase text-muted-foreground">Recent feedback ({detail.feedback.length})</Label>
                    <div className="space-y-1 mt-2">
                      {detail.feedback.slice(0, 10).map((f: any) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          {f.rating === 1 ? (
                            <ThumbsUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ThumbsDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className="text-muted-foreground">{f.rated_by_name || "—"}</span>
                          {f.context && <span className="text-xs text-muted-foreground italic">"{f.context}"</span>}
                        </div>
                      ))}
                      {detail.feedback.length === 0 && <p className="text-xs text-muted-foreground">No feedback yet.</p>}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deny reason dialog */}
      <Dialog open={!!denyDialog} onOpenChange={(o) => !o && setDenyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny entry</DialogTitle>
            <DialogDescription>
              Tell the AI why "{denyDialog?.title}" is wrong. Your reason becomes a reinforcement rule so it learns what not to say.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. This answer is outdated — pricing changed in March 2026."
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDeny}>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Deny & reinforce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
