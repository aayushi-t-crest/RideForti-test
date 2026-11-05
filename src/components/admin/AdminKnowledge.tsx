import { useState, useEffect } from "react";
import { adminApi } from "@/lib/adminApi";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff, Link2, Paperclip, X, Upload } from "lucide-react";

interface Attachment { name: string; url: string }
interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  is_active: boolean;
  links?: string[];
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
}

const categories = [
  { value: "general", label: "General" },
  { value: "services", label: "Services" },
  { value: "pricing", label: "Pricing" },
  { value: "security", label: "Security" },
  { value: "drivers", label: "Drivers" },
  { value: "guards", label: "Guards" },
  { value: "faq", label: "FAQ" },
  { value: "policies", label: "Policies" },
  { value: "technical", label: "Technical" },
];

const AdminKnowledge = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<{ title: string; category: string; content: string; links: string[]; attachments: Attachment[] }>({ title: "", category: "general", content: "", links: [], attachments: [] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getKnowledge();
      setArticles(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingArticle(null);
    setForm({ title: "", category: "general", content: "", links: [], attachments: [] });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (article: Article) => {
    setEditingArticle(article);
    setForm({
      title: article.title,
      category: article.category,
      content: article.content,
      links: Array.isArray(article.links) ? article.links : [],
      attachments: Array.isArray(article.attachments) ? article.attachments : [],
    });
    setError("");
    setDialogOpen(true);
  };

  const addLink = () => setForm((f) => ({ ...f, links: [...f.links, ""] }));
  const updateLink = (i: number, val: string) =>
    setForm((f) => ({ ...f, links: f.links.map((l, idx) => (idx === i ? val : l)) }));
  const removeLink = (i: number) =>
    setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: Attachment[] = [];
      for (const file of files) {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("knowledge-files").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("knowledge-files").getPublicUrl(path);
        uploaded.push({ name: file.name, url: pub.publicUrl });
      }
      setForm((f) => ({ ...f, attachments: [...f.attachments, ...uploaded] }));
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeAttachment = (i: number) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const cleanedLinks = form.links.map((l) => l.trim()).filter(Boolean);
      if (editingArticle) {
        await adminApi.updateKnowledge(editingArticle.id, {
          title: form.title,
          category: form.category,
          content: form.content,
          links: cleanedLinks,
          attachments: form.attachments,
        });
      } else {
        await adminApi.createKnowledge(form.title, form.category, form.content, {
          links: cleanedLinks,
          attachments: form.attachments,
        });
      }
      setDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this knowledge article?")) return;
    try {
      await adminApi.deleteKnowledge(id);
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleActive = async (article: Article) => {
    try {
      await adminApi.updateKnowledge(article.id, { is_active: !article.is_active });
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, is_active: !a.is_active } : a))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = articles.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || a.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedByCategory = filtered.reduce<Record<string, Article[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} articles</span>
          <Button variant="fortiGhost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="forti" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Article
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Articles added here serve as the source of truth for Forti's AI support assistant and overall platform knowledge.
      </p>

      {loading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No knowledge articles yet.</p>
          <p className="text-xs mt-1">Add articles to build Forti's source of truth.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {categories.find((c) => c.value === category)?.label || category}
              </h3>
              <div className="space-y-2">
                {items.map((article) => (
                  <div
                    key={article.id}
                    className={`rounded-lg border border-border bg-card p-4 transition-opacity ${
                      !article.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{article.title}</h4>
                          {!article.is_active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {new Date(article.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="fortiGhost"
                          size="sm"
                          onClick={() => handleToggleActive(article)}
                          title={article.is_active ? "Deactivate" : "Activate"}
                        >
                          {article.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button variant="fortiGhost" size="sm" onClick={() => openEdit(article)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="fortiGhost"
                          size="sm"
                          onClick={() => handleDelete(article.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? "Edit Article" : "Add Knowledge Article"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Article content — this is what the AI support assistant will reference when answering questions..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              required
              rows={10}
              className="resize-y"
            />

            {/* Reference Links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Reference Links
                </label>
                <Button type="button" variant="fortiGhost" size="sm" onClick={addLink}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Link
                </Button>
              </div>
              {form.links.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add URLs the AI can reference (docs, articles, dashboards).</p>
              ) : (
                <div className="space-y-2">
                  {form.links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/resource"
                        value={link}
                        onChange={(e) => updateLink(i, e.target.value)}
                      />
                      <Button type="button" variant="fortiGhost" size="sm" onClick={() => removeLink(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> File Attachments
                </label>
                <label className="cursor-pointer">
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
                    <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading..." : "Upload Files"}
                  </span>
                </label>
              </div>
              {form.attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Upload PDFs, docs, or images for the AI to reference.</p>
              ) : (
                <div className="space-y-2">
                  {form.attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                      <a href={att.url} target="_blank" rel="noreferrer" className="text-sm truncate hover:underline flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{att.name}</span>
                      </a>
                      <Button type="button" variant="fortiGhost" size="sm" onClick={() => removeAttachment(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="forti" className="w-full" disabled={saving}>
              {saving ? "Saving..." : editingArticle ? "Update Article" : "Add Article"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminKnowledge;
