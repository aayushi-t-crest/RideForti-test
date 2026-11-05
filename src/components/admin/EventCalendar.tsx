import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Link2,
  FileText,
  StickyNote,
  Trash2,
  Edit3,
  ExternalLink,
  Search,
  Check,
  X,
  Loader2,
  MapPin,
  Users,
  Sparkles,
  ThumbsDown,
  Eye,
  Share2,
  Copy,
  Download,
  Settings,
  GraduationCap,
  Repeat,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ManageShareLinks from "./ManageShareLinks";
import DashboardTutorial from "./DashboardTutorial";
import WeekView, { type CalEvent } from "./calendar/WeekView";
import DayView from "./calendar/DayView";
import NotificationBell from "./calendar/NotificationBell";
import TagsEditor from "./calendar/TagsEditor";
import EventStaffPanel from "./calendar/EventStaffPanel";
import EventNotes from "./calendar/EventNotes";
import PendingStaffPicker, { type PendingStaff } from "./calendar/PendingStaffPicker";
import { type EventTag, tagDefByKey, tagLabel } from "./calendar/eventTags";

// --- Types ---

export type RecurrenceFreq = "daily" | "weekly" | "biweekly" | "monthly";
export interface RecurrenceRule {
  freq: RecurrenceFreq;
  days?: number[]; // 0=Sun..6=Sat (used by weekly/biweekly/monthly-by-weekday)
  until?: string | null; // YYYY-MM-DD inclusive; null when repeating on a rolling "never" horizon
  never?: boolean;
}

interface DepartmentEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  department: string;
  links: string[];
  docs: string[];
  notes: string | null;
  color: string;
  tags: EventTag[] | unknown;
  recurrence?: RecurrenceRule | unknown | null;
  series_id?: string | null;
  is_recurring_child?: boolean;
  created_at: string;
  updated_at: string;
}

interface DiscoveredEvent {
  id: string;
  event_name: string;
  event_date: string;
  event_time: string | null;
  venue: string | null;
  location: string | null;
  event_type: string;
  description: string | null;
  expected_attendance: string | null;
  source_url: string | null;
  source_info: string | null;
  status: string;
  decline_reason: string | null;
  approved_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  organizer_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
}

// --- Constants ---

