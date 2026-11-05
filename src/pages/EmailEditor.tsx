import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  ChevronDown,
  ChevronUp,
  Code,
  Edit3,
  Eye,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Plus,
  Save,
  Send,
  Smartphone,
  Trash2,
  Underline as UnderlineIcon,
  Upload,
  GripVertical,
} from "lucide-react";
import DOMPurify from "dompurify";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface BodyBlock {
  id: string;
  type: "text" | "image" | "divider" | "button";
  content: string;
  align: "left" | "center" | "right";
  fontSize?: number;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  imageWidth?: number;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
  enabled: boolean;
}

interface FooterOverlay {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
}

interface TemplateData {
  headerImage: string | null;
  headerBgColor: string;
  footerImage: string | null;
  footerBgColor: string;
  bodyBgColor: string;
  blocks: BodyBlock[];
  socials: SocialLink[];
  socialSize: number;
  socialX: number;
  socialY: number;
  footerOverlays: FooterOverlay[];
  privacyUrl: string;
  termsUrl: string;
  unsubscribeText: string;
  copyrightText: string;
}

const TEMPLATE_STORAGE_KEY = "forti_email_editor_draft_v2";
const TEMPLATE_POINTER_KEY = "forti_email_editor_last_template_id";

const DEFAULT_SOCIALS: SocialLink[] = [
  { platform: "Facebook", url: "", icon: "facebook", enabled: false },
  { platform: "Twitter / X", url: "", icon: "twitter", enabled: false },
  { platform: "Instagram", url: "", icon: "instagram", enabled: true },
  { platform: "LinkedIn", url: "", icon: "linkedin", enabled: false },
  { platform: "Email", url: "", icon: "mail", enabled: false },
];

