import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Eye,
  Edit3,
  Loader2,
  Sparkles,
  MapPin,
  Users,
  ExternalLink,
} from "lucide-react";

interface SharedEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  department: string;
  links: string[];
  docs: string[];
  notes: string | null;
  color: string;
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
  organizer_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
}

interface LinkInfo {
  recipient_name: string;
  permission: "view" | "edit";
  department: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SharedCalendar = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<DiscoveredEvent[]>([]);
  const [view, setView] = useState<"calendar" | "approval">("calendar");
  const [reviewEvent, setReviewEvent] = useState<DiscoveredEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<SharedEvent | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SharedEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-share?token=${token}`;

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setLinkInfo(json.link);
      setEvents(json.events || []);
      setPendingEvents(json.pendingEvents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEvents();
  }, [token]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--)
      days.push({ date: prevDays - i, month: month - 1, year, isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: i, month, year, isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++)
      days.push({ date: i, month: month + 1, year, isCurrentMonth: false });
    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, SharedEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  const canEdit = linkInfo?.permission === "edit";

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormTime("");
    setFormNotes("");
    setEditingEvent(null);
  };

  const openAdd = (date?: string) => {
    resetForm();
    if (date) setFormDate(date);
    setShowAddDialog(true);
  };

  const openEdit = (ev: SharedEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormDescription(ev.description || "");
    setFormDate(ev.event_date);
    setFormTime(ev.event_time || "");
    setFormNotes(ev.notes || "");
    setDetailEvent(null);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) {
      toast({ title: "Title and date required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const method = editingEvent ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        event_date: formDate,
        event_time: formTime || null,
        notes: formNotes.trim() || null,
      };
      if (editingEvent) body.id = editingEvent.id;
      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast({ title: editingEvent ? "Event updated" : "Event added" });
      setShowAddDialog(false);
      resetForm();
      fetchEvents();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !linkInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Calendar unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {error || "This share link is invalid or has been disabled."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold">Forti Events Calendar</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              Shared with <span className="text-foreground">{linkInfo.recipient_name}</span> ·
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                  canEdit ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {canEdit ? <Edit3 className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                {canEdit ? "Edit access" : "View only"}
              </span>
            </p>
          </div>
          {canEdit && view === "calendar" && (
            <Button variant="forti" size="sm" onClick={() => openAdd()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Event
            </Button>
          )}
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === "calendar"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 inline mr-1" /> Calendar
          </button>
          <button
            onClick={() => setView("approval")}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              view === "approval"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Approval Queue
            {pendingEvents.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingEvents.length}
              </span>
            )}
          </button>
        </div>

        {view === "approval" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <h3 className="font-semibold text-sm">AI-Discovered Events</h3>
              <span className="text-[10px] text-muted-foreground">
                Read-only view — only admins can approve or decline
              </span>
            </div>
            {pendingEvents.length === 0 ? (
              <div className="text-center py-12 rounded-lg border border-border bg-card">
                <p className="text-sm text-muted-foreground">No pending events.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border bg-card p-4 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setReviewEvent(ev)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{ev.event_name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(ev.event_date + "T12:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {ev.event_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ev.event_time}
                            </span>
                          )}
                          {ev.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.venue}
                            </span>
                          )}
                          {ev.expected_attendance && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {ev.expected_attendance}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>

        {/* Month nav */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
            <Button variant="fortiGhost" size="sm" className="text-[10px] h-6" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-7">
            {DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dateStr = `${day.year}-${String(day.month + 1).padStart(2, "0")}-${String(day.date).padStart(2, "0")}`;
              const dayEvents = day.isCurrentMonth ? eventsByDate[dateStr] || [] : [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-1 border-b border-r border-border cursor-pointer transition-colors hover:bg-muted/30 ${
                    !day.isCurrentMonth ? "opacity-30" : ""
                  } ${isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                  onClick={() => day.isCurrentMonth && setSelectedDate(isSelected ? null : dateStr)}
                  onDoubleClick={() => canEdit && day.isCurrentMonth && openAdd(dateStr)}
                >
                  <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}>
                    {day.date}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 border-l-2 border-primary/60 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailEvent(ev);
                        }}
                        title={ev.title}
                      >
                        {ev.event_time && (
                          <span className="text-muted-foreground mr-0.5">{ev.event_time.slice(0, 5)}</span>
                        )}
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day */}
        {selectedDate && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h4>
              {canEdit && (
                <Button variant="fortiGhost" size="sm" onClick={() => openAdd(selectedDate)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>
            {selectedDateEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-primary/40 bg-primary/10 p-3 cursor-pointer hover:opacity-80"
                    onClick={() => setDetailEvent(ev)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{ev.title}</span>
                      {ev.event_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ev.event_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
        <DialogContent className="max-w-lg">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{detailEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(detailEvent.event_date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  {detailEvent.event_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {detailEvent.event_time.slice(0, 5)}
                    </span>
                  )}
                </div>
                {detailEvent.description && (
                  <p className="text-sm whitespace-pre-wrap">{detailEvent.description}</p>
                )}
                {detailEvent.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{detailEvent.notes}</p>
                  </div>
                )}
                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="fortiGhost" size="sm" onClick={() => openEdit(detailEvent)}>
                      <Edit3 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Discovered event read-only review dialog */}
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Date</span>
                    {new Date(reviewEvent.event_date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {reviewEvent.event_time && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Time</span>
                      {reviewEvent.event_time}
                    </div>
                  )}
                  {reviewEvent.venue && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Venue</span>
                      {reviewEvent.venue}
                    </div>
                  )}
                  {reviewEvent.location && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Location</span>
                      {reviewEvent.location}
                    </div>
                  )}
                  {reviewEvent.expected_attendance && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block">Expected Attendance</span>
                      {reviewEvent.expected_attendance}
                    </div>
                  )}
                </div>
                {reviewEvent.description && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Description</span>
                    <p className="text-sm whitespace-pre-wrap">{reviewEvent.description}</p>
                  </div>
                )}
                {(reviewEvent.organizer_name ||
                  reviewEvent.contact_email ||
                  reviewEvent.contact_phone ||
                  reviewEvent.contact_website) && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                    <span className="text-xs text-muted-foreground block font-semibold uppercase tracking-wide">
                      Contact Info
                    </span>
                    {reviewEvent.organizer_name && (
                      <div className="text-sm">👤 {reviewEvent.organizer_name}</div>
                    )}
                    {reviewEvent.contact_email && (
                      <div className="text-sm">
                        ✉️{" "}
                        <a
                          href={`mailto:${reviewEvent.contact_email}`}
                          className="text-primary hover:underline"
                        >
                          {reviewEvent.contact_email}
                        </a>
                      </div>
                    )}
                    {reviewEvent.contact_phone && (
                      <div className="text-sm">
                        📞{" "}
                        <a
                          href={`tel:${reviewEvent.contact_phone}`}
                          className="text-primary hover:underline"
                        >
                          {reviewEvent.contact_phone}
                        </a>
                      </div>
                    )}
                    {reviewEvent.contact_website && (
                      <div className="text-sm">
                        🌐{" "}
                        <a
                          href={reviewEvent.contact_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {reviewEvent.contact_website}
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {reviewEvent.source_info && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Source</span>
                    <p className="text-sm">{reviewEvent.source_info}</p>
                  </div>
                )}
                {reviewEvent.source_url && (
                  <a
                    href={reviewEvent.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View Source
                  </a>
                )}
                <div className="text-[11px] text-muted-foreground italic pt-2 border-t border-border">
                  This is a view-only preview. Only admins can approve or decline events.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      {canEdit && (
        <Dialog
          open={showAddDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date *</label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Time</label>
                  <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="fortiGhost"
                  size="sm"
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="forti"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim() || !formDate}
                >
                  {saving ? "Saving…" : editingEvent ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SharedCalendar;