const COLORS = [
  { value: "primary", label: "Blue", class: "bg-primary" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
];

const colorToClass = (color: string) => COLORS.find((c) => c.value === color)?.class || "bg-primary";
const colorToBorder = (color: string) => {
  const map: Record<string, string> = { primary: "border-primary/60", red: "border-red-500/60", green: "border-green-500/60", yellow: "border-yellow-500/60", purple: "border-purple-500/60", pink: "border-pink-500/60", orange: "border-orange-500/60" };
  return map[color] || "border-primary/60";
};
const colorToBg = (color: string) => {
  const map: Record<string, string> = { primary: "bg-primary/10", red: "bg-red-500/10", green: "bg-green-500/10", yellow: "bg-yellow-500/10", purple: "bg-purple-500/10", pink: "bg-pink-500/10", orange: "bg-orange-500/10" };
  return map[color] || "bg-primary/10";
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  concert: "Concert", festival: "Festival", sports: "Sports", nightlife: "Nightlife",
  conference: "Conference", art: "Art", city_event: "City Event", party: "Party",
  corporate: "Corporate", other: "Other",
};
const EVENT_TYPE_COLORS: Record<string, string> = {
  concert: "bg-purple-500/20 text-purple-300", festival: "bg-pink-500/20 text-pink-300",
  sports: "bg-green-500/20 text-green-300", nightlife: "bg-blue-500/20 text-blue-300",
  conference: "bg-yellow-500/20 text-yellow-300", art: "bg-orange-500/20 text-orange-300",
  city_event: "bg-cyan-500/20 text-cyan-300", party: "bg-red-500/20 text-red-300",
  corporate: "bg-slate-500/20 text-slate-300", other: "bg-muted text-muted-foreground",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RECURRENCE_ROLLING_MONTHS = 24;

const formatDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isRecurrenceRule = (value: unknown): value is RecurrenceRule =>
  !!value && typeof value === "object" && "freq" in value;

// --- Component ---

interface Props { department?: string; }

const EventCalendar = ({ department = "all" }: Props) => {
  // Calendar state
  const [events, setEvents] = useState<DepartmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DepartmentEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<DepartmentEvent | null>(null);

  // Discovery state
  const [activeTab, setActiveTab] = useState<"calendar" | "queue">("calendar");
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [discovering, setDiscovering] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<DiscoveredEvent[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [declineDialogEvent, setDeclineDialogEvent] = useState<DiscoveredEvent | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reviewEvent, setReviewEvent] = useState<DiscoveredEvent | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDepartment, setFormDepartment] = useState(department);
  const [formLinkRows, setFormLinkRows] = useState<string[]>([""]);
  const [formDocUrls, setFormDocUrls] = useState<{ url: string; name: string }[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [formTags, setFormTags] = useState<EventTag[]>([]);
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  // Recurrence
  const [formRepeatFreq, setFormRepeatFreq] = useState<"none" | RecurrenceFreq>("none");
  const [formRepeatDays, setFormRepeatDays] = useState<number[]>([]); // 0=Sun..6=Sat
  const [formRepeatUntil, setFormRepeatUntil] = useState<string>("");
  const [formRepeatNever, setFormRepeatNever] = useState(false);
  const [editScope, setEditScope] = useState<"single" | "series">("single");

  // Auto-derive color from department + tags (industry-aware)
  const autoColor = useMemo(() => {
    // Tag-based priority overrides
    if (formTags.some((t) => t.key === "security")) return "red";
    if (formTags.some((t) => t.key === "drivers")) return "primary";
    if (formTags.some((t) => t.key === "photographer" || t.key === "videographer")) return "purple";
    if (formTags.some((t) => t.key === "brand_ambassadors")) return "yellow";
    if (formTags.some((t) => t.key === "management")) return "green";
    // Department fallback
    const map: Record<string, string> = {
      ops: "primary",
      marketing: "pink",
      support: "green",
      admin: "orange",
      development: "purple",
      all: "primary",
    };
    return map[formDepartment] || "primary";
  }, [formTags, formDepartment]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // --- Data fetching ---

  const fetchEvents = async () => {
    setLoading(true);
    const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0];
    // Pull any event that overlaps the visible month: starts on/before end AND ends on/after start.
    // end_date may be null on legacy rows — treat null as same-day via OR clause.
    const query = supabase
      .from("department_events")
      .select("*")
      .lte("event_date", endOfMonth)
      .or(`end_date.gte.${startOfMonth},and(end_date.is.null,event_date.gte.${startOfMonth})`)
      .order("event_date", { ascending: true });
    const { data, error } = await query;
    if (error) toast({ title: "Error loading events", description: error.message, variant: "destructive" });
    else setEvents((data || []) as DepartmentEvent[]);
    setLoading(false);
  };

  const fetchPendingEvents = async () => {
    setLoadingPending(true);
    const { data, error } = await supabase
      .from("discovered_events")
      .select("*")
      .eq("status", "pending")
      .order("event_date", { ascending: true });
    if (!error) setPendingEvents((data || []) as unknown as DiscoveredEvent[]);
    setLoadingPending(false);
  };

  useEffect(() => { fetchEvents(); }, [year, month, department]);
  useEffect(() => { if (activeTab === "queue") fetchPendingEvents(); }, [activeTab]);

  // Deep-link: open a specific event when ?event=<id> is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("department_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (!cancelled && data) {
        setDetailEvent(data as DepartmentEvent);
        setActiveTab("calendar");
        // Jump calendar to that month
        const d = new Date(data.event_date + "T12:00:00");
        setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- Calendar grid ---

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ date: prevDays - i, month: month - 1, year, isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: i, month, year, isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ date: i, month: month + 1, year, isCurrentMonth: false });
    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, DepartmentEvent[]> = {};
    const toDate = (s: string) => new Date(s + "T12:00:00");
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    events.forEach((e) => {
      const start = toDate(e.event_date);
      const end = toDate(e.end_date || e.event_date);
      const cur = new Date(start);
      // Cap span at 366 days to avoid runaway loops on bad data
      let safety = 0;
      while (cur <= end && safety < 400) {
        const key = fmt(cur);
        if (!map[key]) map[key] = [];
        map[key].push(e);
        cur.setDate(cur.getDate() + 1);
        safety++;
      }
    });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => events.filter((e) => e.event_date >= todayStr).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 5), [events, todayStr]);
  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  // --- Handlers ---

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const resetForm = () => {
    setFormTitle(""); setFormDescription(""); setFormDate(""); setFormEndDate(""); setFormTime(""); setFormEndTime("");
    setFormLocation(""); setFormDepartment(department);
    setFormLinkRows([""]); setFormDocUrls([]);
    setFormNotes(""); setFormTags([]); setPendingStaff([]); setEditingEvent(null);
    setFormRepeatFreq("none"); setFormRepeatDays([]); setFormRepeatUntil(""); setFormRepeatNever(false); setEditScope("single");
  };

  const openAddDialog = (dateStr?: string) => { resetForm(); if (dateStr) setFormDate(dateStr); setShowAddDialog(true); };
  const openEditDialog = async (event: DepartmentEvent) => {
    let source = event;
    if (event.is_recurring_child && event.series_id) {
      const { data: parent } = await supabase
        .from("department_events")
        .select("*")
        .eq("series_id", event.series_id)
        .eq("is_recurring_child", false)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (parent) source = parent as DepartmentEvent;
    }
    setEditingEvent(source); setFormTitle(source.title); setFormDescription(source.description || ""); setFormDate(source.event_date);
    setFormEndDate(source.end_date && source.end_date !== source.event_date ? source.end_date : "");
    setFormTime(source.event_time || ""); setFormEndTime(source.end_time || ""); setFormLocation(source.location || "");
    setFormDepartment(source.department);
    setFormLinkRows((source.links || []).length > 0 ? source.links : [""]);
    setFormDocUrls((source.docs || []).map((url) => ({ url, name: decodeURIComponent(url.split("/").pop() || "document") })));
    setFormNotes(source.notes || "");
    setFormTags(Array.isArray(source.tags) ? (source.tags as EventTag[]) : []);
    // Recurrence: if this event has a rule, prefill; otherwise default to none
    const rec = source.recurrence as RecurrenceRule | null | undefined;
    if (isRecurrenceRule(rec)) {
      setFormRepeatFreq(rec.freq);
      setFormRepeatDays(Array.isArray(rec.days) ? rec.days : []);
      setFormRepeatUntil(rec.until || "");
      setFormRepeatNever(!!rec.never || !rec.until);
    } else {
      setFormRepeatFreq("none"); setFormRepeatDays([]); setFormRepeatUntil(""); setFormRepeatNever(false);
    }
    setEditScope("single");
    setShowAddDialog(true);
  };

  const handleDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingDocs(true);
    const uploaded: { url: string; name: string }[] = [];
    for (const file of Array.from(files)) {
      const path = `${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("event-docs").upload(path, file, { upsert: false });
      if (upErr) { toast({ title: `Upload failed: ${file.name}`, description: upErr.message, variant: "destructive" }); continue; }
      const { data: urlData } = supabase.storage.from("event-docs").getPublicUrl(path);
      uploaded.push({ url: urlData.publicUrl, name: file.name });
    }
    setFormDocUrls((prev) => [...prev, ...uploaded]);
    setUploadingDocs(false);
    if (uploaded.length) toast({ title: `${uploaded.length} document${uploaded.length > 1 ? "s" : ""} uploaded` });
  };

  const dispatchAssignments = async (eventId: string, eventTitle: string, staff: PendingStaff[], notify: boolean = true) => {
    if (staff.length === 0) return [];
    const { data: { user: meUser } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    const rows = staff.map((s) => ({
      event_id: eventId,
      user_id: s.user_id,
      user_email: s.user_email,
      user_name: s.user_name,
      user_phone: s.user_phone,
      role_tag: s.role_tag,
      notify_email: true,
      notify_sms: !!s.user_phone,
      status: "pending",
      assigned_by: meUser?.id,
    }));
    const { data: inserted, error } = await supabase
      .from("event_staff_assignments")
      .insert(rows)
      .select();
    if (error) { toast({ title: "Staff insert failed", description: error.message, variant: "destructive" }); return []; }
    if (notify) {
      await Promise.all((inserted || []).map((r: any) =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ assignment_id: r.id, kind: "request" }),
        }).catch(() => null)
      ));
      toast({ title: `${staff.length} staff notified`, description: `Email + SMS sent for "${eventTitle}"` });
    }
    return inserted || [];
  };

  const deleteRecurringChildren = async (seriesId: string) => {
    const { data: children } = await supabase
      .from("department_events")
      .select("id")
      .eq("series_id", seriesId)
      .eq("is_recurring_child", true);
    const childIds = (children || []).map((c) => c.id);
    if (childIds.length > 0) {
      const { data: assignments } = await supabase.from("event_staff_assignments").select("id").in("event_id", childIds);
      const assignmentIds = (assignments || []).map((a) => a.id);
      await supabase.from("calendar_notifications").delete().in("event_id", childIds);
      if (assignmentIds.length > 0) await supabase.from("calendar_notifications").delete().in("assignment_id", assignmentIds);
      if (assignmentIds.length > 0) await supabase.from("event_staff_assignments").delete().in("id", assignmentIds);
      await supabase.from("department_events").delete().in("id", childIds);
    }
  };

  const copyAssignmentsToEvents = async (sourceEventId: string, targetEvents: { id: string }[]) => {
    if (targetEvents.length === 0) return;
    const { data: sourceAssignments } = await supabase
      .from("event_staff_assignments")
      .select("*")
      .eq("event_id", sourceEventId);
    if (!sourceAssignments || sourceAssignments.length === 0) return;
    const rows = targetEvents.flatMap((ev) =>
      (sourceAssignments as any[]).map((a) => ({
        event_id: ev.id,
        user_id: a.user_id,
        user_email: a.user_email,
        user_name: a.user_name,
        user_phone: a.user_phone,
        role_tag: a.role_tag,
        notify_email: a.notify_email,
        notify_sms: a.notify_sms,
        status: a.status,
        response_reason: a.response_reason,
        responded_at: a.responded_at,
        reminders_sent: Array.isArray(a.reminders_sent) && a.reminders_sent.includes("request") ? a.reminders_sent : ["request"],
        assigned_by: a.assigned_by,
      }))
    );
    await supabase.from("event_staff_assignments").insert(rows);
  };

  // --- Recurrence helpers ---
  const getEffectiveRecurrenceUntil = (startDate: string, rule: RecurrenceRule): string => {
    if (rule.never || !rule.until) {
      const horizon = new Date(startDate + "T12:00:00");
      horizon.setMonth(horizon.getMonth() + RECURRENCE_ROLLING_MONTHS);
      return formatDateKey(horizon);
    }
    return rule.until;
  };

  const getRecurrenceAnchor = (start: Date, days: number[]) => {
    const anchors = days.map((dow) => {
      const d = new Date(start);
      d.setDate(start.getDate() + ((dow - start.getDay() + 7) % 7));
      return d;
    });
    return anchors.sort((a, b) => a.getTime() - b.getTime())[0] || start;
  };

  const isSameMonthlyWeekday = (candidate: Date, start: Date, days: number[]) => {
    if (days.length === 0) return candidate.getDate() === start.getDate();
    const anchor = getRecurrenceAnchor(start, days);
    const weekOfMonth = Math.floor((anchor.getDate() - 1) / 7);
    return days.includes(candidate.getDay()) && Math.floor((candidate.getDate() - 1) / 7) === weekOfMonth;
  };

  // Generate occurrence start dates based on rule, starting AFTER the parent date.
  const generateOccurrenceDates = (startDate: string, rule: RecurrenceRule): string[] => {
    const out: string[] = [];
    const start = new Date(startDate + "T12:00:00");
    const until = new Date(getEffectiveRecurrenceUntil(startDate, rule) + "T12:00:00");
    if (until <= start) return out;
    const MAX = 760; // two-year rolling cap for never-ending series
    let cur = new Date(start);
    cur.setDate(cur.getDate() + 1);
    let count = 0;
    while (cur <= until && count < MAX) {
      const dow = cur.getDay();
      const days = rule.days && rule.days.length ? rule.days : [start.getDay()];
      let include = false;
      if (rule.freq === "daily") include = true;
      else if (rule.freq === "weekly") {
        include = days.includes(dow);
      } else if (rule.freq === "biweekly") {
        const anchor = getRecurrenceAnchor(start, days);
        const diffWeeks = Math.floor((cur.getTime() - anchor.getTime()) / (7 * 24 * 3600 * 1000));
        include = days.includes(dow) && diffWeeks % 2 === 0;
      } else if (rule.freq === "monthly") {
        include = isSameMonthlyWeekday(cur, start, rule.days || []);
      }
      if (include) {
        out.push(formatDateKey(cur));
      }
      cur.setDate(cur.getDate() + 1);
      count++;
    }
    return out;
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) { toast({ title: "Title and date are required", variant: "destructive" }); return; }
    const resolvedEnd = (formEndDate && formEndDate >= formDate) ? formEndDate : formDate;
    const eventDays = (new Date(resolvedEnd + "T12:00:00").getTime() - new Date(formDate + "T12:00:00").getTime()) / (24 * 3600 * 1000);

    // Validate recurrence inputs (don't silently drop the rule)
    if (formRepeatFreq !== "none" && !formRepeatNever && !formRepeatUntil) {
      toast({ title: "Pick a repeat end date or choose Never", description: "Repeating events need either an end date or the Never option.", variant: "destructive" });
      return;
    }
    if (formRepeatFreq !== "none" && !formRepeatNever && formRepeatUntil && formRepeatUntil <= formDate) {
      toast({ title: "'Repeat until' must be after the start date", variant: "destructive" });
      return;
    }
    // For day-based repeats, default to the start date's day-of-week if user didn't pick any
    let resolvedDays = formRepeatDays;
    if ((formRepeatFreq === "weekly" || formRepeatFreq === "biweekly" || formRepeatFreq === "monthly") && resolvedDays.length === 0) {
      const startDow = new Date(formDate + "T12:00:00").getDay();
      resolvedDays = [startDow];
    }
    const recurrenceRule: RecurrenceRule | null = formRepeatFreq !== "none"
      ? { freq: formRepeatFreq, days: formRepeatFreq === "daily" ? [] : resolvedDays, until: formRepeatNever ? null : formRepeatUntil, never: formRepeatNever }
      : null;

    const basePayload: any = {
      title: formTitle.trim(), description: formDescription.trim() || null,
      event_time: formTime || null, end_time: formEndTime || null, location: formLocation.trim() || null,
      department: formDepartment,
      links: formLinkRows.map((l) => l.trim()).filter(Boolean),
      docs: formDocUrls.map((d) => d.url),
      notes: formNotes.trim() || null, color: autoColor, tags: formTags,
    };

    if (editingEvent) {
      // Update path. If it's part of a series and user picked "all", apply to whole series (excluding date fields).
      const updatePayload = {
        ...basePayload,
        event_date: formDate, end_date: resolvedEnd,
        recurrence: recurrenceRule as any,
      };
      if (editScope === "series" && editingEvent.series_id) {
        const seriesId = editingEvent.series_id;
        const parentId = editingEvent.id;
        const { error } = await supabase.from("department_events")
          .update({ ...updatePayload, series_id: seriesId, is_recurring_child: false })
          .eq("id", parentId);
        if (error) { toast({ title: "Error updating series", description: error.message, variant: "destructive" }); return; }
        await deleteRecurringChildren(seriesId);
        if (recurrenceRule) {
          const dates = generateOccurrenceDates(formDate, recurrenceRule);
          const childRows = dates.map((d) => {
            const childEnd = new Date(new Date(d + "T12:00:00").getTime() + eventDays * 24 * 3600 * 1000);
            const ey = childEnd.getFullYear(), em = String(childEnd.getMonth() + 1).padStart(2, "0"), ed = String(childEnd.getDate()).padStart(2, "0");
            return { ...basePayload, event_date: d, end_date: `${ey}-${em}-${ed}`, recurrence: recurrenceRule as any, series_id: seriesId, is_recurring_child: true };
          });
          if (childRows.length > 0) {
            const { data: children, error: childErr } = await supabase.from("department_events").insert(childRows).select("id");
            if (childErr) { toast({ title: "Some occurrences failed", description: childErr.message, variant: "destructive" }); }
            else await copyAssignmentsToEvents(parentId, children || []);
          }
        }
        toast({ title: "Series updated" });
      } else {
        const { error } = await supabase.from("department_events").update(updatePayload).eq("id", editingEvent.id);
        if (error) { toast({ title: "Error updating event", description: error.message, variant: "destructive" }); return; }

        // If a recurrence rule was added/changed on this event, regenerate child occurrences from the saved parent.
        if (!editingEvent.is_recurring_child) {
          const parentId = editingEvent.id;
          const seriesId = editingEvent.series_id || parentId;
          await supabase.from("department_events").update({ series_id: seriesId, is_recurring_child: false, recurrence: recurrenceRule as any }).eq("id", parentId);
          await deleteRecurringChildren(seriesId);

          if (recurrenceRule) {
            const dates = generateOccurrenceDates(formDate, recurrenceRule);
            const childRows = dates.map((d) => {
              const childEnd = new Date(new Date(d + "T12:00:00").getTime() + eventDays * 24 * 3600 * 1000);
              const ey = childEnd.getFullYear(), em = String(childEnd.getMonth() + 1).padStart(2, "0"), ed = String(childEnd.getDate()).padStart(2, "0");
              return { ...basePayload, event_date: d, end_date: `${ey}-${em}-${ed}`, recurrence: recurrenceRule as any, series_id: seriesId, is_recurring_child: true };
            });
            if (childRows.length > 0) {
              const { data: children, error: childErr } = await supabase.from("department_events").insert(childRows).select("id");
              if (childErr) { toast({ title: "Some occurrences failed", description: childErr.message, variant: "destructive" }); }
              else {
                await copyAssignmentsToEvents(parentId, children || []);
                toast({ title: "Event updated", description: `+ ${children?.length || 0} repeating occurrences` });
              }
            } else {
              toast({ title: "Event updated" });
            }
          } else {
            toast({ title: "Event updated" });
          }
        } else {
          toast({ title: "Event updated" });
        }
      }
    } else {
      // Create parent event
      const parentPayload = {
        ...basePayload,
        event_date: formDate, end_date: resolvedEnd,
        recurrence: recurrenceRule as any,
        is_recurring_child: false,
      };
      const { data: parent, error } = await supabase.from("department_events").insert(parentPayload).select().single();
      if (error) { toast({ title: "Error creating event", description: error.message, variant: "destructive" }); return; }
      // Set series_id = parent.id so we can join occurrences later
      await supabase.from("department_events").update({ series_id: parent.id }).eq("id", parent.id);

      // Dispatch staff to parent (with notification)
      await dispatchAssignments(parent.id, parent.title, pendingStaff, true);

      // Generate child occurrences if recurrence was provided
      if (recurrenceRule) {
        const dates = generateOccurrenceDates(formDate, recurrenceRule);
        if (dates.length > 0) {
          const childRows = dates.map((d) => {
            const childEnd = new Date(new Date(d + "T12:00:00").getTime() + eventDays * 24 * 3600 * 1000);
            const ey = childEnd.getFullYear(), em = String(childEnd.getMonth() + 1).padStart(2, "0"), ed = String(childEnd.getDate()).padStart(2, "0");
            return {
              ...basePayload,
              event_date: d,
              end_date: `${ey}-${em}-${ed}`,
              recurrence: recurrenceRule as any,
              series_id: parent.id,
              is_recurring_child: true,
            };
          });
          const { data: children, error: childErr } = await supabase.from("department_events").insert(childRows).select();
          if (childErr) {
            toast({ title: "Some occurrences failed", description: childErr.message, variant: "destructive" });
          } else {
            // Copy staff assignments to each child WITHOUT initial notification (reminders will fire per-occurrence)
            await Promise.all((children || []).map((c: any) => dispatchAssignments(c.id, c.title, pendingStaff, false)));
            toast({ title: "Event created", description: `+ ${children?.length || 0} repeating occurrences` });
          }
        } else {
          toast({ title: "Event created" });
        }
      } else {
        toast({ title: "Event created" });
      }
    }
    setShowAddDialog(false); resetForm(); fetchEvents();
  };

  const handleDelete = async (id: string, scope: "single" | "series" = "single") => {
    if (scope === "series") {
      const target = events.find((e) => e.id === id);
      const seriesId = target?.series_id;
      if (seriesId) {
        const { error } = await supabase.from("department_events").delete().eq("series_id", seriesId);
        if (error) { toast({ title: "Error deleting series", description: error.message, variant: "destructive" }); return; }
        toast({ title: "Series deleted" }); setDetailEvent(null); fetchEvents();
        return;
      }
    }
    const { error } = await supabase.from("department_events").delete().eq("id", id);
    if (error) { toast({ title: "Error deleting event", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event deleted" }); setDetailEvent(null); fetchEvents();
  };

  // --- Discovery ---

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discover-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Discovery failed");
      toast({ title: `Found ${json.count} events`, description: "Review them in the Approval Queue." });
      setActiveTab("queue");
      fetchPendingEvents();
    } catch (err: any) {
      toast({ title: "Discovery failed", description: err.message, variant: "destructive" });
    } finally {
      setDiscovering(false);
    }
  };

  const handleApprove = async (event: DiscoveredEvent) => {
    // Add to department_events calendar
    const { error: calError } = await supabase.from("department_events").insert({
      title: event.event_name,
      description: `${event.description || ""}\n\nVenue: ${event.venue || "TBD"}\nLocation: ${event.location || "Miami, FL"}\nExpected Attendance: ${event.expected_attendance || "N/A"}\nType: ${EVENT_TYPE_LABELS[event.event_type] || event.event_type}`,
      event_date: event.event_date,
      event_time: event.event_time || null,
      department: "all",
      links: event.source_url ? [event.source_url] : [],
      docs: [],
      notes: event.source_info || null,
      color: "green",
    });
    if (calError) { toast({ title: "Error adding to calendar", description: calError.message, variant: "destructive" }); return; }

    // Mark as approved
    const { error } = await supabase.from("discovered_events").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", event.id);
    if (error) { toast({ title: "Error approving", description: error.message, variant: "destructive" }); return; }

    toast({ title: "Event approved & added to calendar" });
    setReviewEvent(null);
    fetchPendingEvents();
    fetchEvents();
  };

  const handleDecline = async () => {
    if (!declineDialogEvent || !declineReason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }
    const { error } = await supabase.from("discovered_events").update({
      status: "declined", decline_reason: declineReason.trim(), reviewed_at: new Date().toISOString(),
    }).eq("id", declineDialogEvent.id);
    if (error) { toast({ title: "Error declining", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event declined", description: "The AI will learn from this feedback." });
    setDeclineDialogEvent(null); setDeclineReason(""); setReviewEvent(null); fetchPendingEvents();
  };

  // --- Calendar Sync ---

  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed${department !== "all" ? `?department=${department}` : ""}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");

  const copyFeedUrl = async () => {
    await navigator.clipboard.writeText(feedUrl);
    toast({ title: "Calendar URL copied", description: "Paste this into your calendar app's 'Add by URL' option." });
  };

  const downloadICS = () => {
    window.open(feedUrl, "_blank");
  };

  // --- Render ---

  return (
    <div className="space-y-4">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button data-tutorial="cal-tab-calendar" onClick={() => setActiveTab("calendar")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "calendar" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="h-3.5 w-3.5 inline mr-1" />Calendar
          </button>
          <button data-tutorial="cal-tab-queue" onClick={() => setActiveTab("queue")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${activeTab === "queue" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
            <Eye className="h-3.5 w-3.5 inline mr-1" />Approval Queue
            {pendingEvents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingEvents.length}</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:justify-end">
          {activeTab === "calendar" && (
            <div data-tutorial="cal-viewmode" className="flex items-center rounded-lg border border-border overflow-hidden">
              {(["month", "week", "day"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${viewMode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <Button
            size="sm"
            onClick={() => { setActiveTab("calendar"); setTutorialOpen(true); }}
            className="shrink-0 bg-gradient-to-b from-[hsl(0,0%,85%)] via-[hsl(0,0%,70%)] to-[hsl(0,0%,80%)] text-black font-bold border border-white/20 hover:btn-shimmer active:btn-shimmer"
          >
            <GraduationCap className="h-3.5 w-3.5 mr-1" />How it Works
          </Button>
          <Button data-tutorial="cal-sync" variant="fortiOutline" size="sm" onClick={() => setShowSyncDialog(true)}>
            <Share2 className="h-3.5 w-3.5 mr-1" />Sync
          </Button>
          <Button data-tutorial="cal-manage-links" variant="fortiOutline" size="sm" onClick={() => setShowManageDialog(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" />Manage Links
          </Button>
          <Button data-tutorial="cal-discover" variant="fortiOutline" size="sm" onClick={handleDiscover} disabled={discovering}>
            {discovering ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
            {discovering ? "Searching Miami..." : "Discover Events"}
          </Button>
          {activeTab === "calendar" && (
            <Button data-tutorial="cal-add-event" variant="forti" size="sm" onClick={() => openAddDialog()}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Event
            </Button>
          )}
          <span data-tutorial="cal-notifications"><NotificationBell /></span>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "calendar" ? (
        <>
          {/* Month nav */}
          <div data-tutorial="cal-month-nav" className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
              <Button variant="fortiGhost" size="sm" className="text-[10px] h-6" onClick={goToday}>Today</Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {viewMode === "month" && (
          <div data-tutorial="cal-grid" className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7">
              {DAYS.map((d) => (
                <div key={d} className="p-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dateStr = `${day.year}-${String(day.month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
                const dayEvents = day.isCurrentMonth ? eventsByDate[dateStr] || [] : [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const MAX_VISIBLE = 4;
                return (
                  <div key={i} className={`min-h-[110px] p-1 border-b border-r border-border cursor-pointer transition-colors hover:bg-muted/30 ${!day.isCurrentMonth ? "opacity-30" : ""} ${isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                    onClick={() => day.isCurrentMonth && openAddDialog(dateStr)}>
                    <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "text-primary-foreground bg-destructive" : ""}`}>{day.date}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, MAX_VISIBLE).map((ev) => {
                        const startStr = ev.event_date;
                        const endStr = ev.end_date || ev.event_date;
                        const isMultiDay = endStr > startStr;
                        const isStart = dateStr === startStr;
                        const isEnd = dateStr === endStr;
                        const isMiddle = isMultiDay && !isStart && !isEnd;
                        // Edge rounding so the event reads as one continuous bar
                        const radiusCls = !isMultiDay
                          ? "rounded"
                          : isStart
                            ? "rounded-l rounded-r-none -mr-1 pr-2"
                            : isEnd
                              ? "rounded-r rounded-l-none -ml-1 pl-2"
                              : "rounded-none -mx-1 px-2";
                        return (
                          <div
                            key={`${ev.id}-${dateStr}`}
                            className={`text-[9px] leading-tight truncate px-1 py-0.5 ${radiusCls} ${colorToBg(ev.color)} ${colorToBorder(ev.color)} ${isStart || !isMultiDay ? "border-l-2" : ""} cursor-pointer flex items-center gap-1`}
                            onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                            title={`${ev.title}${isMultiDay ? ` (${startStr} → ${endStr})` : ""}`}
                          >
                            {isStart && ev.event_time && <span className="text-muted-foreground">{ev.event_time.slice(0, 5)}</span>}
                            {(isStart || !isMultiDay) && <span className="truncate">{ev.title}</span>}
                            {isMiddle && <span className="opacity-70 truncate">↔ {ev.title}</span>}
                            {isEnd && isMultiDay && <span className="opacity-90 truncate">{ev.title} ▸</span>}
                          </div>
                        );
                      })}
                      {dayEvents.length > MAX_VISIBLE && (
                        <button
                          type="button"
                          className="text-[9px] text-muted-foreground hover:text-foreground pl-1 underline-offset-2 hover:underline"
                          onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr); }}
                        >
                          +{dayEvents.length - MAX_VISIBLE} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {viewMode === "week" && (
            <WeekView
              weekStart={(() => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay()); return d; })()}
              events={events as unknown as CalEvent[]}
              onEventClick={(ev) => {
                const full = events.find((e) => e.id === ev.id);
                if (full) setDetailEvent(full);
              }}
              onSlotClick={(dateStr, hour) => {
                openAddDialog(dateStr);
                setFormTime(`${String(hour).padStart(2, "0")}:00`);
              }}
            />
          )}

          {viewMode === "day" && (
            <DayView
              date={currentDate}
              events={events as unknown as CalEvent[]}
              onEventClick={(ev) => {
                const full = events.find((e) => e.id === ev.id);
                if (full) setDetailEvent(full);
              }}
              onSlotClick={(dateStr, hour) => {
                openAddDialog(dateStr);
                setFormTime(`${String(hour).padStart(2, "0")}:00`);
              }}
            />
          )}

          {/* Upcoming events */}
          {!selectedDate && upcomingEvents.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" />Upcoming Events</h4>
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-muted/50 transition-colors border ${colorToBorder(ev.color)}`} onClick={() => setDetailEvent(ev)}>
                    <div className="text-center shrink-0 w-10">
                      <div className="text-[10px] text-muted-foreground uppercase">{new Date(ev.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}</div>
                      <div className="text-lg font-bold leading-none">{new Date(ev.event_date + "T12:00:00").getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ev.title}</div>
                      {ev.event_time && <div className="text-[10px] text-muted-foreground">{ev.event_time.slice(0, 5)}</div>}
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${colorToClass(ev.color)}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Approval Queue */
        <div data-tutorial="cal-queue-panel" className="space-y-3">
          <div className="flex items-center justify-between">
            <div data-tutorial="cal-queue-header" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-sm">AI-Discovered Events</h3>
              <Badge variant="outline" className="text-[10px]">{pendingEvents.length} pending</Badge>
            </div>
            <Button data-tutorial="cal-queue-refresh" variant="fortiGhost" size="sm" onClick={fetchPendingEvents} disabled={loadingPending}>
              {loadingPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {loadingPending ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Search className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No pending events to review.</p>
              <Button variant="fortiGhost" size="sm" onClick={handleDiscover} disabled={discovering}>
                {discovering ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                Search for Events
              </Button>
            </div>
          ) : (
            <div data-tutorial="cal-queue-list" className="space-y-2">
              {pendingEvents.map((ev, qi) => (
                <div key={ev.id} data-tutorial={qi === 0 ? "cal-queue-card" : undefined} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{ev.event_name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${EVENT_TYPE_COLORS[ev.event_type] || EVENT_TYPE_COLORS.other}`}>
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(ev.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                        {ev.event_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ev.event_time}</span>}
                        {ev.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.venue}</span>}
                        {ev.expected_attendance && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev.expected_attendance}</span>}
                      </div>
                    </div>
                    <div data-tutorial={qi === 0 ? "cal-queue-actions" : undefined} className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReviewEvent(ev)} title="Review details"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10" onClick={() => handleApprove(ev)} title="Approve"><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => { setDeclineDialogEvent(ev); setDeclineReason(""); }} title="Decline"><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {ev.description && <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>}
                  {ev.source_url && (
                    <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="h-2.5 w-2.5" /> Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review detail dialog */}
      <Dialog open={!!reviewEvent} onOpenChange={(open) => !open && setReviewEvent(null)}>
        <DialogContent className="max-w-lg">
          {reviewEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  {reviewEvent.event_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${EVENT_TYPE_COLORS[reviewEvent.event_type] || EVENT_TYPE_COLORS.other}`}>
                  {EVENT_TYPE_LABELS[reviewEvent.event_type] || reviewEvent.event_type}
                </span>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Date</span>{new Date(reviewEvent.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                  {reviewEvent.event_time && <div><span className="text-xs text-muted-foreground block">Time</span>{reviewEvent.event_time}</div>}
                  {reviewEvent.venue && <div><span className="text-xs text-muted-foreground block">Venue</span>{reviewEvent.venue}</div>}
                  {reviewEvent.location && <div><span className="text-xs text-muted-foreground block">Location</span>{reviewEvent.location}</div>}
                  {reviewEvent.expected_attendance && <div className="col-span-2"><span className="text-xs text-muted-foreground block">Expected Attendance</span>{reviewEvent.expected_attendance}</div>}
                </div>
                {reviewEvent.description && <div><span className="text-xs text-muted-foreground block mb-1">Description</span><p className="text-sm whitespace-pre-wrap">{reviewEvent.description}</p></div>}
                {(reviewEvent.organizer_name || reviewEvent.contact_email || reviewEvent.contact_phone || reviewEvent.contact_website) && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                    <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wide">Contact Info</span>
                    {reviewEvent.organizer_name && <div className="text-sm">👤 {reviewEvent.organizer_name}</div>}
                    {reviewEvent.contact_email && <div className="text-sm">✉️ <a href={`mailto:${reviewEvent.contact_email}`} className="text-primary hover:underline">{reviewEvent.contact_email}</a></div>}
                    {reviewEvent.contact_phone && <div className="text-sm">📞 <a href={`tel:${reviewEvent.contact_phone}`} className="text-primary hover:underline">{reviewEvent.contact_phone}</a></div>}
                    {reviewEvent.contact_website && <div className="text-sm">🌐 <a href={reviewEvent.contact_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{reviewEvent.contact_website}</a></div>}
                  </div>
                )}
                {reviewEvent.source_info && <div><span className="text-xs text-muted-foreground block mb-1">Source</span><p className="text-sm">{reviewEvent.source_info}</p></div>}
                {reviewEvent.source_url && <a href={reviewEvent.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View Source</a>}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="forti" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(reviewEvent)}>
                    <Check className="h-3 w-3 mr-1" /> Approve & Add to Calendar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400" onClick={() => { setDeclineDialogEvent(reviewEvent); setDeclineReason(""); }}>
                    <ThumbsDown className="h-3 w-3 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline reason dialog */}
      <Dialog open={!!declineDialogEvent} onOpenChange={(open) => { if (!open) { setDeclineDialogEvent(null); setDeclineReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-500" />Decline Event</DialogTitle>
          </DialogHeader>
          {declineDialogEvent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Why are you declining <strong>"{declineDialogEvent.event_name}"</strong>? This feedback helps the AI make better suggestions.</p>
              <Textarea placeholder="e.g. Too small of an event, not our target audience, wrong area, already partnered with another service..." value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={4} />
              <div className="flex gap-2 justify-end">
                <Button variant="fortiGhost" size="sm" onClick={() => { setDeclineDialogEvent(null); setDeclineReason(""); }}>Cancel</Button>
                <Button variant="forti" size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDecline} disabled={!declineReason.trim()}>
                  <ThumbsDown className="h-3 w-3 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colorToClass(detailEvent.color)}`} />
                  <DialogTitle>{detailEvent.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(detailEvent.event_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
                  {detailEvent.event_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{detailEvent.event_time.slice(0, 5)}{detailEvent.end_time ? ` – ${detailEvent.end_time.slice(0, 5)}` : ""}</span>}
                  {detailEvent.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{detailEvent.location}</span>}
                </div>
                {(() => {
                  const rec = detailEvent.recurrence as RecurrenceRule | null | undefined;
                  if (!isRecurrenceRule(rec)) {
                    if (detailEvent.is_recurring_child) {
                      return <div className="text-xs text-muted-foreground flex items-center gap-1"><Repeat className="h-3 w-3" /> One occurrence in a repeating series</div>;
                    }
                    return null;
                  }
                  const freqLabel: Record<string, string> = { daily: "Daily", weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly" };
                  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const daysStr = rec.freq !== "daily" && rec.days?.length
                    ? ` on ${rec.days.map((d: number) => dayNames[d]).join(", ")}` : "";
                  const untilStr = rec.never || !rec.until ? " forever" : ` until ${new Date(rec.until + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                  return (
                    <div className="text-xs text-foreground/80 bg-muted/50 rounded-md px-2 py-1.5 flex items-center gap-1.5 w-fit">
                      <Repeat className="h-3 w-3" /> Repeats {freqLabel[rec.freq] || rec.freq}{daysStr}{untilStr}
                    </div>
                  );
                })()}
                {Array.isArray(detailEvent.tags) && (detailEvent.tags as EventTag[]).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(detailEvent.tags as EventTag[]).map((t) => {
                      const def = tagDefByKey(t.key);
                      if (!def) return null;
                      return (
                        <span key={t.key} className={`text-[10px] px-2 py-0.5 rounded border ${def.color}`}>
                          {tagLabel(t)}
                        </span>
                      );
                    })}
                  </div>
                )}
                {detailEvent.description && <div><h5 className="text-xs font-medium text-muted-foreground mb-1">About</h5><p className="text-sm whitespace-pre-wrap">{detailEvent.description}</p></div>}
                {(detailEvent.links?.length || 0) > 0 && (
                  <div><h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" /> Links</h5>
                    <div className="space-y-1">{detailEvent.links.map((link, i) => (<a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-2.5 w-2.5" />{link}</a>))}</div>
                  </div>
                )}
                {(detailEvent.docs?.length || 0) > 0 && (
                  <div><h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Documents</h5>
                    <div className="space-y-1">{detailEvent.docs.map((doc, i) => (<a key={i} href={doc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="h-2.5 w-2.5" />{doc}</a>))}</div>
                  </div>
                )}
                {detailEvent.notes && <div><h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><StickyNote className="h-3 w-3" /> Notes</h5><p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{detailEvent.notes}</p></div>}

                <div className="border-t border-border pt-3">
                  <EventStaffPanel eventId={detailEvent.id} eventTitle={detailEvent.title} eventDate={detailEvent.event_date} eventTime={detailEvent.event_time} />
                </div>

                <div className="border-t border-border pt-3">
                  <EventNotes eventId={detailEvent.id} eventTitle={detailEvent.title} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button variant="fortiGhost" size="sm" onClick={() => { setDetailEvent(null); openEditDialog(detailEvent); }}><Edit3 className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(detailEvent.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                  {detailEvent.series_id && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete ALL occurrences in this repeating series?")) handleDelete(detailEvent.id, "series"); }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete series
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm(); } }}>
        <DialogContent data-tutorial="cal-add-dialog" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div data-tutorial="cal-form-title" className="space-y-1"><label className="text-xs text-muted-foreground">Title *</label><Input placeholder="Event title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
            <div data-tutorial="cal-form-description" className="space-y-1"><label className="text-xs text-muted-foreground">What is this about?</label><Textarea placeholder="Describe the event..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} /></div>
            <div data-tutorial="cal-form-datetime" className="grid gap-3 grid-cols-2">
              <div className="space-y-1"><label className="text-xs text-muted-foreground">Start Date *</label><Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} /></div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End Date <span className="opacity-60">(optional)</span></label>
                <Input type="date" value={formEndDate} min={formDate || undefined} onChange={(e) => setFormEndDate(e.target.value)} />
              </div>
            </div>
            <div data-tutorial="cal-form-endloc" className="grid gap-3 grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start Time</label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End Time</label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Location</label>
                <Input placeholder="Event location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} />
              </div>
            </div>

            {/* Recurrence */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Repeats</label>
                  <p className="text-[11px] text-muted-foreground">
                    {editingEvent && editingEvent.is_recurring_child
                      ? "This is one occurrence in a repeating series. Edit the original event to change the rule."
                      : "Auto-create future occurrences. Reminders fire per-date — no duplicate 'created' notifications."}
                  </p>
                </div>
                <Select value={formRepeatFreq} onValueChange={(v: any) => setFormRepeatFreq(v)} disabled={!!editingEvent?.is_recurring_child}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formRepeatFreq === "weekly" || formRepeatFreq === "biweekly" || formRepeatFreq === "monthly") && (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">
                    {formRepeatFreq === "monthly" ? "Repeat monthly on" : "Repeat on"}
                  </label>
                  <div className="flex gap-1">
                    {DAYS.map((d, idx) => {
                      const active = formRepeatDays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFormRepeatDays((prev) =>
                              prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort()
                            )
                          }
                          className={`h-8 w-8 rounded-md text-xs font-medium border transition ${
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card text-foreground border-border hover:border-foreground/40"
                          }`}
                        >
                          {d[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {formRepeatFreq !== "none" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] text-muted-foreground">Repeat until</label>
                    <button
                      type="button"
                      onClick={() => setFormRepeatNever((prev) => !prev)}
                      className={`text-[11px] px-2 py-1 rounded border transition ${formRepeatNever ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:border-foreground/40"}`}
                    >
                      Never
                    </button>
                  </div>
                  <Input
                    type="date"
                    value={formRepeatUntil}
                    min={formDate || undefined}
                    disabled={formRepeatNever}
                    onChange={(e) => setFormRepeatUntil(e.target.value)}
                  />
                  {formRepeatNever && (
                    <p className="text-[10px] text-muted-foreground">Shows the next 24 months and keeps the rule saved as never-ending.</p>
                  )}
                </div>
              )}
              {editingEvent && editingEvent.series_id && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <label className="text-[11px] text-muted-foreground">Apply changes to</label>
                  <Select value={editScope} onValueChange={(v: any) => setEditScope(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Only this occurrence</SelectItem>
                      <SelectItem value="series">All occurrences in series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div data-tutorial="cal-form-tags" className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Event Service Tags</label>
                <p className="text-[11px] text-muted-foreground">Choose the staffing/services needed for this event. Count fields appear for roles that need quantities.</p>
                <TagsEditor value={formTags} onChange={setFormTags} />
              </div>
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formTags.map((tag) => {
                    const def = tagDefByKey(tag.key);
                    if (!def) return null;
                    return (
                      <span key={tag.key} className={`text-[10px] px-2 py-0.5 rounded border ${def.color}`}>
                        {tagLabel(tag)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div data-tutorial="cal-form-deptcolor" className={`grid gap-3 ${department === "all" ? "grid-cols-2" : "grid-cols-1"}`}>
              {department === "all" && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Department</label>
                  <Select value={formDepartment} onValueChange={setFormDepartment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="ops">Ops</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Auto Color</label>
                <div className="flex items-center gap-2 pt-1.5">
                  <div className={`w-6 h-6 rounded-full ${colorToClass(autoColor)} ring-2 ring-offset-2 ring-offset-background ring-foreground`} title={autoColor} />
                  <span className="text-[11px] text-muted-foreground">Set automatically by department & service tags</span>
                </div>
              </div>
            </div>

            {/* Links — structured rows */}
            <div data-tutorial="cal-form-links" className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> Links</label>
              {formLinkRows.map((link, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={link}
                    onChange={(e) => {
                      const next = [...formLinkRows];
                      next[idx] = e.target.value;
                      setFormLinkRows(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      const next = formLinkRows.filter((_, i) => i !== idx);
                      setFormLinkRows(next.length ? next : [""]);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="fortiGhost"
                size="sm"
                onClick={() => setFormLinkRows([...formLinkRows, ""])}
              >
                <Plus className="h-3 w-3 mr-1" /> Add link
              </Button>
            </div>

            {/* Documents — file upload */}
            <div data-tutorial="cal-form-docs" className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Documents</label>
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                <input
                  type="file"
                  multiple
                  id="event-docs-input"
                  className="hidden"
                  accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
                  onChange={(e) => { handleDocUpload(e.target.files); e.target.value = ""; }}
                />
                <Button
                  type="button"
                  variant="fortiOutline"
                  size="sm"
                  disabled={uploadingDocs}
                  onClick={() => document.getElementById("event-docs-input")?.click()}
                >
                  {uploadingDocs ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
                  {uploadingDocs ? "Uploading…" : "Upload documents"}
                </Button>
                {formDocUrls.length > 0 && (
                  <div className="space-y-1">
                    {formDocUrls.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-card rounded px-2 py-1.5 border border-border">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:text-primary">{doc.name}</a>
                        <button
                          type="button"
                          onClick={() => setFormDocUrls(formDocUrls.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div data-tutorial="cal-form-notes" className="space-y-1"><label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Notes</label><Textarea placeholder="Additional notes..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} /></div>

            {editingEvent ? (
              <>
                {/* Staff assignments (live) */}
                <div className="border-t border-border pt-3">
                  <EventStaffPanel eventId={editingEvent.id} eventTitle={editingEvent.title} eventDate={editingEvent.event_date} eventTime={editingEvent.event_time} />
                </div>

                {/* Notes thread */}
                <div className="border-t border-border pt-3">
                  <EventNotes eventId={editingEvent.id} eventTitle={editingEvent.title} />
                </div>
              </>
            ) : (
              <PendingStaffPicker pending={pendingStaff} onChange={setPendingStaff} />
            )}

            <div data-tutorial="cal-form-save" className="flex gap-2 justify-end pt-2">
              <Button variant="fortiGhost" size="sm" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button>
              <Button variant="forti" size="sm" onClick={handleSave} disabled={!formTitle.trim() || !formDate}>
                {editingEvent ? "Update Event" : pendingStaff.length > 0 ? `Create & Notify ${pendingStaff.length}` : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" />Sync Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Subscribe to this calendar from Google Calendar, Apple Calendar, Outlook, or any app that supports iCal feeds. Events will auto-update.</p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Subscribe via URL</label>
                <p className="text-[10px] text-muted-foreground">Copy this URL and add it as a calendar subscription in your calendar app.</p>
                <div className="flex gap-2">
                  <Input value={feedUrl} readOnly className="text-xs font-mono" />
                  <Button variant="forti" size="icon" className="shrink-0" onClick={copyFeedUrl}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <label className="text-xs font-medium">Quick Add</label>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="fortiGhost" size="sm" className="w-full text-xs"><ExternalLink className="h-3 w-3 mr-1" />Google Calendar</Button>
                  </a>
                  <a href={webcalUrl}>
                    <Button variant="fortiGhost" size="sm" className="w-full text-xs"><ExternalLink className="h-3 w-3 mr-1" />Apple Calendar</Button>
                  </a>
                  <a href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=Forti+Events`} target="_blank" rel="noopener noreferrer">
                    <Button variant="fortiGhost" size="sm" className="w-full text-xs"><ExternalLink className="h-3 w-3 mr-1" />Outlook</Button>
                  </a>
                  <Button variant="fortiGhost" size="sm" className="text-xs" onClick={downloadICS}>
                    <Download className="h-3 w-3 mr-1" />Download .ics
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
                <p className="font-medium text-xs text-foreground">How it works:</p>
                <p>• <strong>Subscribe</strong> — your calendar auto-syncs every few hours</p>
                <p>• <strong>Download</strong> — one-time import of current events</p>
                <p>• Share the URL with team members so everyone stays in sync</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ManageShareLinks open={showManageDialog} onOpenChange={setShowManageDialog} department={department} />

      {tutorialOpen && (
        <DashboardTutorial
          onClose={() => { setTutorialOpen(false); setShowAddDialog(false); resetForm(); setActiveTab("calendar"); }}
          steps={[
            // ── Top toolbar
            {
              selector: '[data-tutorial="cal-tab-calendar"]',
              title: "Calendar Tab",
              body: "This is your home base. The Calendar tab shows every confirmed event across the operation in Month, Week, or Day view. Each colored chip is a real event — click one to drill into it, click an empty day to create a new one. Color is auto-derived from the department + service tags so you can read the schedule at a glance.",
              before: () => { setActiveTab("calendar"); setShowAddDialog(false); },
            },
            {
              selector: '[data-tutorial="cal-tab-queue"]',
              title: "Approval Queue Tab",
              body: "Every event suggested by the AI Discovery sweep lands here first — nothing hits the public calendar without your review. The pill on the right shows the pending count so you always know when there's work waiting.",
              before: () => setActiveTab("calendar"),
            },
            {
              selector: '[data-tutorial="cal-viewmode"]',
              title: "Month / Week / Day Views",
              body: "Month gives the bird's-eye plan. Week shows a 7-day timeline with hour blocks — perfect for staffing density. Day is a minute-by-minute schedule for the most operational view. Click an empty hour block in Week or Day to create an event pre-filled with that start time.",
            },
            {
              selector: '[data-tutorial="cal-sync"]',
              title: "Sync to External Calendars",
              body: "Pushes a live iCal feed to Google Calendar, Apple Calendar, Outlook, or any app that reads .ics. Subscribers re-pull every few hours automatically — no manual exports, no stale data.",
            },
            {
              selector: '[data-tutorial="cal-manage-links"]',
              title: "Manage Share Links",
              body: "Generate scoped, no-login share links for partners, vendors, or field staff. Choose read-only or editor permissions, lock to a department, and revoke any link instantly from this panel.",
            },
            {
              selector: '[data-tutorial="cal-discover"]',
              title: "Discover Events (AI Sweep)",
              body: "Runs a Miami-area AI search for upcoming concerts, festivals, sports, conferences, nightlife, and high-profile gatherings. It executes automatically every day at 12:00 PM (noon) and drops findings into the Approval Queue. Click here any time to trigger an extra on-demand sweep — useful before a big weekend.",
            },
            {
              selector: '[data-tutorial="cal-add-event"]',
              title: "Add Event Manually",
              body: "Opens the full event composer for anything you want to schedule by hand. We're about to open it together so you can see every field that drives staffing, color, and notifications.",
            },
            {
              selector: '[data-tutorial="cal-notifications"]',
              title: "Notifications Bell",
              body: "Real-time alerts for: staff assigned to a shift, staff confirming or declining a shift, and @mentions inside event note threads. Click to mark all read.",
            },

            // ── Grid + nav
            {
              selector: '[data-tutorial="cal-month-nav"]',
              title: "Month Navigation",
              body: "Step backward or forward one month at a time, or hit Today to jump straight back to the current week — useful after browsing far ahead for planning.",
            },
            {
              selector: '[data-tutorial="cal-grid"]',
              title: "The Calendar Grid",
              body: "Each cell is a day. Today is marked with a red ring. Click any empty space in a day to open the New Event dialog pre-filled with that date. Click an existing event chip to open its full detail sheet — staff, notes, docs, and chat history.",
            },

            // ── Walk through Add Event dialog
            {
              selector: '[data-tutorial="cal-add-dialog"]',
              title: "Step 1 — The New Event Dialog",
              body: "We just opened the event composer for you. Everything below is optional except Title and Date — but the more you fill in, the smarter staffing, color coding, and notifications become.",
              before: () => { setActiveTab("calendar"); openAddDialog(todayStr); },
              delay: 550,
            },
            {
              selector: '[data-tutorial="cal-form-title"]',
              title: "Title (required)",
              body: "Short, scannable name. This is what shows up on the calendar chip and in every notification — keep it under ~40 characters so it doesn't truncate. Example: 'Ultra Music Festival — Day 1'.",
            },
            {
              selector: '[data-tutorial="cal-form-description"]',
              title: "Description",
              body: "The 'why' and 'what' of the event. Sent to assigned staff in their notification email so they have context before showing up. Include client name, vibe, dress code, attendees count — anything that helps the team prepare.",
            },
            {
              selector: '[data-tutorial="cal-form-datetime"]',
              title: "Date & Start Time",
              body: "Date is required. Start Time is optional but recommended — events without a time render as all-day chips. Time should be in the operator's local timezone (Eastern for Miami ops).",
            },
            {
              selector: '[data-tutorial="cal-form-endloc"]',
              title: "End Time & Location",
              body: "End Time powers the Week/Day view block height and lets staffing know the shift duration. Location is plain text (e.g. 'LIV Nightclub, Fontainebleau') — used in driver dispatch and pasted into staff confirmation messages.",
            },
            {
              selector: '[data-tutorial="cal-form-tags"]',
              title: "Event Service Tags",
              body: "This is the heart of the system. Pick which services the event needs: Security, Drivers, Photographer, Videographer, Brand Ambassadors, Management, etc. Roles that need a count (like Drivers x4) show a quantity field. Tags drive auto-color, the staffing module, and downstream invoicing.",
            },
            {
              selector: '[data-tutorial="cal-form-deptcolor"]',
              title: "Department & Auto Color",
              body: "Department scopes the event to Ops, Marketing, Support, Admin, or Development — which controls who sees it and which share links pick it up. Color is auto-derived: Security = red, Drivers = blue, Photo/Video = purple, Brand Ambassadors = yellow, Management = green. You don't pick it — the tags do.",
            },
            {
              selector: '[data-tutorial="cal-form-links"]',
              title: "Links",
              body: "Add multiple URLs — venue website, ticket page, Google Maps drop-off pin, client briefing doc, etc. Each link gets its own row so you can label and remove cleanly. Links surface in the event detail sheet and in staff notifications.",
            },
            {
              selector: '[data-tutorial="cal-form-docs"]',
              title: "Documents",
              body: "Upload PDFs, contracts, run-of-show sheets, floor plans, riders, photos — anything the team needs in the field. Files store in Lovable Cloud and surface as one-click downloads on the event detail. Multiple files supported.",
            },
            {
              selector: '[data-tutorial="cal-form-notes"]',
              title: "Internal Notes",
              body: "Free-form scratch pad for the planner. Unlike Description (which staff see), Notes are an internal one-liner reference — call sheets, gotchas, special requests. After the event is saved, a full threaded note system with @mentions opens up at the bottom of the dialog.",
            },
            {
              selector: '[data-tutorial="cal-form-save"]',
              title: "Create / Update",
              body: "Saves the event and immediately fires staffing notifications (email + SMS) to anyone tagged in. The event appears on the grid, in the Week/Day timelines, in the Upcoming list, and in every active iCal subscription within the next sync cycle.",
            },

            // ── Approval Queue tour
            {
              selector: '[data-tutorial="cal-queue-panel"]',
              title: "Approval Queue — Overview",
              body: "Now we're inside the Approval Queue. Every AI-discovered event lives here until you act on it. Nothing here is on the public calendar yet.",
              before: () => { setShowAddDialog(false); resetForm(); setActiveTab("queue"); },
              delay: 500,
            },
            {
              selector: '[data-tutorial="cal-queue-header"]',
              title: "Pending Count",
              body: "Live count of events waiting for review. The same number appears as a red dot on the Approval Queue tab so you know when work has piled up — even from another department.",
            },
            {
              selector: '[data-tutorial="cal-queue-refresh"]',
              title: "Refresh",
              body: "Re-pulls the queue from the database. The daily AI sweep at 12:00 PM populates this automatically, but if you triggered Discover Events manually, hit Refresh to see new results immediately.",
            },
            {
              selector: '[data-tutorial="cal-queue-card"]',
              title: "Event Card",
              body: "Each card shows the AI's findings: name, date, time, venue, expected attendance, event type (Concert / Festival / Sports / Nightlife / Conference / Art / City / Party / Corporate), and a description. The colored type pill helps you triage at a glance.",
            },
            {
              selector: '[data-tutorial="cal-queue-actions"]',
              title: "Review · Approve · Decline",
              body: "👁 Review opens the full detail sheet (organizer, contact email/phone/website, source URL, full description). ✓ Approve adds the event straight to the calendar with green styling. ✗ Decline asks for a reason — this feedback trains the AI so future sweeps surface better matches.",
            },
          ]}
        />
      )}
    </div>
  );
};

export default EventCalendar;