const templateNameSchema = z.string().trim().min(1).max(120);
const linkInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .refine((value) => {
    try {
      const normalized = /^(https?:|mailto:|tel:)/i.test(value) ? value : `https://${value}`;
      const parsed = new URL(normalized);
      return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, "Enter a valid link");

const createId = () => Math.random().toString(36).slice(2, 9);

const createDefaultBlocks = (): BodyBlock[] => [
  {
    id: createId(),
    type: "text",
    content: "Hello there,<br><br>Welcome to our newsletter! We&rsquo;re excited to have you here.",
    align: "left",
    fontSize: 16,
  },
];

const sanitizeRichText = (value: string) =>
  DOMPurify.sanitize(value || "", {
    ALLOWED_TAGS: ["a", "b", "strong", "i", "em", "u", "br", "div", "p", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });

const normalizeLinkValue = (value: string) =>
  /^(https?:|mailto:|tel:)/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

const resolveOptionalLinkValue = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "#";

  const parsedLink = linkInputSchema.safeParse(trimmed);
  return parsedLink.success ? normalizeLinkValue(parsedLink.data) : "#";
};

const getSocialIconImageUrl = (icon: string) => {
  const iconMap: Record<string, string> = {
    facebook: "facebook-new",
    twitter: "twitterx--v1",
    instagram: "instagram-new--v1",
    linkedin: "linkedin",
    mail: "new-post",
  };
  return `https://img.icons8.com/ios-filled/50/ffffff/${iconMap[icon] || icon}.png`;
};

const decorateEmailLinks = (html: string) =>
  html.replace(
    /<a\s/gi,
    '<a target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;" '
  );

const sanitizeTemplateBlocks = (blocks: unknown): BodyBlock[] => {
  if (!Array.isArray(blocks)) return createDefaultBlocks();

  const normalized = blocks
    .filter((block): block is BodyBlock => !!block && typeof block === "object" && "type" in block)
    .map((block) => ({
      id: typeof block.id === "string" ? block.id : createId(),
      type: ["text", "image", "divider", "button"].includes(block.type) ? block.type : "text",
      content: block.type === "text" ? sanitizeRichText(String(block.content || "")) : String(block.content || ""),
      align: (block.align === "left" || block.align === "right" ? block.align : "center") as BodyBlock["align"],
      fontSize: typeof block.fontSize === "number" ? block.fontSize : 16,
      imageUrl: typeof block.imageUrl === "string" ? block.imageUrl : undefined,
      imageWidth: typeof block.imageWidth === "number" ? block.imageWidth : 100,
      buttonText: typeof block.buttonText === "string" ? block.buttonText : undefined,
      buttonUrl: typeof block.buttonUrl === "string" ? block.buttonUrl : undefined,
      buttonColor: typeof block.buttonColor === "string" ? block.buttonColor : undefined,
    }));

  return normalized.length > 0 ? normalized : createDefaultBlocks();
};

const EmailEditor = () => {
  const { toast } = useToast();
  const { session } = useAuth();

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [templateName, setTemplateName] = useState("Untitled Template");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [, setPreviewSyncTick] = useState(0);

  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [headerBgColor, setHeaderBgColor] = useState("#111111");
  const [footerImage, setFooterImage] = useState<string | null>(null);
  const [footerBgColor, setFooterBgColor] = useState("#111111");
  const [bodyBgColor, setBodyBgColor] = useState("#ffffff");

  const [blocks, setBlocks] = useState<BodyBlock[]>(createDefaultBlocks());
  const [socials, setSocials] = useState<SocialLink[]>(DEFAULT_SOCIALS);
  const [socialSize, setSocialSize] = useState(28);
  const [socialX, setSocialX] = useState(50);
  const [socialY, setSocialY] = useState(30);
  const [footerOverlays, setFooterOverlays] = useState<FooterOverlay[]>([]);

  const [privacyUrl, setPrivacyUrl] = useState("https://rideforti.com/privacy");
  const [termsUrl, setTermsUrl] = useState("https://rideforti.com/terms");
  const [unsubscribeText, setUnsubscribeText] = useState("Unsubscribe | Manage Preferences");
  const [copyrightText, setCopyrightText] = useState("© 2025 Forti. All rights reserved.");

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("body");
  const [dragging, setDragging] = useState<{ type: "social" | "overlay"; id?: string } | null>(null);

  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const blockEditorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const latestSnapshotRef = useRef<string>("");

  const updateBlock = useCallback((id: string, updates: Partial<BodyBlock>) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
  }, []);

  const syncTextBlockFromEditor = useCallback(
    (blockId: string, editorHtml?: string) => {
      const nextHtml = editorHtml ?? blockEditorRefs.current[blockId]?.innerHTML;
      if (typeof nextHtml !== "string") return;

      updateBlock(blockId, { content: sanitizeRichText(nextHtml) });
      setPreviewSyncTick((tick) => tick + 1);
    },
    [updateBlock]
  );

  const buildBlocksForPersistence = useCallback(
    () =>
      blocks.map((block) => {
        if (block.type !== "text") return block;
        const editorHtml = blockEditorRefs.current[block.id]?.innerHTML;
        return {
          ...block,
          content: sanitizeRichText(editorHtml ?? block.content),
        };
      }),
    [blocks]
  );

  const getTemplateData = useCallback(
    (): TemplateData => ({
      headerImage,
      headerBgColor,
      footerImage,
      footerBgColor,
      bodyBgColor,
      blocks: buildBlocksForPersistence(),
      socials,
      socialSize,
      socialX,
      socialY,
      footerOverlays,
      privacyUrl,
      termsUrl,
      unsubscribeText,
      copyrightText,
    }),
    [
      headerImage,
      headerBgColor,
      footerImage,
      footerBgColor,
      bodyBgColor,
      buildBlocksForPersistence,
      socials,
      socialSize,
      socialX,
      socialY,
      footerOverlays,
      privacyUrl,
      termsUrl,
      unsubscribeText,
      copyrightText,
    ]
  );

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (!rawDraft) {
        setDraftHydrated(true);
        return;
      }

      const draft = JSON.parse(rawDraft);
      if (typeof draft.templateName === "string" && draft.templateName.trim()) {
        setTemplateName(draft.templateName);
      }
      if (typeof draft.templateId === "string" && draft.templateId) {
        setTemplateId(draft.templateId);
      }

      setHeaderImage(typeof draft.headerImage === "string" ? draft.headerImage : null);
      setHeaderBgColor(typeof draft.headerBgColor === "string" ? draft.headerBgColor : "#111111");
      setFooterImage(typeof draft.footerImage === "string" ? draft.footerImage : null);
      setFooterBgColor(typeof draft.footerBgColor === "string" ? draft.footerBgColor : "#111111");
      setBodyBgColor(typeof draft.bodyBgColor === "string" ? draft.bodyBgColor : "#ffffff");
      setBlocks(sanitizeTemplateBlocks(draft.blocks));
      setSocials(Array.isArray(draft.socials) ? draft.socials : DEFAULT_SOCIALS);
      setSocialSize(typeof draft.socialSize === "number" ? draft.socialSize : 28);
      setSocialX(typeof draft.socialX === "number" ? draft.socialX : 50);
      setSocialY(typeof draft.socialY === "number" ? draft.socialY : 30);
      setFooterOverlays(Array.isArray(draft.footerOverlays) ? draft.footerOverlays : []);
      setPrivacyUrl(typeof draft.privacyUrl === "string" ? draft.privacyUrl : "https://rideforti.com/privacy");
      setTermsUrl(typeof draft.termsUrl === "string" ? draft.termsUrl : "https://rideforti.com/terms");
      setUnsubscribeText(typeof draft.unsubscribeText === "string" ? draft.unsubscribeText : "Unsubscribe | Manage Preferences");
      setCopyrightText(typeof draft.copyrightText === "string" ? draft.copyrightText : "© 2025 Forti. All rights reserved.");

      toast({ title: "Draft restored", description: "Your last local draft has been loaded." });
    } catch (err) {
      console.error("[EmailEditor] Failed to load draft from localStorage:", err);
      // Don't delete the draft — keep it for manual recovery
      setDraftHydrated(true);
    }
  }, [toast]);

  useEffect(() => {
    latestSnapshotRef.current = JSON.stringify({
      templateId,
      templateName,
      ...getTemplateData(),
    });
  }, [templateId, templateName, getTemplateData]);

  useEffect(() => {
    if (!draftHydrated) return;

    const persistDraft = () => {
      try {
        localStorage.setItem(TEMPLATE_STORAGE_KEY, latestSnapshotRef.current);
      } catch {
        try {
          localStorage.removeItem(TEMPLATE_STORAGE_KEY);
          localStorage.setItem(TEMPLATE_STORAGE_KEY, latestSnapshotRef.current);
        } catch {
          // Storage completely full — skip local save silently
        }
      }
    };

    persistDraft();
    const interval = window.setInterval(persistDraft, 2000);
    window.addEventListener("beforeunload", persistDraft);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", persistDraft);
    };
  }, [draftHydrated]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!footerRef.current) return;
      const rect = footerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

      if (dragging.type === "social") {
        setSocialX(x);
        setSocialY(y);
      }

      if (dragging.type === "overlay" && dragging.id) {
        setFooterOverlays((prev) =>
          prev.map((overlay) => (overlay.id === dragging.id ? { ...overlay, x, y } : overlay))
        );
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, setter: (value: string | null) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBodyImageUpload = (event: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => updateBlock(blockId, { imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleOverlayUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newOverlay: FooterOverlay = {
        id: createId(),
        imageUrl: reader.result as string,
        x: 50,
        y: 50,
        width: 30,
      };
      setFooterOverlays((prev) => [...prev, newOverlay]);
      setActiveOverlayId(newOverlay.id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const addBlock = (type: BodyBlock["type"]) => {
    const newBlock: BodyBlock = {
      id: createId(),
      type,
      content: type === "text" ? "Type your message here" : "",
      align: type === "text" ? "left" : "center",
      fontSize: 16,
      imageWidth: 100,
      buttonText: type === "button" ? "Click Here" : undefined,
      buttonUrl: type === "button" ? "https://" : undefined,
      buttonColor: type === "button" ? "#e63946" : undefined,
    };

    setBlocks((prev) => [...prev, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const removeOverlay = (id: string) => {
    setFooterOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
    if (activeOverlayId === id) setActiveOverlayId(null);
  };

  const formatSelection = (blockId: string, command: string) => {
    document.execCommand(command, false);
    queueMicrotask(() => syncTextBlockFromEditor(blockId));
  };

  const insertLink = (blockId: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) {
      toast({ title: "Select text first", description: "Highlight the words you want to turn into a link.", variant: "destructive" });
      return;
    }

    const savedRange = selection.getRangeAt(0).cloneRange();
    const rawValue = window.prompt("Enter the link URL", "https://");
    if (!rawValue) return;

    const parsedLink = linkInputSchema.safeParse(rawValue);
    if (!parsedLink.success) {
      toast({ title: "Invalid link", description: "Use a valid https, mailto, or tel link.", variant: "destructive" });
      return;
    }

    const normalizedLink = normalizeLinkValue(parsedLink.data);
    selection.removeAllRanges();
    selection.addRange(savedRange);
    document.execCommand("createLink", false, normalizedLink);
    queueMicrotask(() => syncTextBlockFromEditor(blockId));
  };

  const handleSave = async () => {
    console.log("[EmailEditor] handleSave triggered");
    setSaving(true);
    setSaveStatus(null);

    try {
      const parsedName = templateNameSchema.safeParse(templateName.trim() || "Untitled Template");
      if (!parsedName.success) {
        toast({ title: "Invalid name", description: "Please use a shorter template name.", variant: "destructive" });
        setSaveStatus("Name invalid");
        return;
      }

      const normalizedName = parsedName.data;
      const templateData = getTemplateData();
      const localSnapshot = JSON.stringify({
        templateId,
        templateName: normalizedName,
        ...templateData,
      });

      try {
        localStorage.setItem(TEMPLATE_STORAGE_KEY, localSnapshot);
      } catch (storageErr) {
        console.warn("[EmailEditor] localStorage full, clearing and retrying");
        localStorage.removeItem(TEMPLATE_STORAGE_KEY);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, localSnapshot);
      }
      latestSnapshotRef.current = localSnapshot;
      setTemplateName(normalizedName);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession) {
        setSaveStatus("Saved locally");
        toast({ title: "Draft saved ✓", description: "Saved on this device. Sign in to sync it online." });
        return;
      }

      if (templateId) {
        const { error } = await supabase
          .from("email_templates")
          .update({ name: normalizedName, template_data: templateData as never, updated_at: new Date().toISOString() })
          .eq("id", templateId);

        if (error) {
          console.error("[EmailEditor] update error:", error);
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("email_templates")
          .insert({ name: normalizedName, template_data: templateData as never })
          .select("id")
          .single();

        if (error) {
          console.error("[EmailEditor] insert error:", error);
          throw error;
        }
        setTemplateId(data.id);
      }

      setSaveStatus("Saved ✓");
      toast({ title: "Saved!", description: "Template saved online and on this device." });
    } catch (error: any) {
      console.error("[EmailEditor] save error:", error);
      setSaveStatus("Local only");
      toast({
        title: "Saved locally",
        description: error?.message ? `Draft safe on this device. Cloud: ${error.message}` : "Draft safe on this device, but cloud save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadInlineImageToStorage = useCallback(async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = (blob.type.split("/")[1] || "png").split("+")[0].replace("jpeg", "jpg");
    const filePath = `email-editor/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("support-chat-attachments")
      .upload(filePath, blob, {
        contentType: blob.type || `image/${extension}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("support-chat-attachments").getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  const prepareEmailHtmlForSend = useCallback(
    async (html: string) => {
      const inlineImageMatches = Array.from(html.matchAll(/src=(["'])(data:image\/[^"']+)\1/g), (match) => match[2]);

      if (inlineImageMatches.length === 0) {
        return html;
      }

      const uniqueInlineImages = Array.from(new Set(inlineImageMatches));
      const uploadedImages = await Promise.all(
        uniqueInlineImages.map(async (source) => [source, await uploadInlineImageToStorage(source)] as const)
      );

      return uploadedImages.reduce(
        (nextHtml, [source, publicUrl]) => nextHtml.split(source).join(publicUrl),
        html
      );
    },
    [uploadInlineImageToStorage]
  );

  const handleSendTest = async (recipient: string) => {
    setSending(true);
    try {
      const html = await prepareEmailHtmlForSend(generateEmailHtml());
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: { to: recipient, subject: templateName || "Forti Email", html },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email sent!", description: `Sent to ${recipient}` });
    } catch (err: any) {
      toast({ title: "Send failed", description: err?.message || "Could not send email.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const generateEmailHtml = () => {
    const currentBlocks = buildBlocksForPersistence();

    const enabledSocials = socials.filter((item) => item.enabled);
    const resolvedPrivacyUrl = resolveOptionalLinkValue(privacyUrl);
    const resolvedTermsUrl = resolveOptionalLinkValue(termsUrl);
    const socialIcons = enabledSocials
      .map(
        (item) => {
          const socialHref = resolveOptionalLinkValue(item.url);
          const circleSize = socialSize + 16;
          return `<a href="${socialHref}"${socialHref === "#" ? "" : ' target="_blank" rel="noopener noreferrer"'} style="display:inline-block;margin:0 6px;text-decoration:none;vertical-align:middle;"><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:${circleSize}px;width:${circleSize}px;v-text-anchor:middle;" arcsize="50%" fillcolor="rgba(255,255,255,0.15)" stroke="f"><center><![endif]--><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td width="${circleSize}" height="${circleSize}" align="center" valign="middle" style="width:${circleSize}px;height:${circleSize}px;border-radius:50%;background:rgba(255,255,255,0.15);text-align:center;vertical-align:middle;line-height:${circleSize}px;"><img src="${getSocialIconImageUrl(item.icon)}" width="${socialSize}" height="${socialSize}" alt="${item.platform}" style="display:block;margin:0 auto;" /></td></tr></table><!--[if mso]></center></v:roundrect><![endif]--></a>`;
        }
      )
      .join("");

    const bodyBlocks = currentBlocks
      .map((block) => {
        if (block.type === "text") {
          const safeHtml = decorateEmailLinks(sanitizeRichText(block.content));
          return `<tr><td style="padding:16px 32px;text-align:${block.align};font-size:${block.fontSize || 16}px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">${safeHtml || "&nbsp;"}</td></tr>`;
        }

        if (block.type === "image" && block.imageUrl) {
          return `<tr><td style="padding:8px 32px;text-align:${block.align};"><img src="${block.imageUrl}" width="${block.imageWidth || 100}%" style="max-width:100%;height:auto;display:inline-block;" alt="Body image" /></td></tr>`;
        }

        if (block.type === "divider") {
          return `<tr><td style="padding:16px 32px;"><hr style="border:none;border-top:1px solid #e0e0e0;" /></td></tr>`;
        }

        if (block.type === "button") {
          const buttonHref = resolveOptionalLinkValue(block.buttonUrl);
          return `<tr><td style="padding:16px 32px;text-align:${block.align};"><a href="${buttonHref}"${buttonHref === "#" ? "" : ' target="_blank" rel="noopener noreferrer"'} style="display:inline-block;padding:12px 32px;background:${block.buttonColor || "#e63946"};color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;">${block.buttonText || "Click Here"}</a></td></tr>`;
        }

        return "";
      })
      .join("");

    const overlayHtml = footerOverlays
      .map(
        (overlay) =>
          `<img src="${overlay.imageUrl}" style="position:absolute;left:${overlay.x}%;top:${overlay.y}%;transform:translate(-50%,-50%);width:${overlay.width}%;height:auto;" alt="Footer overlay" />`
      )
      .join("");

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#f5f5f5;">
      <tr>
        <td style="background:${headerBgColor};text-align:center;padding:${headerImage ? "0" : "32px 24px"};">
          ${headerImage ? `<img src="${headerImage}" style="width:100%;display:block;" alt="Header" />` : `<h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.025em;font-family:Arial,Helvetica,sans-serif;">Your Brand</h1>`}
        </td>
      </tr>
      <tr>
        <td style="background:${bodyBgColor};">
          <table width="100%" cellpadding="0" cellspacing="0">${bodyBlocks}</table>
        </td>
      </tr>
      <tr>
        <td style="position:relative;background:${footerBgColor};">
          <div style="position:relative;display:block;">
            ${footerImage ? `<img src="${footerImage}" style="width:100%;display:block;" alt="Footer" />` : `<div style="height:120px;"></div>`}
            ${socialIcons ? `<div style="position:absolute;left:${socialX}%;top:${socialY}%;transform:translate(-50%,-50%);text-align:center;z-index:2;white-space:nowrap;">${socialIcons}</div>` : ""}
            ${overlayHtml}
            <div style="position:absolute;bottom:8px;left:0;right:0;text-align:center;z-index:3;padding:0 16px;">
              <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.7);">
                <a href="${resolvedPrivacyUrl}"${resolvedPrivacyUrl === "#" ? "" : ' target="_blank" rel="noopener noreferrer"'} style="color:rgba(255,255,255,0.7);text-decoration:underline;">Privacy Policy</a> &nbsp;|&nbsp;
                <a href="${resolvedTermsUrl}"${resolvedTermsUrl === "#" ? "" : ' target="_blank" rel="noopener noreferrer"'} style="color:rgba(255,255,255,0.7);text-decoration:underline;">Terms & Conditions</a>
              </p>
              <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.6);">${unsubscribeText}</p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.55);">${copyrightText}</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  };

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(generateEmailHtml());
    toast({ title: "Copied!", description: "Email HTML copied to clipboard." });
  }, [toast, generateEmailHtml]);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const SocialIcon = ({ icon, size = 24 }: { icon: string; size?: number }) => (
    <img src={getSocialIconImageUrl(icon)} width={size} height={size} alt="" style={{ display: "block" }} />
  );

  const SectionHeader = ({ id, icon: Icon, title }: { id: string; icon: any; title: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {expandedSection === id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </button>
  );

  const renderPreview = () => {
    const previewBlocks = buildBlocksForPersistence();
    const previewSocials = socials.filter((item) => item.enabled);
    const previewPrivacyUrl = resolveOptionalLinkValue(privacyUrl);
    const previewTermsUrl = resolveOptionalLinkValue(termsUrl);

    return (
      <div className="flex flex-col items-center py-8 px-4">
        <div className="transition-all duration-300 ease-out" style={{ width: previewDevice === "mobile" ? 375 : "100%", maxWidth: 600 }}>
          <div className="bg-[#2a2a2a] rounded-t-xl px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] text-white/40 font-mono">Email Preview</span>
            </div>
          </div>

          <div className="bg-[#f5f5f5] rounded-b-xl overflow-hidden shadow-2xl">
            <div style={{ backgroundColor: headerBgColor }} className="text-center">
              {headerImage ? (
                <img src={headerImage} className="w-full block" alt="Header" />
              ) : (
                <div className="py-8 px-6">
                  <h1 className="text-white text-xl font-bold m-0 tracking-tight">Your Brand</h1>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: bodyBgColor }}>
              {previewBlocks.map((block) => {
                if (block.type === "text") {
                  return (
                    <div
                      key={block.id}
                      className="px-8 py-4"
                      style={{
                        textAlign: block.align,
                        fontSize: `${block.fontSize || 16}px`,
                        lineHeight: 1.6,
                        color: "#333333",
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                      dangerouslySetInnerHTML={{ __html: decorateEmailLinks(sanitizeRichText(block.content)) }}
                    />
                  );
                }

                if (block.type === "image" && block.imageUrl) {
                  return (
                    <div key={block.id} className="px-8 py-2" style={{ textAlign: block.align }}>
                      <img src={block.imageUrl} alt="Body" style={{ width: `${block.imageWidth || 100}%`, maxWidth: "100%", height: "auto", display: "inline-block" }} />
                    </div>
                  );
                }

                if (block.type === "divider") {
                  return (
                    <div key={block.id} className="px-8 py-4">
                      <hr className="border-0 border-t border-[#e0e0e0]" />
                    </div>
                  );
                }

                if (block.type === "button") {
                  const buttonHref = resolveOptionalLinkValue(block.buttonUrl);

                  return (
                    <div key={block.id} className="px-8 py-4" style={{ textAlign: block.align }}>
                      <a
                        href={buttonHref}
                        target={buttonHref === "#" ? undefined : "_blank"}
                        rel={buttonHref === "#" ? undefined : "noopener noreferrer"}
                        onClick={buttonHref === "#" ? (event) => event.preventDefault() : undefined}
                        style={{
                          display: "inline-block",
                          padding: "12px 32px",
                          background: block.buttonColor || "#e63946",
                          color: "#ffffff",
                          textDecoration: "none",
                          borderRadius: 6,
                          fontSize: 16,
                          fontWeight: 600,
                        }}
                      >
                        {block.buttonText || "Click Here"}
                      </a>
                    </div>
                  );
                }

                return null;
              })}
            </div>

            <div ref={footerRef} style={{ backgroundColor: footerBgColor }} className="relative select-none">
              <div className="relative" style={{ minHeight: footerImage ? undefined : 120 }}>
                {footerImage ? <img src={footerImage} className="w-full block" alt="Footer" /> : <div className="h-[120px]" />}

                {previewSocials.length > 0 && (
                  <div
                    className="absolute z-20 cursor-move whitespace-nowrap"
                    style={{ left: `${socialX}%`, top: `${socialY}%`, transform: "translate(-50%, -50%)" }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setDragging({ type: "social" });
                    }}
                  >
                    {previewSocials.map((item) => {
                      const socialHref = resolveOptionalLinkValue(item.url);

                      return (
                        <a
                          key={item.platform}
                          href={socialHref}
                          target={socialHref === "#" ? undefined : "_blank"}
                          rel={socialHref === "#" ? undefined : "noopener noreferrer"}
                          onClick={socialHref === "#" ? (event) => event.preventDefault() : undefined}
                          style={{ display: "inline-block", margin: "0 4px", textDecoration: "none" }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: socialSize + 16,
                              height: socialSize + 16,
                              borderRadius: "9999px",
                              background: "rgba(255,255,255,0.15)",
                            }}
                          >
                            <SocialIcon icon={item.icon} size={socialSize} />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {footerOverlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    className={`absolute z-10 cursor-move ${activeOverlayId === overlay.id ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: "translate(-50%, -50%)", width: `${overlay.width}%` }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setActiveOverlayId(overlay.id);
                      setDragging({ type: "overlay", id: overlay.id });
                    }}
                  >
                    <img src={overlay.imageUrl} className="w-full h-auto pointer-events-none" alt="Overlay" />
                  </div>
                ))}

                <div className="absolute bottom-2 left-0 right-0 text-center z-10 px-4">
                  <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <a
                      href={previewPrivacyUrl}
                      target={previewPrivacyUrl === "#" ? undefined : "_blank"}
                      rel={previewPrivacyUrl === "#" ? undefined : "noopener noreferrer"}
                      onClick={previewPrivacyUrl === "#" ? (event) => event.preventDefault() : undefined}
                      className="underline"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      Privacy Policy
                    </a>
                    <span className="mx-2">|</span>
                    <a
                      href={previewTermsUrl}
                      target={previewTermsUrl === "#" ? undefined : "_blank"}
                      rel={previewTermsUrl === "#" ? undefined : "noopener noreferrer"}
                      onClick={previewTermsUrl === "#" ? (event) => event.preventDefault() : undefined}
                      className="underline"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      Terms & Conditions
                    </a>
                  </p>
                  <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{unsubscribeText}</p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>{copyrightText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEditor = () => (
    <div className="space-y-1 pb-6">
      <div className="border-b border-white/5">
        <SectionHeader id="header" icon={ImageIcon} title="Header" />
        {expandedSection === "header" && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-20">Background</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                <input type="color" value={headerBgColor} onChange={(event) => setHeaderBgColor(event.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-xs text-muted-foreground font-mono">{headerBgColor}</span>
              </div>
            </div>

            <input ref={headerInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event, setHeaderImage)} />
            {headerImage ? (
              <div className="relative group rounded-lg overflow-hidden">
                <img src={headerImage} className="w-full max-h-32 object-cover" alt="Header" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => headerInputRef.current?.click()}>Replace</Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setHeaderImage(null)}>Remove</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => headerInputRef.current?.click()} className="w-full border border-dashed border-white/10 rounded-lg py-6 text-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all group">
                <Upload className="h-5 w-5 mx-auto mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs">Upload header image</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-white/5">
        <SectionHeader id="body" icon={Edit3} title="Body Content" />
        {expandedSection === "body" && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-20">Background</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                <input type="color" value={bodyBgColor} onChange={(event) => setBodyBgColor(event.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-xs text-muted-foreground font-mono">{bodyBgColor}</span>
              </div>
            </div>

            <div className="space-y-2">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`rounded-lg transition-all ${activeBlockId === block.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
                  onClick={() => setActiveBlockId(block.id)}
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{block.type}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} onClick={(event) => { event.stopPropagation(); moveBlock(block.id, "up"); }}><ChevronUp className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === blocks.length - 1} onClick={(event) => { event.stopPropagation(); moveBlock(block.id, "down"); }}><ChevronDown className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(event) => { event.stopPropagation(); removeBlock(block.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>

                  {activeBlockId === block.id && (
                    <div className="px-3 pb-3 space-y-2">
                      {block.type === "text" && (
                        <>
                          <div className="flex items-center gap-0.5 flex-wrap bg-white/5 rounded-md p-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(event) => { event.preventDefault(); formatSelection(block.id, "bold"); }} title="Bold selected text"><Bold className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(event) => { event.preventDefault(); formatSelection(block.id, "italic"); }} title="Italic selected text"><Italic className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(event) => { event.preventDefault(); formatSelection(block.id, "underline"); }} title="Underline selected text"><UnderlineIcon className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(event) => { event.preventDefault(); insertLink(block.id); }} title="Add link to selected text"><LinkIcon className="h-3 w-3" /></Button>
                            <div className="w-px h-4 bg-white/10 mx-0.5" />
                            <Button size="icon" variant={block.align === "left" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "left" })}><AlignLeft className="h-3 w-3" /></Button>
                            <Button size="icon" variant={block.align === "center" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "center" })}><AlignCenter className="h-3 w-3" /></Button>
                            <Button size="icon" variant={block.align === "right" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "right" })}><AlignRight className="h-3 w-3" /></Button>
                            <div className="w-px h-4 bg-white/10 mx-0.5" />
                            <div className="flex items-center gap-1 ml-1">
                              <span className="text-[10px] text-muted-foreground">Size</span>
                              <Input type="number" value={block.fontSize || 16} onChange={(event) => updateBlock(block.id, { fontSize: Number(event.target.value) })} className="w-12 h-6 text-[11px] px-1.5 bg-white/5 border-white/10" min={10} max={48} />
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground/60 px-1">
                            Select text, then use <strong>B</strong>, <em>I</em>, <span className="underline">U</span>, or the link button to format just those words.
                          </p>
                          <div
                            ref={(element) => {
                              blockEditorRefs.current[block.id] = element;
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            className="min-h-[120px] text-xs bg-white/5 border border-white/10 rounded-md p-3 outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                            style={{ textAlign: block.align, fontSize: `${block.fontSize || 16}px`, lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.content) }}
                            onInput={(event) => syncTextBlockFromEditor(block.id, event.currentTarget.innerHTML)}
                            onKeyUp={(event) => syncTextBlockFromEditor(block.id, event.currentTarget.innerHTML)}
                            onBlur={(event) => syncTextBlockFromEditor(block.id, event.currentTarget.innerHTML)}
                          />
                        </>
                      )}

                      {block.type === "image" && (
                        <>
                          {block.imageUrl ? (
                            <div className="space-y-2">
                              <img src={block.imageUrl} className="max-h-28 rounded object-contain mx-auto" alt="Body" />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap w-14">Width {block.imageWidth}%</span>
                                <Slider value={[block.imageWidth || 100]} onValueChange={(value) => updateBlock(block.id, { imageWidth: value[0] })} min={10} max={100} step={1} className="flex-1" />
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button size="icon" variant={block.align === "left" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "left" })}><AlignLeft className="h-3 w-3" /></Button>
                                <Button size="icon" variant={block.align === "center" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "center" })}><AlignCenter className="h-3 w-3" /></Button>
                                <Button size="icon" variant={block.align === "right" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "right" })}><AlignRight className="h-3 w-3" /></Button>
                                <div className="flex-1" />
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => updateBlock(block.id, { imageUrl: undefined })}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <input type="file" accept="image/*" className="hidden" id={`img-upload-${block.id}`} onChange={(event) => handleBodyImageUpload(event, block.id)} />
                              <label htmlFor={`img-upload-${block.id}`} className="block w-full border border-dashed border-white/10 rounded-lg py-5 text-center text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors">
                                <Upload className="h-4 w-4 mx-auto mb-1 opacity-50" />
                                <span className="text-xs">Upload image</span>
                              </label>
                            </>
                          )}
                        </>
                      )}

                      {block.type === "button" && (
                        <div className="space-y-2">
                          <Input placeholder="Button Text" value={block.buttonText || ""} onChange={(event) => updateBlock(block.id, { buttonText: event.target.value })} className="h-7 text-xs bg-white/5 border-white/10" />
                          <Input placeholder="Button URL" value={block.buttonUrl || ""} onChange={(event) => updateBlock(block.id, { buttonUrl: event.target.value })} className="h-7 text-xs bg-white/5 border-white/10" />
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground">Color</label>
                            <input type="color" value={block.buttonColor || "#e63946"} onChange={(event) => updateBlock(block.id, { buttonColor: event.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                            <div className="flex-1" />
                            <div className="flex items-center gap-0.5">
                              <Button size="icon" variant={block.align === "left" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "left" })}><AlignLeft className="h-3 w-3" /></Button>
                              <Button size="icon" variant={block.align === "center" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "center" })}><AlignCenter className="h-3 w-3" /></Button>
                              <Button size="icon" variant={block.align === "right" ? "secondary" : "ghost"} className="h-6 w-6" onClick={() => updateBlock(block.id, { align: "right" })}><AlignRight className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-[10px] bg-white/5 hover:bg-white/10 flex-1" onClick={() => addBlock("text")}><Plus className="h-3 w-3 mr-1" /> Text</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] bg-white/5 hover:bg-white/10 flex-1" onClick={() => addBlock("image")}><ImageIcon className="h-3 w-3 mr-1" /> Image</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] bg-white/5 hover:bg-white/10 flex-1" onClick={() => addBlock("button")}><LinkIcon className="h-3 w-3 mr-1" /> Button</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] bg-white/5 hover:bg-white/10" onClick={() => addBlock("divider")}>—</Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-white/5">
        <SectionHeader id="social" icon={LinkIcon} title="Social Icons" />
        {expandedSection === "social" && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-[9px] text-muted-foreground/60 leading-snug">Social icons sit over the footer image. Drag them in the preview or use the sliders below.</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Size: {socialSize}px</label>
                <Slider value={[socialSize]} onValueChange={(value) => setSocialSize(value[0])} min={16} max={48} step={2} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Horizontal: {Math.round(socialX)}%</label>
                <Slider value={[socialX]} onValueChange={(value) => setSocialX(value[0])} min={0} max={100} step={1} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Vertical: {Math.round(socialY)}%</label>
                <Slider value={[socialY]} onValueChange={(value) => setSocialY(value[0])} min={0} max={100} step={1} />
              </div>
            </div>
            <div className="space-y-1.5">
              {socials.map((item, index) => (
                <div key={item.platform} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 min-w-[110px]">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(event) => {
                        const next = [...socials];
                        next[index] = { ...next[index], enabled: event.target.checked };
                        setSocials(next);
                      }}
                      className="rounded accent-primary"
                    />
                    <span className="text-xs">{item.platform}</span>
                  </label>
                  {item.enabled && (
                    <Input
                      placeholder="URL"
                      value={item.url}
                      onChange={(event) => {
                        const next = [...socials];
                        next[index] = { ...next[index], url: event.target.value };
                        setSocials(next);
                      }}
                      className="h-6 text-[10px] flex-1 bg-white/5 border-white/10"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-white/5">
        <SectionHeader id="footer" icon={ImageIcon} title="Footer" />
        {expandedSection === "footer" && (
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-20">Background</label>
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                <input type="color" value={footerBgColor} onChange={(event) => setFooterBgColor(event.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <span className="text-xs text-muted-foreground font-mono">{footerBgColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-2 block font-semibold uppercase tracking-wider">Background Image</label>
              <input ref={footerInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event, setFooterImage)} />
              {footerImage ? (
                <div className="relative group rounded-lg overflow-hidden">
                  <img src={footerImage} className="w-full max-h-32 object-cover" alt="Footer" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => footerInputRef.current?.click()}>Replace</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setFooterImage(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => footerInputRef.current?.click()} className="w-full border border-dashed border-white/10 rounded-lg py-5 text-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-all group">
                  <Upload className="h-4 w-4 mx-auto mb-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <span className="text-xs">Upload footer image</span>
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-2 block font-semibold uppercase tracking-wider">Overlay Images</label>
              <p className="text-[9px] text-muted-foreground/60 mb-2 leading-snug">Upload images to layer on top of the footer. Drag them in the preview and resize below.</p>
              <input ref={overlayInputRef} type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} />

              {footerOverlays.map((overlay) => (
                <div key={overlay.id} className={`mb-2 rounded-lg p-2 ${activeOverlayId === overlay.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-white/[0.03]"}`} onClick={() => setActiveOverlayId(overlay.id)}>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={overlay.imageUrl} className="h-8 w-8 object-cover rounded" alt="Overlay" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">W: {overlay.width}%</span>
                        <Slider value={[overlay.width]} onValueChange={(value) => setFooterOverlays((prev) => prev.map((item) => item.id === overlay.id ? { ...item, width: value[0] } : item))} min={5} max={100} step={1} className="flex-1" />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeOverlay(overlay.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground">X: {Math.round(overlay.x)}%</label>
                      <Slider value={[overlay.x]} onValueChange={(value) => setFooterOverlays((prev) => prev.map((item) => item.id === overlay.id ? { ...item, x: value[0] } : item))} min={0} max={100} step={1} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Y: {Math.round(overlay.y)}%</label>
                      <Slider value={[overlay.y]} onValueChange={(value) => setFooterOverlays((prev) => prev.map((item) => item.id === overlay.id ? { ...item, y: value[0] } : item))} min={0} max={100} step={1} />
                    </div>
                  </div>
                </div>
              ))}

              <Button size="sm" variant="ghost" className="h-7 text-[10px] bg-white/5 hover:bg-white/10 w-full" onClick={() => overlayInputRef.current?.click()}>
                <Plus className="h-3 w-3 mr-1" /> Add Overlay Image
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <SectionHeader id="legal" icon={LinkIcon} title="Legal & Links" />
        {expandedSection === "legal" && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Privacy Policy URL</label>
              <Input value={privacyUrl} onChange={(event) => setPrivacyUrl(event.target.value)} className="h-7 text-xs bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Terms & Conditions URL</label>
              <Input value={termsUrl} onChange={(event) => setTermsUrl(event.target.value)} className="h-7 text-xs bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Unsubscribe Text</label>
              <Input value={unsubscribeText} onChange={(event) => setUnsubscribeText(event.target.value)} className="h-7 text-xs bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Copyright</label>
              <Input value={copyrightText} onChange={(event) => setCopyrightText(event.target.value)} className="h-7 text-xs bg-white/5 border-white/10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="shrink-0 bg-background border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-12 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="w-px h-5 bg-white/10 shrink-0" />
            <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="h-7 w-44 text-xs bg-white/5 border-white/10" placeholder="Template name" />
            <span className="hidden md:inline text-[10px] text-muted-foreground/70">{saveStatus || (session ? "Cloud + local save" : "Local draft save")}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden lg:flex items-center bg-white/5 rounded-lg p-0.5 mr-2">
              <button onClick={() => setPreviewDevice("desktop")} className={`p-1.5 rounded-md transition-colors ${previewDevice === "desktop" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setPreviewDevice("mobile")} className={`p-1.5 rounded-md transition-colors ${previewDevice === "mobile" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="lg:hidden flex items-center bg-white/5 rounded-lg p-0.5 mr-2">
              <button onClick={() => setMode("edit")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${mode === "edit" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setMode("preview")} className={`px-3 py-1.5 rounded-md text-xs transition-colors ${mode === "preview" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={copyHtml}>
              <Code className="h-3.5 w-3.5" /> Copy HTML
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleSendTest("tori@rideforti.com")} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Test
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex flex-1">
          <div className="w-[340px] shrink-0 border-r border-white/5 overflow-y-auto">{renderEditor()}</div>
          <div className="flex-1 overflow-y-auto bg-[#1a1a1a]">{renderPreview()}</div>
        </div>

        <div className="lg:hidden flex-1 overflow-y-auto">
          {mode === "edit" ? <div className="p-3">{renderEditor()}</div> : <div className="bg-[#1a1a1a] min-h-full">{renderPreview()}</div>}
        </div>
      </div>
    </div>
  );
};

export default EmailEditor;
