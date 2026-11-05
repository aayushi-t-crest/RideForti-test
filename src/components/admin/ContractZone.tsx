import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSignature, Plus, Send, Trash2, Copy, Check, Loader2, Upload, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  title: string;
  description: string | null;
  amount_cents: number | null;
  payment_terms: string | null;
  expires_at: string | null;
  document_name: string;
  status: string;
  sign_token: string;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
}

interface DraftField {
  id: string;
  label: string;
  field_type: "text" | "date" | "number" | "checkbox";
  required: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400",
  viewed: "bg-amber-500/20 text-amber-400",
  signed: "bg-green-500/20 text-green-400",
  expired: "bg-destructive/20 text-destructive",
};

const ContractZone = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<DraftField[]>([]);

  const loadContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setContracts(data as Contract[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const resetForm = () => {
    setRecipientName(""); setRecipientEmail(""); setRecipientPhone("");
    setTitle(""); setDescription(""); setAmount(""); setPaymentTerms("");
    setExpiresAt(""); setFile(null); setFields([]);
  };

  const addField = () => {
    setFields((p) => [...p, { id: crypto.randomUUID(), label: "", field_type: "text", required: true }]);
  };
  const updateField = (id: string, patch: Partial<DraftField>) => {
    setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeField = (id: string) => setFields((p) => p.filter((f) => f.id !== id));

  const handleCreate = async (sendNow: boolean) => {
    if (!recipientName.trim() || !recipientEmail.trim() || !recipientPhone.trim() || !title.trim() || !file) {
      return toast.error("Recipient, title, and document are required");
    }
    setSubmitting(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${token}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const amountCents = amount ? Math.round(parseFloat(amount) * 100) : null;
      const { data: created, error: insErr } = await supabase
        .from("contracts")
        .insert({
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          recipient_phone: recipientPhone.trim(),
          title: title.trim(),
          description: description.trim() || null,
          amount_cents: amountCents,
          payment_terms: paymentTerms.trim() || null,
          expires_at: expiresAt || null,
          document_path: path,
          document_name: file.name,
          document_mime: file.type,
          sign_token: token,
          status: "draft",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      if (fields.length > 0) {
        const { error: fErr } = await supabase.from("contract_custom_fields").insert(
          fields.map((f, i) => ({
            contract_id: created.id,
            label: f.label.trim() || `Field ${i + 1}`,
            field_type: f.field_type,
            required: f.required,
            position: i,
          }))
        );
        if (fErr) throw fErr;
      }

      if (sendNow) {
        const { error: sendErr } = await supabase.functions.invoke("contract-send", {
          body: { contractId: created.id },
        });
        if (sendErr) throw sendErr;
        toast.success("Contract sent via email and SMS");
      } else {
        toast.success("Contract saved as draft");
      }

      setOpenDialog(false);
      resetForm();
      loadContracts();
    } catch (e: any) {
      toast.error(e.message || "Failed to create contract");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke("contract-send", { body: { contractId: id } });
      if (error) throw error;
      toast.success("Contract sent");
      loadContracts();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contract? This cannot be undone.")) return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadContracts();
  };

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/contract/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Contract Zone</h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {contracts.length} contract{contracts.length === 1 ? "" : "s"}
          </span>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button variant="forti" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover">
            <DialogHeader>
              <DialogTitle>New Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Recipient name *</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recipient email *</Label>
                  <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Recipient phone *</Label>
                  <Input placeholder="+15551234567" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expires</Label>
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contract title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Driver Independent Contractor Agreement" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Amount (USD)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment terms</Label>
                  <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Contract document * (PDF, image, DOCX)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded border border-dashed border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {file ? file.name : "Choose file"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {file && (
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Custom signer fields (optional)</Label>
                  <Button variant="fortiGhost" size="sm" onClick={addField}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add field
                  </Button>
                </div>
                {fields.map((f) => (
                  <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-6"
                      placeholder="Field label (e.g. Vehicle ID)"
                      value={f.label}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                    />
                    <Select value={f.field_type} onValueChange={(v) => updateField(f.id, { field_type: v as any })}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-[9999]">
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="col-span-2 flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} />
                      Required
                    </label>
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeField(f.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button variant="fortiGhost" onClick={() => setOpenDialog(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="fortiOutline" onClick={() => handleCreate(false)} disabled={submitting}>
                  Save Draft
                </Button>
                <Button variant="forti" onClick={() => handleCreate(true)} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Save & Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <FileSignature className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No contracts yet.</p>
          <p className="text-xs text-muted-foreground">Upload a document and send it for signature.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileSignature className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 grid gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${STATUS_COLORS[c.status] || "bg-muted text-muted-foreground"}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="truncate">{c.recipient_name}</span>
                  <span className="truncate">{c.recipient_email}</span>
                  {c.amount_cents != null && <span>${(c.amount_cents / 100).toFixed(2)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => copyLink(c.sign_token, c.id)}
                  title="Copy signing link"
                >
                  {copiedId === c.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => window.open(`/contract/${c.sign_token}`, "_blank")}
                  title="Open signing page"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
                {c.status !== "signed" && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => handleSend(c.id)}
                    title="Send / resend"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(c.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContractZone;
