import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, LogOut, History, Bot, UserCircle, Paperclip, Image, FileText, Link2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (digits.length === 0) return "+1 ";
  if (digits.length <= 3) return `+1 (${digits}`;
  if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

interface Attachment {
  type: "image" | "file" | "link";
  name: string;
  url: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  staffName?: string;
  attachments?: Attachment[];
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ChatSession {
  id: string;
  status: string;
  created_at: string;
  closed_at: string | null;
  closed_reason: string | null;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`;
const DB_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-db`;
const INACTIVITY_WARNING_MS = 2 * 60 * 1000; // 2 minutes - "Are you still there?"
const INACTIVITY_CLOSING_SOON_MS = 4 * 60 * 1000; // 4 minutes - "Closing in 1 minute"
const INACTIVITY_CLOSE_MS = 5 * 60 * 1000; // 5 minutes - auto-close

// Helper to call the support-db edge function
const callSupportDb = async (action: string, payload: Record<string, unknown>) => {
  const resp = await fetch(DB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.error || "Database operation failed");
  }
  return resp.json();
};

const SupportChat = ({ isOpen, onClose }: SupportChatProps) => {
  const { t } = useTranslation();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userInfoForm, setUserInfoForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
  });
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [humanRequested, setHumanRequested] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("support.welcomeMessage") }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [closedSessions, setClosedSessions] = useState<ChatSession[]>([]);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [responseEta, setResponseEta] = useState<{ shift: string; etaMinutes: number | null } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const closingSoonShownRef = useRef<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, historyMessages]);

  // Poll for staff messages when human is requested
  const staffPollRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSession || currentSession.status === "closed" || !userInfo) {
      if (staffPollRef.current) clearInterval(staffPollRef.current);
      return;
    }

    const pollForUpdates = async () => {
      try {
        const { messages: allMsgs } = await callSupportDb("getSessionMessages", {
          sessionId: currentSession.id,
        });
        if (!allMsgs) return;

        // Check for new staff messages
        const staffMsgs = allMsgs.filter((m: any) => m.role === "staff");
        if (staffMsgs.length > 0) {
          const lastStaff = staffMsgs[staffMsgs.length - 1];
          if (lastCheckedRef.current !== lastStaff.id) {
            const knownContents = new Set(messages.filter(m => m.staffName).map(m => m.content));
            const newStaffMsgs = staffMsgs.filter((m: any) => !knownContents.has(m.content));
            if (newStaffMsgs.length > 0) {
              setMessages(prev => [
                ...prev,
                ...newStaffMsgs.map((m: any) => ({
                  role: "assistant" as const,
                  content: m.content,
                  staffName: m.staff_name || "Support Agent",
                  attachments: Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments : undefined,
                })),
              ]);
            }
            lastCheckedRef.current = lastStaff.id;
          }
        }

        // Also check if session ai_enabled changed or human_requested changed
        const { session: updatedSession } = await callSupportDb("getOpenSession", {
          contactId: userInfo.id,
        });
        if (updatedSession && updatedSession.id === currentSession.id) {
          if (updatedSession.human_requested && !humanRequested) {
            setHumanRequested(true);
          }
          // Update session in state for ai_enabled tracking
          setCurrentSession(updatedSession);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    };

    staffPollRef.current = setInterval(pollForUpdates, 5000);
    return () => {
      if (staffPollRef.current) clearInterval(staffPollRef.current);
    };
  }, [currentSession?.id, currentSession?.status, userInfo, messages, humanRequested]);

  // Inactivity timer
  useEffect(() => {
    if (!userInfo || !currentSession || currentSession.status === "closed") {
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      if (elapsed >= INACTIVITY_CLOSE_MS) {
        closeSessionDueToInactivity();
      } else if (elapsed >= INACTIVITY_CLOSING_SOON_MS && !closingSoonShownRef.current) {
        closingSoonShownRef.current = true;
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "This chat will be closed in 1 minute due to inactivity. Please send a message if you still need help." }
        ]);
      } else if (elapsed >= INACTIVITY_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: t("support.areYouStillHere") }
        ]);
      }
    };

    inactivityTimerRef.current = setInterval(checkInactivity, 10000);

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [userInfo, currentSession, t]);

  // Refresh response ETA while waiting for a human
  useEffect(() => {
    if (!humanRequested || !currentSession || currentSession.status === "closed") return;
    let cancelled = false;
    const fetchEta = async () => {
      try {
        const eta = await callSupportDb("getResponseEta", {});
        if (!cancelled) setResponseEta({ shift: eta.shift, etaMinutes: eta.etaMinutes });
      } catch (err) {
        console.error("ETA refresh failed:", err);
      }
    };
    fetchEta();
    const id = setInterval(fetchEta, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [humanRequested, currentSession?.id, currentSession?.status]);

  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    closingSoonShownRef.current = false;
  };

  const closeSessionDueToInactivity = async () => {
    if (!currentSession) return;

    try {
      await callSupportDb("closeSession", {
        sessionId: currentSession.id,
        reason: "inactivity",
      });

      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: t("support.closedDueToInactivity")
        }
      ]);

      setCurrentSession(prev => prev ? { ...prev, status: "closed" } : null);
    } catch (error) {
      console.error("Error closing session:", error);
    }
  };

  const streamChat = useCallback(async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages.map(m => ({
        role: m.role,
        // Prefix staff turns so the AI re-engages with full context of the human handoff
        content: m.staffName ? `[Human support agent ${m.staffName} said]: ${m.content}` : m.content,
        ...(m.attachments && m.attachments.length > 0 ? { attachments: m.attachments } : {}),
      })) }),
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) {
        throw new Error("Rate limits exceeded. Please try again later.");
      }
      if (resp.status === 402) {
        throw new Error("Service temporarily unavailable.");
      }
      throw new Error("Failed to connect to support");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) => 
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return assistantContent;
  }, []);

  const handleFileUpload = async (files: FileList | null, isImage: boolean) => {
    if (!files || files.length === 0 || !currentSession) return;
    setIsUploading(true);
    setShowAttachMenu(false);

    for (const file of Array.from(files)) {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop() || "bin";
      const filePath = `${currentSession.id}/${crypto.randomUUID()}.${ext}`;

      try {
        const { error } = await supabase.storage
          .from("support-chat-attachments")
          .upload(filePath, file);
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("support-chat-attachments")
          .getPublicUrl(filePath);

        const type: Attachment["type"] = isImage || file.type.startsWith("image/") ? "image" : "file";
        setPendingAttachments(prev => [...prev, { type, name: file.name, url: urlData.publicUrl }]);
      } catch (err) {
        console.error("Upload error:", err);
        toast({ title: "Upload failed", description: `Could not upload ${file.name}`, variant: "destructive" });
      }
    }
    setIsUploading(false);
  };

  const handleAddLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    setPendingAttachments(prev => [...prev, { type: "link", name: formatted, url: formatted }]);
    setLinkInput("");
    setShowLinkInput(false);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading || !currentSession || currentSession.status === "closed") return;

    resetActivityTimer();

    const trimmedInput = input.trim();
    const currentAttachments = [...pendingAttachments];
    const userMessage: Message = { 
      role: "user", 
      content: trimmedInput || (currentAttachments.length > 0 ? `[${currentAttachments.map(a => a.name).join(", ")}]` : ""),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    // Save message to DB via edge function
    if (userInfo) {
      try {
        await callSupportDb("saveMessage", {
          sessionId: currentSession.id,
          contactId: userInfo.id,
          role: "user",
          content: trimmedInput || (currentAttachments.length > 0 ? `[${currentAttachments.length} attachment${currentAttachments.length === 1 ? "" : "s"}]` : ""),
          attachments: currentAttachments,
        });
      } catch (error) {
        console.error("Failed to save user message:", error);
      }
    }

    // Check if user is requesting a human agent
    const humanKeywords = /\b(human|agent|real person|speak to someone|talk to someone|representative|operator|live agent|staff|person)\b/i;
    if (humanKeywords.test(trimmedInput) && !humanRequested) {
      setHumanRequested(true);

      // Flag the session for human handoff
      try {
        await callSupportDb("requestHuman", {
          sessionId: currentSession.id,
        });
      } catch (error) {
        console.error("Failed to request human:", error);
      }

      // Fetch live ETA based on current shift
      let etaText = "";
      try {
        const eta = await callSupportDb("getResponseEta", {});
        setResponseEta({ shift: eta.shift, etaMinutes: eta.etaMinutes });
        if (eta.shift === "quiet") {
          etaText = " Our team is offline overnight (1am–9am EST), but we'll get back to you first thing in the morning.";
        } else if (eta.etaMinutes) {
          etaText = ` Based on today's response times, expect a reply in about ${eta.etaMinutes} minute${eta.etaMinutes === 1 ? "" : "s"}.`;
        }
      } catch (err) {
        console.error("Failed to fetch ETA:", err);
      }

      const humanResponse = `A support representative will be with you shortly.${etaText}`;
      setMessages(prev => [...prev, { role: "assistant", content: humanResponse }]);

      // Save the AI response
      if (userInfo) {
        try {
          await callSupportDb("saveMessage", {
            sessionId: currentSession.id,
            contactId: userInfo.id,
            role: "assistant",
            content: humanResponse,
          });
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      }

      setIsLoading(false);
      return;
    }

    // If human was already requested or AI is disabled, don't send to AI
    if (humanRequested || (currentSession as any)?.ai_enabled === false) {
      const waitingResponse = "A support agent will respond shortly. You can also reach us at support@rideforti.com.";
      setMessages(prev => [...prev, { role: "assistant", content: waitingResponse }]);
      if (userInfo) {
        try {
          await callSupportDb("saveMessage", {
            sessionId: currentSession.id,
            contactId: userInfo.id,
            role: "assistant",
            content: waitingResponse,
          });
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      }
      setIsLoading(false);
      return;
    }

    try {
      const assistantContent = await streamChat(newMessages.filter(m => m.role === "user" || m.role === "assistant"));
      
      // Save assistant response to DB via edge function
      if (userInfo && assistantContent) {
        try {
          await callSupportDb("saveMessage", {
            sessionId: currentSession.id,
            contactId: userInfo.id,
            role: "assistant",
            content: assistantContent,
          });
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: t("support.errors.error"),
        description: error instanceof Error ? error.message : t("support.errors.failedToSend"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInfoForm.firstName.trim() || !userInfoForm.lastName.trim() || !userInfoForm.email.trim() || !userInfoForm.phone.trim() || !userInfoForm.subject.trim()) {
      toast({
        title: t("support.errors.requiredFields"),
        description: t("support.errors.requiredFieldsDescription"),
        variant: "destructive",
      });
      return;
    }
    if (userInfoForm.subject.trim().length > 120) {
      toast({
        title: t("support.errors.requiredFields"),
        description: "Subject must be under 120 characters.",
        variant: "destructive",
      });
      return;
    }

    const phoneDigits = userInfoForm.phone.replace(/\D/g, "").replace(/^1/, "");
    if (phoneDigits.length !== 10) {
      toast({
        title: t("support.errors.invalidPhone"),
        description: t("support.errors.invalidPhoneDescription"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Find or create contact
      const { contact } = await callSupportDb("findOrCreateContact", {
        firstName: userInfoForm.firstName.trim(),
        lastName: userInfoForm.lastName.trim(),
        email: userInfoForm.email.trim(),
        phone: userInfoForm.phone.trim(),
      });

      const info: UserInfo = {
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
      };
      setUserInfo(info);

      // Check for existing open session
      const { session: existingSession, messages: existingMessages } = await callSupportDb("getOpenSession", {
        contactId: contact.id,
      });

      if (existingSession) {
        // Resume existing session
        setCurrentSession(existingSession);
        setHumanRequested(existingSession.human_requested || false);
        
        // Restore messages from DB
        if (existingMessages && existingMessages.length > 0) {
          const restored: Message[] = existingMessages.map((m: any) => ({
            role: m.role === "staff" ? "assistant" as const : m.role as "user" | "assistant",
            content: m.content,
            staffName: m.staff_name || undefined,
            attachments: Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments : undefined,
          }));
          setMessages(restored);
        }
        resetActivityTimer();
      } else {
        // Create new session
        const { session } = await callSupportDb("createSession", {
          contactId: contact.id,
          subject: userInfoForm.subject.trim(),
        });

        setCurrentSession(session);
        resetActivityTimer();

        await callSupportDb("saveMessage", {
          sessionId: session.id,
          contactId: contact.id,
          role: "assistant",
          content: t("support.welcomeMessage"),
        });

        // Save subject as the first user message so staff/AI see it as the issue
        const subjectLine = `Subject: ${userInfoForm.subject.trim()}`;
        await callSupportDb("saveMessage", {
          sessionId: session.id,
          contactId: contact.id,
          role: "user",
          content: subjectLine,
        });
        setMessages((prev) => [...prev, { role: "user", content: subjectLine }]);
      }
    } catch (error) {
      console.error("Start chat error:", error);
      toast({
        title: t("support.errors.error"),
        description: t("support.errors.failedToStartChat"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUserInfo(null);
    setCurrentSession(null);
    setMessages([
      { role: "assistant", content: t("support.welcomeMessage") }
    ]);
    setShowHistory(false);
    setClosedSessions([]);
    setHistoryMessages([]);
    setViewingSessionId(null);
    warningShownRef.current = false;
  };

  const loadClosedSessions = async () => {
    if (!userInfo) return;

    try {
      const { sessions } = await callSupportDb("getClosedSessions", {
        contactId: userInfo.id,
      });
      setClosedSessions(sessions || []);
    } catch (error) {
      console.error("Error loading closed sessions:", error);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const { messages: msgs } = await callSupportDb("getSessionMessages", {
        sessionId,
      });
      if (msgs) {
        setHistoryMessages(msgs.map((m: { role: string; content: string }) => ({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        })));
      }
      setViewingSessionId(sessionId);
    } catch (error) {
      console.error("Error loading session messages:", error);
    }
  };

  const handleShowHistory = async () => {
    await loadClosedSessions();
    setShowHistory(true);
    setViewingSessionId(null);
    setHistoryMessages([]);
  };

  const handleBackFromHistory = () => {
    if (viewingSessionId) {
      setViewingSessionId(null);
      setHistoryMessages([]);
    } else {
      setShowHistory(false);
    }
  };

  if (!isOpen) return null;

  const isSessionClosed = currentSession?.status === "closed";

  return (
    <div className="fixed bottom-24 right-6 z-[9999] w-[380px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-120px)] bg-[#1a1a1a] border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#222]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSessionClosed ? "bg-red-500" : "bg-green-500"}`} />
          <span className="font-medium text-foreground">{t("support.title")}</span>
        </div>
        <div className="flex items-center gap-1">
          {userInfo && !showHistory && (
            <>
              <button
                onClick={handleShowHistory}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded"
                title={t("support.viewHistory")}
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded"
                title={t("support.logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          {showHistory && (
            <button
              onClick={handleBackFromHistory}
              className="text-xs text-muted-foreground hover:text-foreground mr-2"
            >
              ← {t("support.back")}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!userInfo ? (
        /* User Info Form - Required before chatting */
        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-lg font-medium mb-2 text-foreground">{t("support.welcome")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("support.welcomeSubtitle")}</p>
          <form onSubmit={handleStartChat} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder={`${t("support.firstName")} *`}
                value={userInfoForm.firstName}
                onChange={(e) => setUserInfoForm(prev => ({ ...prev, firstName: e.target.value }))}
                required
                className="bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
              />
              <Input
                placeholder={`${t("support.lastName")} *`}
                value={userInfoForm.lastName}
                onChange={(e) => setUserInfoForm(prev => ({ ...prev, lastName: e.target.value }))}
                required
                className="bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
              />
            </div>
            <Input
              type="email"
              placeholder={`${t("support.email")} *`}
              value={userInfoForm.email}
              onChange={(e) => setUserInfoForm(prev => ({ ...prev, email: e.target.value }))}
              required
              className="bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
            />
            <Input
              type="tel"
              placeholder={`${t("support.phone")} *`}
              value={userInfoForm.phone}
              onChange={(e) => setUserInfoForm(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
              required
              className="bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
            />
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Booking issue",
                  "Payment / billing",
                  "Driver concern",
                  "Account help",
                  "Safety / security",
                  "App not working",
                  "Other",
                ].map((preset) => {
                  const active = userInfoForm.subject === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setUserInfoForm(prev => ({ ...prev, subject: preset }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-white text-black border-white"
                          : "bg-[#2a2a2a] text-muted-foreground border-border hover:text-foreground hover:border-white/40"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <Input
                type="text"
                placeholder="Subject — what's your issue? *"
                value={userInfoForm.subject}
                onChange={(e) => setUserInfoForm(prev => ({ ...prev, subject: e.target.value.slice(0, 120) }))}
                required
                maxLength={120}
                className="bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#007AFF] hover:bg-[#0066DD] text-white"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("support.startChat")}
            </Button>
          </form>
        </div>
      ) : showHistory ? (
        /* History View */
        <div className="flex-1 overflow-auto p-4">
          {viewingSessionId ? (
            <>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Session History</h3>
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {historyMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                          message.role === "user"
                            ? "bg-[#007AFF] text-white rounded-br-md"
                            : "bg-[#2a2a2a] text-foreground rounded-bl-md"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">{t("support.closedTickets")}</h3>
              {closedSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("support.noClosedTickets")}</p>
              ) : (
                <div className="space-y-2">
                  {closedSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSessionMessages(session.id)}
                      className="w-full p-3 bg-[#2a2a2a] rounded-lg text-left hover:bg-[#333] transition-colors"
                    >
                      <div className="text-sm text-foreground">
                        {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Closed: {session.closed_reason || "Manual"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Human handoff status badge */}
          {humanRequested && currentSession?.status !== "closed" && (
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#007AFF]/10 border border-[#007AFF]/30 text-xs">
                <UserCircle className="h-3.5 w-3.5 text-[#007AFF] flex-shrink-0" />
                <span className="text-foreground/90">
                  Human requested
                  {responseEta && responseEta.shift !== "quiet" && responseEta.etaMinutes != null && (
                    <span className="text-muted-foreground"> · ETA ~{responseEta.etaMinutes} min</span>
                  )}
                  {responseEta && responseEta.shift === "quiet" && (
                    <span className="text-muted-foreground"> · Team replies 9am EST</span>
                  )}
                </span>
              </div>
            </div>
          )}
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 mr-2 mt-1">
                      {message.staffName ? (
                        <div className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center">
                          <UserCircle className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col">
                    {message.role === "assistant" && (
                      <span className="text-[10px] text-muted-foreground mb-1 ml-1">
                        {message.staffName || "Forti Bot"}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                        message.role === "user"
                          ? "bg-[#007AFF] text-white rounded-br-md"
                          : "bg-[#2a2a2a] text-foreground rounded-bl-md"
                      }`}
                    >
                      {message.content && <p>{message.content}</p>}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {message.attachments.map((att, ai) => (
                            <div key={ai}>
                              {att.type === "image" ? (
                                <a href={att.url} target="_blank" rel="noopener noreferrer">
                                  <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg mt-1 object-cover" />
                                </a>
                              ) : att.type === "link" ? (
                                <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 underline text-xs ${message.role === "user" ? "text-blue-100" : "text-[#007AFF]"}`}>
                                  <Link2 className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              ) : (
                                <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 underline text-xs ${message.role === "user" ? "text-blue-100" : "text-[#007AFF]"}`}>
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <div className="w-7 h-7 rounded-full bg-[#333] flex items-center justify-center">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground mb-1 ml-1">Forti Bot</span>
                    <div className="bg-[#2a2a2a] px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files, true)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files, false)}
          />

          {/* Input */}
          <div className="border-t border-border bg-[#222]">
            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="px-3 pt-2 flex flex-wrap gap-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative group bg-[#2a2a2a] rounded-lg p-1.5 flex items-center gap-1.5 max-w-[160px]">
                    {att.type === "image" ? (
                      <img src={att.url} alt={att.name} className="w-10 h-10 rounded object-cover" />
                    ) : att.type === "link" ? (
                      <Link2 className="h-4 w-4 text-[#007AFF] flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 bg-[#1a1a1a] rounded-full"
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Link input row */}
            {showLinkInput && (
              <div className="px-3 pt-2 flex gap-2">
                <Input
                  placeholder="Paste URL..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddLink(); } }}
                  className="flex-1 bg-[#2a2a2a] border-border text-sm h-8 focus-visible:ring-white focus-visible:ring-offset-0"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddLink} className="h-8 bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs">Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowLinkInput(false); setLinkInput(""); }} className="h-8 text-xs">Cancel</Button>
              </div>
            )}

            <div className="p-3">
            {isSessionClosed ? (
              <div className="text-center text-sm text-muted-foreground py-2">
                {t("support.ticketClosed")} <button onClick={handleLogout} className="text-[#007AFF] hover:underline">Start a new chat</button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2 items-center"
              >
                {/* Attachment button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={isLoading || isUploading}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-[#2a2a2a] border border-border rounded-lg shadow-xl py-1 min-w-[140px] z-10">
                      <button
                        type="button"
                        onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#333] transition-colors"
                      >
                        <Image className="h-4 w-4" /> Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#333] transition-colors"
                      >
                        <FileText className="h-4 w-4" /> Document
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowLinkInput(true); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-[#333] transition-colors"
                      >
                        <Link2 className="h-4 w-4" /> Link
                      </button>
                    </div>
                  )}
                </div>

                <Input
                  placeholder={t("support.typeMessage")}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    resetActivityTimer();
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-[#2a2a2a] border-border focus-visible:ring-white focus-visible:ring-offset-0"
                />
                <Button
                  type="submit"
                  disabled={(!input.trim() && pendingAttachments.length === 0) || isLoading}
                  size="icon"
                  className="bg-[#007AFF] hover:bg-[#0066DD] text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SupportChat;
