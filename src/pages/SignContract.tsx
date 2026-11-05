import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, FileText, ShieldCheck } from "lucide-react";

interface Field {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  position: number;
  value: string | null;
}

interface ContractData {
  id: string;
  title: string;
  description: string | null;
  recipient_name: string;
  recipient_email: string;
  amount_cents: number | null;
  payment_terms: string | null;
  expires_at: string | null;
  document_path: string;
  document_name: string;
  document_mime: string | null;
  status: string;
  signed_at: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PUB_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SignContract = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [docUrl, setDocUrl] = useState<string>("");
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/contract-sign?action=get&token=${token}`, {
          headers: { Authorization: `Bearer ${PUB_KEY}`, apikey: PUB_KEY },
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setContract(data.contract);
        setDocUrl(data.documentUrl || "");
        setFields(data.fields || []);
        const initial: Record<string, string> = {};
        for (const f of data.fields || []) initial[f.id] = f.value || "";
        setFieldValues(initial);
      } catch (e: any) {
        toast.error(e.message || "Could not load contract");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#fff";
  }, [signatureMode, contract]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent) => {
    drawing.current = true;
    lastPos.current = getPos(e);
    hasDrawn.current = true;
  };
  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPos.current = p;
  };
  const endDraw = () => {
    drawing.current = false;
    lastPos.current = null;
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  const buildTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 150;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "italic 56px 'Brush Script MT', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 20, 75);
    return canvas.toDataURL("image/png");
  };

  const handleSubmit = async () => {
    if (!agreed) return toast.error("You must agree to sign");
    if (!typedName.trim()) return toast.error("Type your full legal name");

    let signatureDataUrl = "";
    if (signatureMode === "draw") {
      if (!hasDrawn.current) return toast.error("Please draw your signature");
      signatureDataUrl = canvasRef.current!.toDataURL("image/png");
    } else {
      signatureDataUrl = buildTypedSignature();
    }

    // Validate required fields
    for (const f of fields) {
      if (f.required && !fieldValues[f.id]?.toString().trim()) {
        return toast.error(`Please fill: ${f.label}`);
      }
    }

    setSubmitting(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/contract-sign?action=sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUB_KEY}`,
          apikey: PUB_KEY,
        },
        body: JSON.stringify({
          token,
          signatureDataUrl,
          typedName: typedName.trim(),
          fieldValues: fields.map((f) => ({ id: f.id, value: fieldValues[f.id] || "" })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      toast.success("Contract signed successfully");
      setContract((c) => (c ? { ...c, status: "signed", signed_at: new Date().toISOString() } : c));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Contract not found.</p>
      </div>
    );
  }

  const isSigned = contract.status === "signed";

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Forti Contract</h1>
            <p className="text-sm text-muted-foreground">Secure document signing</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{contract.title}</h2>
              {contract.description && <p className="text-sm text-muted-foreground mt-1">{contract.description}</p>}
            </div>
            <span className={`text-[10px] px-2 py-1 rounded uppercase tracking-wider ${isSigned ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
              {contract.status}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm pt-2">
            <div><span className="text-muted-foreground">For:</span> {contract.recipient_name}</div>
            <div><span className="text-muted-foreground">Email:</span> {contract.recipient_email}</div>
            {contract.amount_cents != null && (
              <div><span className="text-muted-foreground">Amount:</span> ${(contract.amount_cents / 100).toFixed(2)}</div>
            )}
            {contract.payment_terms && (
              <div><span className="text-muted-foreground">Terms:</span> {contract.payment_terms}</div>
            )}
            {contract.expires_at && (
              <div><span className="text-muted-foreground">Expires:</span> {new Date(contract.expires_at).toLocaleDateString()}</div>
            )}
          </div>
        </div>

        {docUrl && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-muted/30">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{contract.document_name}</span>
              <a href={docUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs text-primary hover:underline">Open in new tab</a>
            </div>
            {contract.document_mime?.includes("pdf") || contract.document_name.toLowerCase().endsWith(".pdf") ? (
              <iframe src={docUrl} className="w-full h-[600px] bg-background" title="Contract" />
            ) : contract.document_mime?.startsWith("image/") ? (
              <img src={docUrl} alt={contract.document_name} className="w-full" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                Preview not available. <a href={docUrl} target="_blank" rel="noreferrer" className="text-primary underline">Download document</a> to review.
              </div>
            )}
          </div>
        )}

        {fields.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Required Information</h3>
            {fields.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label className="text-sm">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </Label>
                {f.field_type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={fieldValues[f.id] === "true"}
                      disabled={isSigned}
                      onCheckedChange={(v) => setFieldValues((p) => ({ ...p, [f.id]: v ? "true" : "" }))}
                    />
                    <span className="text-sm text-muted-foreground">I confirm</span>
                  </div>
                ) : (
                  <Input
                    type={f.field_type === "date" ? "date" : f.field_type === "number" ? "number" : "text"}
                    disabled={isSigned}
                    value={fieldValues[f.id] || ""}
                    onChange={(e) => setFieldValues((p) => ({ ...p, [f.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {!isSigned ? (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Your Signature</h3>

            <Tabs value={signatureMode} onValueChange={(v) => setSignatureMode(v as "draw" | "type")}>
              <TabsList>
                <TabsTrigger value="draw">Draw</TabsTrigger>
                <TabsTrigger value="type">Type</TabsTrigger>
              </TabsList>
              <TabsContent value="draw" className="space-y-2">
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                  className="w-full h-40 rounded border border-border bg-background touch-none cursor-crosshair"
                />
                <Button variant="ghost" size="sm" onClick={clearCanvas}>Clear</Button>
              </TabsContent>
              <TabsContent value="type">
                <div className="h-40 rounded border border-border bg-background flex items-center justify-center px-4">
                  <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: "48px", fontStyle: "italic" }}>
                    {typedName || "Your signature"}
                  </span>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-1.5">
              <Label>Full legal name *</Label>
              <Input value={typedName} onChange={(e) => setTypedName(e.target.value)} placeholder="Type your full legal name" />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
              <Label htmlFor="agree" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree that my electronic signature has the same legal effect as a handwritten signature, and I have reviewed the document above.
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !agreed} className="w-full" variant="forti">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign Contract
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
            <ShieldCheck className="h-10 w-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm">
              Signed on {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : ""}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">A copy has been recorded by Forti.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignContract;
